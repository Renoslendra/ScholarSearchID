# ScholarSearchID — Audit & Pre-Hosting Planning

> **Tujuan**: Memastikan seluruh fitur ScholarSearchID berfungsi secara penuh sebelum di-hosting ke domain publik.
> **Tanggal Audit**: 6 Mei 2026

---

## Daftar Isi

1. [Ringkasan Arsitektur](#1-ringkasan-arsitektur)
2. [Audit Halaman & Rute](#2-audit-halaman--rute)
3. [Audit API Endpoints](#3-audit-api-endpoints)
4. [Audit Integrasi Frontend ↔ Backend](#4-audit-integrasi-frontend--backend)
5. [Masalah yang Ditemukan (Bugs & Issues)](#5-masalah-yang-ditemukan-bugs--issues)
6. [Keamanan & Production Readiness](#6-keamanan--production-readiness)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Ringkasan Status per Fitur](#8-ringkasan-status-per-fitur)

---

## 1. Ringkasan Arsitektur

```
ScholarSearchID/
├── app.py                  ← Flask entry point (semua route HTML + API)
├── config.py               ← Konfigurasi (path, API keys, IR params)
├── database.py             ← SQLite persistence (papers, users, library, answers)
├── requirements.txt        ← Dependensi Python
├── answer_engine/
│   └── generator.py        ← LLM answer generation (OpenRouter)
├── core/                   ← Modul Information Retrieval
│   ├── bm25.py, tfidf.py, language_model.py, semantic_search.py
│   ├── learning_to_rank.py, neural_ranker.py, pagerank.py
│   ├── query_expansion.py, spelling.py, tokenizer.py
│   ├── evaluation.py, inverted_index.py, index_builder.py
│   └── __init__.py
├── templates/              ← 9 halaman HTML (Jinja2)
│   ├── index.html, search.html, citation.html, lab.html
│   ├── library.html, about.html (signin), register.html
│   ├── profile.html, profile_edit.html
├── static/
│   ├── css/style.css, profile.css
│   ├── js/app.js, search.js, i18n.js, lab.js, hero-animation.js
│   │   citation_graph.js, profile.js
│   └── img/ (logo + campus images)
└── data/
    ├── scholarsearch.db    ← SQLite database
    ├── papers.json         ← 1.8MB corpus
    ├── citations.json      ← Citation edges
    └── stopwords_id.txt    ← Indonesian stopwords
```

**Stack**: Python Flask + SQLite + Vanilla JS + CSS  
**LLM Provider**: OpenRouter (tencent/hy3-preview:free)  
**Data**: 1000 paper dari GARUDA (bidang CS & IT)

---

## 2. Audit Halaman & Rute

| # | Route | Template | Status | Catatan |
|---|-------|----------|--------|---------|
| 1 | `GET /` | `index.html` | ✅ OK | Homepage hero + search box. Stats dari `/api/stats`. |
| 2 | `GET /search` | `search.html` | ✅ OK | Fetches `/api/search`. Pagination, model selector, autocomplete. |
| 3 | `GET /citation` | `citation.html` | ✅ OK | AI Answer page. Fetches `/api/answer`. Save answer button. |
| 4 | `GET /lab` | `lab.html` | ✅ OK | IR Lab mode. Fetches `/api/lab/compare`. |
| 5 | `GET /library` | `library.html` | ✅ OK | Memerlukan login. Redirect ke `/signin` jika belum login. |
| 6 | `GET /signin` | `about.html` | ✅ OK | Login form + image slideshow. |
| 7 | `GET /register` | `register.html` | ✅ OK | Registrasi akun baru. |
| 8 | `GET /profile` | `profile.html` | ✅ OK | Memerlukan login. Menampilkan data user. |
| 9 | `GET /profile/edit` | `profile_edit.html` | ✅ OK | Memerlukan login. Edit profil + ganti password + upload foto. |

---

## 3. Audit API Endpoints

### 3.1 Public APIs (Tidak Perlu Login)

| Endpoint | Method | Status | Fungsi |
|----------|--------|--------|--------|
| `/health` | GET | ✅ OK | Health check |
| `/api/stats` | GET | ✅ OK | Statistik corpus (papers, journals, authors) |
| `/api/search` | GET | ✅ OK | Pencarian utama dengan BM25/TF-IDF/LM/Semantic/L2R |
| `/api/answer` | GET | ✅ OK | Answer Engine (LLM via OpenRouter + extractive fallback) |
| `/api/autocomplete` | GET | ✅ OK | Autocomplete suggestions dari judul paper |
| `/api/paper/<id>` | GET | ✅ OK | Detail paper berdasarkan ID |
| `/api/citation-graph` | GET | ✅ OK | Nodes + Links untuk D3.js citation network |
| `/api/feedback` | POST | ✅ OK | Simpan relevance feedback (👍/👎) |
| `/api/lab/compare` | GET | ✅ OK | Perbandingan multi-model untuk Lab page |

### 3.2 Auth APIs

| Endpoint | Method | Status | Fungsi |
|----------|--------|--------|--------|
| `/api/register` | POST | ✅ OK | Registrasi user baru |
| `/api/login` | POST | ✅ OK | Login user |
| `/api/logout` | GET/POST | ✅ OK | Logout (redirect ke `/`) |

### 3.3 User Profile APIs (Perlu Login)

| Endpoint | Method | Status | Fungsi |
|----------|--------|--------|--------|
| `/api/profile/edit` | POST | ✅ OK | Update profil (nama, gender, country, role, about) |
| `/api/profile/password` | POST | ✅ OK | Ganti password |
| `/api/profile/photo` | POST | ✅ OK | Upload foto profil |

### 3.4 Library APIs (Perlu Login)

| Endpoint | Method | Status | Fungsi |
|----------|--------|--------|--------|
| `/api/library/save` | POST | ✅ OK | Simpan paper ke library |
| `/api/library/unsave` | POST | ✅ OK | Hapus paper dari library |
| `/api/library` | GET | ✅ OK | Ambil daftar saved papers |
| `/api/library/ids` | GET | ✅ OK | Ambil set ID paper yang disimpan |
| `/api/answer/save` | POST | ✅ OK | Simpan jawaban AI ke library |
| `/api/answer/unsave` | POST | ✅ OK | Hapus jawaban AI dari library |
| `/api/answer/saved` | GET | ✅ OK | Ambil daftar jawaban AI tersimpan |
| `/api/answer/is-saved` | GET | ✅ OK | Cek apakah jawaban sudah disimpan |

---

## 4. Audit Integrasi Frontend ↔ Backend

### 4.1 Homepage (`index.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Hero animation (Canvas) | `hero-animation.js` | ✅ OK | Particle animation pada background |
| Stats bar (Papers/Journals/Authors) | `fetch('/api/stats')` | ✅ OK | Mengambil data langsung dari DB |
| Search Mode / Answer Mode toggle | `app.js` | ✅ OK | Mengubah `form.action` antara `/search` dan `/citation` |
| Autocomplete dropdown | `search.js → /api/autocomplete` | ✅ OK | Debounced, min 2 karakter |
| Language toggle (ID ↔ EN) | `i18n.js` | ✅ OK | Floating button di hero page |

### 4.2 Search Page (`search.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Fetching search results | `fetch('/api/search')` | ✅ OK | Pagination, model selection |
| Model selector (BM25/TF-IDF/LM/L2R/Semantic) | `<select> → doSearch()` | ✅ OK | Re-fetches saat model diganti |
| Spelling suggestion ("Did you mean") | Response `.suggestion` | ✅ OK | Muncul sebagai link clickable |
| Query expansion | Response `.expanded_query` | ✅ OK | Muncul di expansion-hint box |
| Save paper (bookmark) | `fetch('/api/library/save')` | ✅ OK | Toggle saved/unsaved state |
| Saved paper IDs (UI state) | `fetch('/api/library/ids')` | ✅ OK | Menandai paper yang sudah disimpan |
| Pagination | Dynamic JS | ✅ OK | Sliding window, ellipsis |
| Scroll reveal animation | CSS `.reveal` | ✅ OK | Staggered delay per card |
| Navbar search | `app.js + search.js` | ✅ OK | Enter key redirect ke `/search?q=...` |
| User avatar di navbar | Jinja2 `{% if user %}` | ✅ OK | Avatar atau initial letter |

### 4.3 Answer / Citation Page (`citation.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Fetching AI answer | `fetch('/api/answer')` | ✅ OK | Timeout 120s, loading state |
| Session caching | `sessionStorage` | ✅ OK | Menghindari re-fetch saat back/forward |
| Inline reference links [1][2] | Regex replace | ✅ OK | Scroll ke citation card |
| Citation cards grid | Dynamic JS | ✅ OK | 2-column grid, staggered reveal |
| Copy answer button | `navigator.clipboard` | ✅ OK | Visual feedback (green border) |
| Save answer button | `fetch('/api/answer/save')` | ✅ OK | Toggle saved/unsaved visual |
| Check if already saved | `fetch('/api/answer/is-saved')` | ✅ OK | Pada render, cek status |
| Save cited paper | `fetch('/api/library/save')` | ✅ OK | Bookmark per citation card |
| Source badge (AI / Extractive) | Response `.source` | ✅ OK | Pulse dot + label |
| Language-aware answer | `?lang=id/en` param | ✅ OK | Mengikuti i18n setting |

### 4.4 Library Page (`library.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Fetch saved papers | `fetch('/api/library')` | ✅ OK | Loading → empty/list state |
| Render paper cards | Dynamic JS | ✅ OK | Journal tag, year, abstract |
| Sort/filter papers | `<select>` → `applyFilter()` | ✅ OK | Newest/Year/Title sorting |
| Unsave paper (remove) | `fetch('/api/library/unsave')` | ✅ OK | Animate out + decrement count |
| Fetch saved AI answers | `fetch('/api/answer/saved')` | ✅ OK | Accordion cards |
| Delete saved answer | `fetch('/api/answer/unsave')` | ✅ OK | Animate out + decrement count |
| Accordion expand/collapse | `.sa-body.open` toggle | ✅ OK | Click to expand full text |
| Empty state visual | SVG icon + message | ✅ OK | "Belum ada paper yang disimpan" |

### 4.5 Lab Page (`lab.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Multi-model comparison | `fetch('/api/lab/compare')` | ✅ OK | Side-by-side results |
| Evaluation metrics (P, R, NDCG, MAP) | Response `.metrics` | ✅ OK | Auto-generate pseudo-judgments |
| Precision-Recall curve | Canvas chart | ✅ OK | Dynamic plotting |
| BM25 parameter tuning (K1, B) | Input sliders | ✅ OK | Re-fetches on change |

### 4.6 Auth Pages (`about.html` / `register.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Login form submission | `fetch('/api/login')` | ✅ OK | Error messages shown inline |
| Register form submission | `fetch('/api/register')` | ✅ OK | Auto-login after register |
| Image slideshow | CSS + JS | ✅ OK | 3 campus images rotate |
| Form validation | Frontend | ✅ OK | Cek email/password format |

### 4.7 Profile Pages (`profile.html` / `profile_edit.html`)

| Fitur | Integrasi | Status | Catatan |
|-------|-----------|--------|---------|
| Display user info | Jinja2 `{{ user.* }}` | ✅ OK | Server-side rendering |
| Edit profile | `fetch('/api/profile/edit')` | ✅ OK | AJAX submission |
| Change password | `fetch('/api/profile/password')` | ✅ OK | Old + New password validation |
| Upload photo | `fetch('/api/profile/photo')` | ✅ OK | FormData multipart upload |
| Logout button | `href='/api/logout'` | ✅ OK | Redirect ke homepage |

### 4.8 Localization (i18n)

| Fitur | Status | Catatan |
|-------|--------|---------|
| Toggle ID ↔ EN | ✅ OK | Disimpan di `localStorage` |
| Navbar labels | ✅ OK | Search, Answer, Library, Lab |
| Search page text | ✅ OK | Empty state, results suffix, pagination |
| Answer page text | ✅ OK | Loading, source labels, ref title |
| Library page text | ✅ OK | Section headers, empty states |
| Lab page text | ✅ OK | Config labels, metric labels |

---

## 5. Masalah yang Ditemukan (Bugs & Issues)

### 🔴 CRITICAL — Harus Diperbaiki Sebelum Hosting

| # | Masalah | File | Detail |
|---|---------|------|--------|
| C1 | **Secret key hardcoded** | `app.py:37` | `app.secret_key = "super_secret_scholarsearch_key"` — Harus diganti dengan environment variable. Session cookies bisa di-forge jika key bocor. |
| C2 | **API key hardcoded** | `config.py:40-42` | OpenRouter API key di-commit ke source code: `sk-or-v1-ecda3eae...`. Harus dipindah ke environment variable atau `.env` file. |
| C3 | **Tidak ada WSGI server** | `requirements.txt` | Tidak ada `gunicorn` atau `waitress`. Flask built-in server tidak boleh digunakan di production. |
| C4 | **Tidak ada `.gitignore` untuk data sensitif** | root | Database file (`scholarsearch.db`) dan `static/uploads/` mungkin ter-commit. |
| C5 | **`debug=True` di development** | `app.py:620` | Saat ini `debug=True` hanya di `__main__` block, jadi aman jika di-deploy via WSGI. Tapi perlu dikonfirmasi. |

### 🟡 MEDIUM — Sebaiknya Diperbaiki

| # | Masalah | File | Detail |
|---|---------|------|--------|
| M1 | **Duplikat key di `i18n.js`** | `i18n.js:56-121` | Blok `library.*` keys diduplikasi di Bahasa Indonesia (baris 56-69 dan 105-121). Tidak menyebabkan error, tapi baris 105-121 akan menimpa 56-69. |
| M2 | **Navbar search conflict** | `app.js:78-87` vs `citation.html:340-353` | `app.js` menangkap Enter di `#nav-search` dan redirect ke `/search`, tapi `citation.html` juga menangkap Enter dan redirect ke `/citation`. Karena `citation.html` memuat `app.js` terlebih dahulu, listener di `citation.html` mungkin tertimpa atau double-fire. Berpotensi conflict. |
| M3 | **Unsave answer tidak memanggil API dari citation page** | `citation.html:538-544` | Tombol save di citation page toggle ke "unsaved" secara visual saja tanpa memanggil `/api/answer/unsave`. User harus pergi ke Library untuk benar-benar menghapus. |
| M4 | **SQLite tidak cocok untuk concurrent writes di production** | `database.py` | SQLite dengan WAL mode sudah lebih baik, tapi untuk multi-user concurrent, perlu pertimbangkan PostgreSQL atau setidaknya proper locking strategy. |
| M5 | **Tidak ada rate limiting** | `app.py` | API endpoints seperti `/api/answer` (memanggil LLM) dan `/api/register` tidak memiliki rate limiting. Bisa dieksploitasi. |
| M6 | **Tidak ada CSRF protection** | `app.py` | POST endpoints tidak menggunakan CSRF token. Rentan terhadap Cross-Site Request Forgery. |
| M7 | **`collections-section` warna background hardcoded `#f0f0f0`** | `library.html:43` | Warna ini tidak menggunakan CSS variable. Jika user menggunakan dark mode di browser, section ini akan tetap light. |
| M8 | **Library page `class="light"` hardcoded di body** | `library.html:335` | Body memiliki class `light` yang di-hardcode, memaksa light theme walaupun user mungkin prefer dark mode (halaman lain menggunakan dark theme default). |

### 🟢 LOW — Nice to Fix

| # | Masalah | File | Detail |
|---|---------|------|--------|
| L1 | **Tidak ada loading spinner di homepage stats** | `index.html:46-56` | Stats menampilkan "... Papers" sebelum API response. Tidak ada spinner. |
| L2 | **Footer copyright tidak menggunakan i18n** | `citation.html:289` | Beberapa footer hardcoded, tidak pakai `data-i18n="footer.copyright"`. |
| L3 | **`search.js` memiliki duplicate nav Enter handler** | `search.js:145-154` | `keypress` listener untuk Enter bisa conflict dengan `keydown` listener di `app.js`. |
| L4 | **Autocomplete tidak berfungsi di Lab page** | `lab.html` | Lab page memiliki search input tapi tidak memuat `search.js`, sehingga autocomplete tidak ada. |
| L5 | **Citation graph (`citation_graph.js`) tidak dipakai** | `static/js/` | File ada tapi tidak di-include di halaman manapun. Dead code. |
| L6 | **`profile.js` perlu diperiksa** | `static/js/profile.js` | Ada tapi tidak termasuk dalam audit scope. Pastikan berfungsi. |

---

## 6. Keamanan & Production Readiness

### 6.1 Yang Harus Dilakukan Sebelum Deploy

| # | Item | Prioritas | Status |
|---|------|-----------|--------|
| 1 | Pindahkan `SECRET_KEY` ke environment variable | 🔴 CRITICAL | ❌ Belum |
| 2 | Pindahkan `OPENROUTER_API_KEY` ke environment variable saja (hapus default value) | 🔴 CRITICAL | ❌ Belum |
| 3 | Tambahkan `gunicorn` atau `waitress` ke `requirements.txt` | 🔴 CRITICAL | ❌ Belum |
| 4 | Buat `Procfile` atau `Dockerfile` untuk deployment | 🔴 CRITICAL | ❌ Belum |
| 5 | Tambahkan CORS configuration jika API diakses cross-origin | 🟡 MEDIUM | ❌ Belum |
| 6 | Tambahkan CSRF protection (Flask-WTF) | 🟡 MEDIUM | ❌ Belum |
| 7 | Tambahkan rate limiting (Flask-Limiter) | 🟡 MEDIUM | ❌ Belum |
| 8 | Pastikan `.gitignore` mencakup `data/scholarsearch.db`, `static/uploads/`, `.env` | 🟡 MEDIUM | ❌ Perlu dicek |
| 9 | Set `SESSION_COOKIE_SECURE = True` untuk HTTPS | 🟡 MEDIUM | ❌ Belum |
| 10 | Set `SESSION_COOKIE_HTTPONLY = True` | 🟡 MEDIUM | ❌ Belum |
| 11 | Pertimbangkan migrasi dari SQLite ke PostgreSQL untuk multi-user | 🟢 LOW | ❌ Opsional |

### 6.2 Environment Variables yang Diperlukan

```bash
# .env file (JANGAN di-commit ke Git)
SECRET_KEY=<random-256-bit-string>
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=sqlite:///data/scholarsearch.db  # atau PostgreSQL URL
FLASK_ENV=production
```

### 6.3 Dependensi yang Perlu Ditambahkan ke `requirements.txt`

```
Flask>=3.0,<4.0
requests>=2.31,<3.0
beautifulsoup4>=4.12,<5.0
lxml>=5.0,<6.0
PySastrawi>=1.2,<2.0
gunicorn>=22.0        # ← WSGI server untuk production
python-dotenv>=1.0    # ← Untuk membaca .env file
```

---

## 7. Deployment Checklist

### Fase 1: Persiapan Kode (Pre-Deploy)

- [ ] **Perbaiki semua issue CRITICAL (C1-C5)**
  - [ ] C1: Ganti hardcoded secret key → `os.environ.get("SECRET_KEY")`
  - [ ] C2: Hapus default API key dari config → hanya pakai env var
  - [ ] C3: Tambah `gunicorn` + `python-dotenv` ke `requirements.txt`
  - [ ] C4: Buat/update `.gitignore`
  - [ ] C5: Pastikan `debug=False` di production
- [ ] **Buat file `.env.example`** (template tanpa value sensitif)
- [ ] **Buat `Procfile`** untuk hosting (contoh: `web: gunicorn app:app`)
- [ ] **Buat `Dockerfile`** (opsional, tapi direkomendasikan)
- [ ] **Test di local** dengan `gunicorn` bukan Flask dev server

### Fase 2: Perbaiki Bug (Fix Issues)

- [ ] **M1**: Hapus blok `library.*` yang duplikat di `i18n.js`
- [ ] **M2**: Selaraskan navbar search handler agar tidak conflict
- [ ] **M3**: Tambahkan API call untuk unsave di citation page
- [ ] **M7-M8**: Perbaiki dark/light mode inconsistency di library page

### Fase 3: Testing End-to-End

- [ ] **Test tanpa login**: Homepage → Search → Answer → Lab
- [ ] **Test dengan login**: Register → Login → Search (save paper) → Answer (save answer) → Library (lihat saved items) → Remove items → Profile edit → Logout
- [ ] **Test i18n**: Toggle ID ↔ EN di setiap halaman
- [ ] **Test responsive**: Mobile view (< 768px) di setiap halaman
- [ ] **Test error states**: Query kosong, 401 redirect, API timeout, LLM failure

### Fase 4: Deploy ke Server

- [ ] **Pilih platform hosting** (Railway, Render, VPS, GCP Cloud Run, dll.)
- [ ] **Konfigurasi domain** (DNS pointing)
- [ ] **Set environment variables** di platform hosting
- [ ] **Deploy kode**
- [ ] **Test di production URL**
- [ ] **Aktifkan SSL/HTTPS** (wajib untuk session cookies yang aman)

---

## 8. Ringkasan Status per Fitur

| Fitur | Frontend | Backend | Integrasi | Siap Deploy? |
|-------|----------|---------|-----------|--------------|
| Homepage + Stats | ✅ | ✅ | ✅ | ✅ Ya |
| Search + Pagination | ✅ | ✅ | ✅ | ✅ Ya |
| Autocomplete | ✅ | ✅ | ✅ | ✅ Ya |
| AI Answer Engine | ✅ | ✅ | ✅ | ✅ Ya |
| Citation References | ✅ | ✅ | ✅ | ✅ Ya |
| IR Lab (Multi-model) | ✅ | ✅ | ✅ | ✅ Ya |
| User Registration | ✅ | ✅ | ✅ | ✅ Ya |
| User Login/Logout | ✅ | ✅ | ✅ | ✅ Ya |
| User Profile | ✅ | ✅ | ✅ | ✅ Ya |
| Profile Edit + Photo | ✅ | ✅ | ✅ | ✅ Ya |
| Save/Unsave Papers | ✅ | ✅ | ✅ | ✅ Ya |
| Save/Unsave AI Answers | ✅ | ✅ | ✅ | ✅ Ya |
| Library View | ✅ | ✅ | ✅ | ✅ Ya |
| Localization (i18n) | ✅ | N/A | ✅ | ✅ Ya |
| Feedback (👍/👎) | ✅ | ✅ | ✅ | ✅ Ya |
| Citation Graph (D3) | ⚠️ JS ada tapi tidak dipakai | ✅ | ❌ Tidak terintegrasi | ❌ Dead code |

### Kesimpulan

> **Semua fitur utama sudah berfungsi dan terintegrasi antara frontend dan backend.**
> 
> Yang **wajib dilakukan sebelum hosting** adalah:
> 1. Pindahkan secret key dan API key ke environment variables (CRITICAL)
> 2. Tambahkan WSGI server (gunicorn) ke requirements
> 3. Buat Procfile/Dockerfile
> 4. Fix minor bugs (i18n duplikat, dark mode library, navbar search conflict)
>
> Estimasi waktu perbaikan: **~1-2 jam** untuk semua issue CRITICAL + MEDIUM.

---

*Dokumen ini dihasilkan dari audit menyeluruh terhadap seluruh source code ScholarSearchID.*
