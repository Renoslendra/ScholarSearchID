"""Flask entry point for ScholarSearchID.

Serves both HTML templates and JSON API endpoints for the IR system.
"""

from __future__ import annotations

import os
import re
import secrets
import time
import uuid
import hashlib
import json
import gzip
from io import BytesIO
from typing import Any
from functools import lru_cache

from dotenv import load_dotenv
load_dotenv()  # Load .env file

from flask import Flask, jsonify, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import config
import database
from answer_engine.generator import generate_answer
from core import (
    InvertedIndex,
    load_or_build_index,
    rank_bm25,
    rank_tfidf,
    get_tfidf_weights,
    rank_language_model,
    rank_l2r,
    rank_semantic,
    rerank_neural,
    suggest_query,
    expand_query,
    evaluate_ranking,
    compute_pagerank,
    tokenize_query,
)

app = Flask(__name__)
# SECRET_KEY: Gunakan dari .env. Jika tidak ada, generate random key yang aman.
app.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") == "production"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # Batas maksimal ukuran file (5MB) agar terhindar dari DoS/Storage full
_is_production = os.environ.get("FLASK_ENV") == "production" or os.path.exists("/home")
app.config["TEMPLATES_AUTO_RELOAD"] = not _is_production  # Auto-reload hanya di development


# ── Security Headers (Gabungan, tanpa duplikat) ──────────────
@app.after_request
def apply_security_headers(response):
    """HTTP Security Headers untuk mencegah XSS, Clickjacking, MIME-sniffing."""
    response.headers["X-Content-Type-Options"] = "nosniff"                       # Cegah MIME-sniffing
    response.headers["X-Frame-Options"] = "SAMEORIGIN"                           # Cegah Clickjacking
    response.headers["X-XSS-Protection"] = "1; mode=block"                       # XSS filter di browser
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"  # Force HTTPS
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"      # Batasi info referrer
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"   # Blokir akses hardware
    # Content Security Policy — izinkan self, inline styles/scripts, HTTPS resources, dan data URI (untuk gambar)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https:; "
        "frame-ancestors 'self';"
    )
    # Cache static files (CSS, JS, images) agar browser tidak request ulang
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=604800"  # 1 minggu (file pakai ?v= cache buster)

    # Gzip compression untuk hemat bandwidth
    if (
        "gzip" in request.headers.get("Accept-Encoding", "")
        and response.content_type
        and any(ct in response.content_type for ct in ["text/", "application/json", "application/javascript"])
        and response.content_length
        and response.content_length > 500
    ):
        try:
            buf = BytesIO()
            with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
                gz.write(response.get_data())
            response.set_data(buf.getvalue())
            response.headers["Content-Encoding"] = "gzip"
            response.headers["Content-Length"] = len(response.get_data())
        except Exception:
            pass  # Fallback ke uncompressed
    return response


# Anti-DDoS / Rate Limiting (Membatasi request berlebihan dari satu IP)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://"
)


# ── CSRF Protection ──────────────────────────────────────────
@app.before_request
def csrf_protect():
    """Validasi CSRF token pada setiap request POST/PUT/DELETE."""
    if request.method in ("POST", "PUT", "DELETE"):
        # Lewati pengecekan untuk API JSON (karena menggunakan fetch + SameSite cookie)
        content_type = request.content_type or ""
        if "application/json" in content_type or "multipart/form-data" in content_type:
            return  # API requests dilindungi oleh SameSite cookie
        # Untuk form HTML biasa, cek CSRF token
        token = session.get("csrf_token")
        form_token = request.form.get("csrf_token")
        if not token or token != form_token:
            return jsonify({"error": "CSRF token invalid"}), 403


def generate_csrf_token():
    """Generate CSRF token dan simpan di session."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


# Inject csrf_token ke semua template secara otomatis
app.jinja_env.globals["csrf_token"] = generate_csrf_token

@app.context_processor
def inject_user():
    """Inject the current logged-in user into all templates."""
    user = None
    if "user_id" in session:
        user = database.get_user_by_id(session["user_id"])
    return dict(user=user)

# ── Lazy-loaded global state ─────────────────────────────────

_index: InvertedIndex | None = None
_papers: list[dict[str, Any]] = []
_papers_by_id: dict[int, dict[str, Any]] = {}
_pagerank: dict[int, float] = {}
_autocomplete_entries: list[tuple[str, str]] = []
_autocomplete_prefix: dict[str, list[str]] = {}
_autocomplete_cache: dict[str, list[str]] = {}

# -- Server-side Search Cache (mengurangi CPU load saat banyak user) --
_search_cache: dict[str, tuple[float, Any]] = {}  # key -> (timestamp, result)
SEARCH_CACHE_TTL = 600    # 10 menit -- lebih pendek supaya RAM tidak penuh
SEARCH_CACHE_MAX = 100    # Maksimal 100 query di cache (hemat RAM)
_last_cache_cleanup = 0.0  # timestamp last cleanup
AUTOCOMPLETE_DEFAULT_LIMIT = 8
AUTOCOMPLETE_MAX_LIMIT = 12
AUTOCOMPLETE_PREFIX_MIN = 2
AUTOCOMPLETE_PREFIX_MAX = 32
AUTOCOMPLETE_PREFIX_BUCKET_MAX = 96


def _get_cached_search(cache_key: str):
    """Return cached search result if still valid, else None."""
    if cache_key in _search_cache:
        ts, result = _search_cache[cache_key]
        if time.time() - ts < SEARCH_CACHE_TTL:
            return result
        del _search_cache[cache_key]  # Expired
    return None


def _set_cached_search(cache_key: str, result: Any):
    """Store search result in cache. Evict oldest if full."""
    # Evict oldest entries if cache is full
    if len(_search_cache) >= SEARCH_CACHE_MAX:
        oldest_key = min(_search_cache, key=lambda k: _search_cache[k][0])
        del _search_cache[oldest_key]
    _search_cache[cache_key] = (time.time(), result)


def _cleanup_expired_caches():
    """Remove expired cache entries to free RAM. Called periodically."""
    global _last_cache_cleanup
    now = time.time()
    if now - _last_cache_cleanup < 300:  # Cleanup max setiap 5 menit
        return
    _last_cache_cleanup = now
    expired = [k for k, (ts, _) in _search_cache.items() if now - ts > SEARCH_CACHE_TTL]
    for k in expired:
        del _search_cache[k]
    # Juga bersihkan autocomplete cache jika terlalu besar
    if len(_autocomplete_cache) > 200:
        _autocomplete_cache.clear()


def _ensure_papers_loaded() -> list[dict[str, Any]]:
    """Load paper metadata without forcing the heavier retrieval index."""
    global _papers, _papers_by_id
    if not _papers:
        _papers = database.get_all_papers()
        _papers_by_id = {p["id"]: p for p in _papers if "id" in p}
    return _papers


def _ensure_loaded() -> InvertedIndex:
    """Load index + paper data once, then cache."""
    global _index, _papers, _papers_by_id, _pagerank
    if _index is not None and _index.doc_count > 0:
        return _index
    _index = load_or_build_index()
    _ensure_papers_loaded()
    # Compute PageRank from citations (if any)
    edges = database.get_citation_edges()
    if edges:
        _pagerank = compute_pagerank(edges)
    return _index


def _normalize_autocomplete_text(text: str) -> str:
    return " ".join(str(text or "").casefold().split())


def _autocomplete_words(text: str) -> list[str]:
    return re.findall(r"[^\W_]+", text, flags=re.UNICODE)


def _ensure_autocomplete_ready() -> None:
    """Build a lightweight in-memory title index for instant autocomplete."""
    global _autocomplete_entries, _autocomplete_prefix
    if _autocomplete_entries:
        return

    entries: list[tuple[str, str]] = []
    prefix_index: dict[str, list[str]] = {}
    for paper in _ensure_papers_loaded():
        title = str(paper.get("title", "")).strip()
        if not title:
            continue

        normalized = _normalize_autocomplete_text(title)
        entries.append((normalized, title))

        seen_prefixes: set[str] = set()
        for word in _autocomplete_words(normalized):
            max_size = min(len(word), AUTOCOMPLETE_PREFIX_MAX)
            for size in range(AUTOCOMPLETE_PREFIX_MIN, max_size + 1):
                prefix = word[:size]
                if prefix in seen_prefixes:
                    continue
                seen_prefixes.add(prefix)
                bucket = prefix_index.setdefault(prefix, [])
                if len(bucket) < AUTOCOMPLETE_PREFIX_BUCKET_MAX:
                    bucket.append(title)

    _autocomplete_entries = entries
    _autocomplete_prefix = prefix_index


def _autocomplete_lookup(query: str, limit: int = AUTOCOMPLETE_DEFAULT_LIMIT) -> list[str]:
    _ensure_autocomplete_ready()
    q = _normalize_autocomplete_text(query)
    if len(q) < AUTOCOMPLETE_PREFIX_MIN:
        return []

    limit = max(1, min(limit, AUTOCOMPLETE_MAX_LIMIT))
    cache_key = f"{q}|{limit}"
    if cache_key in _autocomplete_cache:
        return _autocomplete_cache[cache_key]

    matches: list[str] = []
    seen: set[str] = set()

    def add(title: str) -> bool:
        if title in seen:
            return len(matches) >= limit
        seen.add(title)
        matches.append(title)
        return len(matches) >= limit

    if " " not in q:
        for title in _autocomplete_prefix.get(q, []):
            if add(title):
                break

    if len(matches) < limit:
        terms = q.split()
        for normalized_title, title in _autocomplete_entries:
            if title in seen:
                continue
            if all(term in normalized_title for term in terms) and add(title):
                break

    if len(_autocomplete_cache) > 500:
        _autocomplete_cache.clear()
    _autocomplete_cache[cache_key] = matches
    return matches


# ── Helper: run a ranking model ──────────────────────────────

def _run_model(
    model: str,
    tokens: list[str],
    index: InvertedIndex,
    top_k: int,
) -> list[tuple[int, float]]:
    if model == "tfidf":
        return rank_tfidf(tokens, index, top_k=top_k)
    if model == "lm":
        return rank_language_model(tokens, index, top_k=top_k)
    if model == "semantic":
        return rank_semantic(tokens, index, _papers, top_k=top_k)
    if model == "l2r":
        return rank_l2r(tokens, index, _papers, _pagerank, top_k=top_k)
    # default = bm25
    return rank_bm25(tokens, index, top_k=top_k)


def _enrich_results(
    ranked: list[tuple[int, float]],
    query_tokens: list[str],
    index: InvertedIndex,
    model: str,
) -> list[dict[str, Any]]:
    """Turn (doc_id, score) pairs into rich result dicts for the API."""
    results: list[dict[str, Any]] = []
    for doc_id, score in ranked:
        paper = _papers_by_id.get(doc_id)
        if not paper:
            continue
        r: dict[str, Any] = {
            "id": doc_id,
            "title": paper.get("title", ""),
            "abstract": paper.get("abstract", ""),
            "authors": paper.get("authors", []),
            "year": paper.get("year"),
            "journal": paper.get("journal", ""),
            "publisher": paper.get("publisher", ""),
            "doi": paper.get("doi", ""),
            "url": paper.get("url", ""),
            "score": round(score, 4),
            "model": model,
        }
        # Add TF-IDF weights for UI display
        r["tfidf_weights"] = get_tfidf_weights(doc_id, query_tokens, index)
        # PageRank
        r["pagerank"] = round(_pagerank.get(doc_id, 0.0), 6)
        results.append(r)
    return results


# ═════════════════════════════════════════════════════════════
# HTML TEMPLATE ROUTES (unchanged URLs — UI stays intact)
# ═════════════════════════════════════════════════════════════

@app.route("/")
def index():
    _ensure_autocomplete_ready()
    return render_template("index.html")


@app.route("/search")
def search():
    return render_template("search.html")


@app.route("/citation")
def citation():
    return render_template("citation.html")


@app.route("/lab")
def lab():
    return render_template("lab.html")


@app.route("/library")
def library():
    if "user_id" not in session:
        return redirect(url_for("signin"))
    return render_template("library.html")


@app.route("/signin")
def signin():
    return render_template("about.html")


@app.route("/profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("signin"))
    return render_template("profile.html")


@app.route("/profile/edit")
def profile_edit():
    if "user_id" not in session:
        return redirect(url_for("signin"))
    return render_template("profile_edit.html")


@app.route("/register")
def register():
    return render_template("register.html")


# ═════════════════════════════════════════════════════════════
# JSON API ENDPOINTS
# ═════════════════════════════════════════════════════════════

@app.get("/health")
def health_check():
    """Health check + warm-up + cache cleanup.
    Dipanggil oleh UptimeRobot tiap 5 menit agar server tidak pernah idle/mati.
    Juga membersihkan cache expired untuk mencegah memory leak.
    """
    try:
        # Bersihkan cache expired setiap health check
        _cleanup_expired_caches()

        idx = _ensure_loaded()

        # Hitung estimasi memory usage
        cache_entries = len(_search_cache)
        autocomplete_entries = len(_autocomplete_cache)

        return {
            "status": "ok",
            "docs": idx.doc_count,
            "papers": len(_papers),
            "pagerank_nodes": len(_pagerank),
            "cache_entries": cache_entries,
            "autocomplete_cached": autocomplete_entries,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}, 500


@app.post("/api/register")
def api_register():
    data = request.get_json(silent=True) or {}
    firstname = data.get("firstname", "").strip()
    lastname = data.get("lastname", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not firstname or not lastname or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    hashed_pw = generate_password_hash(password)
    user_id = database.create_user(firstname, lastname, email, hashed_pw)

    if not user_id:
        return jsonify({"error": "Email already exists"}), 409

    session["user_id"] = user_id
    return jsonify({"status": "success", "user_id": user_id})


@app.post("/api/login")
def api_login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    user = database.get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    return jsonify({"status": "success", "user_id": user["id"]})


@app.route("/api/logout", methods=["GET", "POST"])
def api_logout():
    session.pop("user_id", None)
    return redirect(url_for("index"))


@app.post("/api/profile/edit")
def api_profile_edit():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    firstname = data.get("firstname", "").strip()
    lastname = data.get("lastname", "").strip()
    gender = data.get("gender", "").strip()
    country = data.get("country", "").strip()
    role = data.get("role", "").strip()
    about = data.get("about", "").strip()

    if not firstname or not lastname:
        return jsonify({"error": "First Name and Last Name are required"}), 400

    success = database.update_user_profile(
        session["user_id"],
        firstname,
        lastname,
        gender,
        country,
        role,
        about
    )

    if success:
        return jsonify({"status": "success"})
    return jsonify({"error": "Database error"}), 500


@app.post("/api/profile/password")
def api_profile_password():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not old_password or not new_password:
        return jsonify({"error": "Missing fields"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password baru minimal 6 karakter"}), 400

    user = database.get_user_by_id(session["user_id"])
    if not user or not check_password_hash(user["password_hash"], old_password):
        return jsonify({"error": "Password lama salah"}), 401

    new_hash = generate_password_hash(new_password)
    success = database.update_user_password(session["user_id"], new_hash)
    if success:
        return jsonify({"status": "success"})
    return jsonify({"error": "Database error"}), 500


@app.post("/api/profile/photo")
def api_profile_photo():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if "photo" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["photo"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Validate file type dan MIME Type asli dari browser
    allowed = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed:
        return jsonify({"error": "File type not allowed"}), 400
        
    if not file.mimetype.startswith("image/"):
        return jsonify({"error": "Invalid content type. Only images are allowed."}), 400

    # Save with unique filename
    filename = f"avatar_{session['user_id']}_{uuid.uuid4().hex[:8]}{ext}"
    upload_dir = os.path.join("static", "uploads", "avatars")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)

    # Store URL path in database
    photo_url = f"/static/uploads/avatars/{filename}"
    database.update_user_photo(session["user_id"], photo_url)

    return jsonify({"status": "success", "photo_url": photo_url})


@app.post("/api/profile/delete_photo")
def api_profile_delete_photo():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    if database.remove_user_photo(session["user_id"]):
        return jsonify({"status": "success"})
    return jsonify({"error": "Failed to remove photo"}), 500


@app.post("/api/profile/delete_account")
def api_profile_delete_account():
    """Hapus akun secara permanen setelah verifikasi password."""
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    password = data.get("password", "")

    if not password:
        return jsonify({"error": "Password harus diisi untuk konfirmasi."}), 400

    # Verifikasi password
    user = database.get_user_by_id(session["user_id"])
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Password salah. Akun tidak dihapus."}), 403

    # Hapus akun dari database
    success = database.delete_user(session["user_id"])
    if success:
        session.clear()
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Gagal menghapus akun."}), 500


# ── Library API ───────────────────────────────────────────────

@app.post("/api/library/save")
def api_library_save():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    paper_id = data.get("paper_id")
    if not paper_id:
        return jsonify({"error": "Missing paper_id"}), 400
    database.save_paper(session["user_id"], paper_id)
    return jsonify({"status": "saved"})


@app.post("/api/library/unsave")
def api_library_unsave():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    paper_id = data.get("paper_id")
    if not paper_id:
        return jsonify({"error": "Missing paper_id"}), 400
    database.unsave_paper(session["user_id"], paper_id)
    return jsonify({"status": "unsaved"})


@app.get("/api/library")
def api_library_list():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    papers = database.get_saved_papers(session["user_id"])
    return jsonify({"papers": papers, "total": len(papers)})


@app.get("/api/library/ids")
def api_library_ids():
    """Return set of saved paper IDs for the current user (for UI toggling)."""
    if "user_id" not in session:
        return jsonify({"ids": []})
    ids = list(database.get_saved_paper_ids(session["user_id"]))
    return jsonify({"ids": ids})


@app.get("/api/stats")
def api_stats():
    """Return corpus statistics for the homepage."""
    stats = database.get_stats()
    return jsonify(stats)


@app.get("/api/search")
def api_search():
    """Main search endpoint — powers the Search page. Includes server-side cache."""
    idx = _ensure_loaded()

    # Build cache key dari semua parameter
    q = request.args.get("q", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", config.DEFAULT_PAGE_SIZE, type=int)
    per_page = min(per_page, config.MAX_PAGE_SIZE)
    model = request.args.get("model", "bm25")
    k1 = request.args.get("k1", config.BM25_K1, type=float)
    b = request.args.get("b", config.BM25_B, type=float)

    cache_key = hashlib.md5(f"{q}|{model}|{page}|{per_page}|{k1}|{b}".encode()).hexdigest()

    # Cek cache server-side
    cached = _get_cached_search(cache_key)
    if cached is not None:
        return jsonify(cached)

    t0 = time.perf_counter()

    # Parameter sudah diambil di atas (sebelum cache check)

    if not q:
        return jsonify({"query": "", "results": [], "total": 0, "page": 1})

    tokens = tokenize_query(q)

    # Spelling suggestion
    suggestion = suggest_query(tokens, idx)

    # Query expansion
    expanded = expand_query(tokens, idx)
    expanded_str = " ".join(expanded) if expanded != tokens else None

    # Run retrieval model — get a big result set, then paginate
    total_k = per_page * 10  # over-fetch for pagination
    if model == "bm25":
        ranked = rank_bm25(tokens, idx, k1=k1, b=b, top_k=total_k)
    else:
        ranked = _run_model(model, tokens, idx, top_k=total_k)

    total = len(ranked)

    # Paginate
    start = (page - 1) * per_page
    page_ranked = ranked[start : start + per_page]
    results = _enrich_results(page_ranked, tokens, idx, model)

    elapsed = round((time.perf_counter() - t0) * 1000, 1)

    response_data = {
        "query": q,
        "results": results,
        "total": total,
        "page": page,
        "per_page": per_page,
        "time_ms": elapsed,
        "model_used": model,
        "suggestion": suggestion,
        "expanded_query": expanded_str,
    }
    # Simpan ke server cache
    _set_cached_search(cache_key, response_data)
    return jsonify(response_data)


@app.get("/api/answer")
def api_answer():
    """Answer Engine endpoint — powers the Answer / Citation page."""
    idx = _ensure_loaded()

    q = request.args.get("q", "").strip()
    lang = request.args.get("lang", "id").strip()
    if not q:
        return jsonify({"question": "", "answer": "", "citations": []})

    tokens = tokenize_query(q)
    ranked = rank_bm25(tokens, idx, top_k=10)

    contexts: list[dict[str, Any]] = []
    for doc_id, _ in ranked:
        paper = _papers_by_id.get(doc_id)
        if paper:
            contexts.append(paper)

    result = generate_answer(q, contexts, lang=lang)
    return jsonify({
        "question": q,
        **result,
    })


@app.post("/api/answer/save")
def api_save_answer():
    """Save an AI answer to user's library."""
    if "user_id" not in session:
        return jsonify({"error": "Login required"}), 401
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()
    answer = data.get("answer", "").strip()
    source = data.get("source", "llm")
    citations = data.get("citations", [])
    if not question or not answer:
        return jsonify({"error": "Missing question or answer"}), 400
    row_id = database.save_answer(session["user_id"], question, answer, source, citations)
    if row_id:
        return jsonify({"status": "saved", "id": row_id})
    return jsonify({"error": "Failed to save"}), 500


@app.post("/api/answer/unsave")
def api_unsave_answer():
    """Remove a saved answer from user's library."""
    if "user_id" not in session:
        return jsonify({"error": "Login required"}), 401
    data = request.get_json(silent=True) or {}
    answer_id = data.get("id")
    if not answer_id:
        return jsonify({"error": "Missing answer id"}), 400
    database.unsave_answer(session["user_id"], answer_id)
    return jsonify({"status": "removed"})


@app.get("/api/answer/saved")
def api_saved_answers():
    """Get all saved answers for current user."""
    if "user_id" not in session:
        return jsonify({"error": "Login required"}), 401
    answers = database.get_saved_answers(session["user_id"])
    return jsonify({"answers": answers})


@app.get("/api/answer/is-saved")
def api_is_answer_saved():
    """Check if an answer is saved for a question."""
    if "user_id" not in session:
        return jsonify({"saved": False})
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"saved": False})
    saved = database.is_answer_saved(session["user_id"], q)
    return jsonify({"saved": saved})


@app.get("/api/lab/compare")
def api_lab_compare():
    """Lab Mode — compare multiple retrieval models."""
    idx = _ensure_loaded()

    q = request.args.get("q", "").strip()
    models = request.args.get("models", "bm25,tfidf,lm,semantic,l2r").split(",")
    top_k = request.args.get("top_k", 10, type=int)
    k1 = request.args.get("k1", config.BM25_K1, type=float)
    b = request.args.get("b", config.BM25_B, type=float)

    if not q:
        return jsonify({"query": "", "models": {}})

    tokens = tokenize_query(q)
    # Get judgments for metrics — if none in DB, auto-generate from token overlap
    judgments = database.get_judgments(q)

    if not judgments:
        # Auto-generate pseudo-relevance judgments using BM25 scores as proxy
        proxy_ranked = rank_bm25(tokens, idx, top_k=30)
        if proxy_ranked:
            max_score = proxy_ranked[0][1] if proxy_ranked[0][1] > 0 else 1.0
            for doc_id, score in proxy_ranked:
                norm = score / max_score
                if norm >= 0.6:
                    judgments[doc_id] = 2  # highly relevant
                elif norm >= 0.3:
                    judgments[doc_id] = 1  # somewhat relevant
                else:
                    judgments[doc_id] = 0  # not relevant

    comparison: dict[str, Any] = {}
    for model in models:
        model = model.strip()
        if model == "bm25":
            ranked = rank_bm25(tokens, idx, k1=k1, b=b, top_k=top_k)
        else:
            ranked = _run_model(model, tokens, idx, top_k=top_k)

        results = _enrich_results(ranked, tokens, idx, model)
        doc_ids = [d for d, _ in ranked]
        metrics = evaluate_ranking(doc_ids, judgments, k=top_k) if judgments else {}
        comparison[model] = {"results": results, "metrics": metrics}

    return jsonify({"query": q, "models": comparison})


@app.get("/api/paper/<int:paper_id>")
def api_paper_detail(paper_id: int):
    """Get a single paper's full details."""
    paper = database.get_paper(paper_id)
    if not paper:
        return jsonify({"error": "Not found"}), 404
    return jsonify(paper)



@app.post("/api/feedback")
def api_feedback():
    """Save user relevance feedback (👍/👎)."""
    data = request.get_json(silent=True) or {}
    q = data.get("query", "")
    paper_id = data.get("paper_id", 0)
    relevance = data.get("relevance", 0)
    if q and paper_id:
        database.save_judgment(q, paper_id, relevance)
        return jsonify({"status": "saved"})
    return jsonify({"error": "Missing fields"}), 400


@app.get("/api/autocomplete")
def api_autocomplete():
    """Return title suggestions from a lightweight autocomplete cache."""
    q = request.args.get("q", "").strip()
    limit = request.args.get("limit", AUTOCOMPLETE_DEFAULT_LIMIT, type=int)
    response = jsonify({"suggestions": _autocomplete_lookup(q, limit)})
    response.headers["Cache-Control"] = "public, max-age=60"
    return response


@app.get("/api/autocomplete/bootstrap")
def api_autocomplete_bootstrap():
    """Return all autocomplete titles so the browser can suggest locally."""
    _ensure_autocomplete_ready()
    response = jsonify({
        "version": len(_autocomplete_entries),
        "titles": [title for _, title in _autocomplete_entries],
    })
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


# ═════════════════════════════════════════════════════════════

if __name__ == "__main__":
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(debug=debug, use_reloader=False, port=5001)
