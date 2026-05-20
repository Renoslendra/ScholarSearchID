"""SQLite persistence layer for ScholarSearchID."""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from typing import Any

import config


# ── helpers ──────────────────────────────────────────────────

@contextmanager
def _connect(db_path: str | None = None):
    """Yield a DB connection with WAL mode and row-factory enabled."""
    path = db_path or config.DATABASE_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ── schema ───────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS papers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    garuda_id   TEXT UNIQUE,
    title       TEXT NOT NULL,
    abstract    TEXT DEFAULT '',
    authors     TEXT NOT NULL DEFAULT '[]',
    year        INTEGER,
    journal     TEXT DEFAULT '',
    publisher   TEXT DEFAULT '',
    issn        TEXT DEFAULT '',
    eissn       TEXT DEFAULT '',
    doi         TEXT DEFAULT '',
    url         TEXT DEFAULT '',
    keywords    TEXT DEFAULT '[]',
    subject     TEXT DEFAULT 'Public Health',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id    INTEGER REFERENCES papers(id) ON DELETE CASCADE,
    cited_id    INTEGER REFERENCES papers(id) ON DELETE CASCADE,
    UNIQUE(paper_id, cited_id)
);

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname     TEXT NOT NULL,
    lastname      TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gender        TEXT DEFAULT '',
    country       TEXT DEFAULT '',
    role          TEXT DEFAULT '',
    about         TEXT DEFAULT '',
    profile_photo TEXT DEFAULT '',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS relevance_judgments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    query       TEXT NOT NULL,
    paper_id    INTEGER REFERENCES papers(id) ON DELETE CASCADE,
    relevance   INTEGER DEFAULT 0,
    user_id     TEXT DEFAULT 'anon',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_papers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paper_id    INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, paper_id)
);

CREATE TABLE IF NOT EXISTS saved_answers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    source     TEXT DEFAULT 'llm',
    citations  TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question)
);

CREATE INDEX IF NOT EXISTS idx_papers_year    ON papers(year);
CREATE INDEX IF NOT EXISTS idx_papers_journal ON papers(journal);
CREATE INDEX IF NOT EXISTS idx_cit_paper      ON citations(paper_id);
CREATE INDEX IF NOT EXISTS idx_saved_user     ON saved_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_ans_user ON saved_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_cit_cited      ON citations(cited_id);
CREATE INDEX IF NOT EXISTS idx_rel_query      ON relevance_judgments(query);
"""


def init_db(db_path: str | None = None) -> None:
    """Create tables if they do not exist."""
    with _connect(db_path) as conn:
        conn.executescript(_SCHEMA)


# ── paper CRUD ───────────────────────────────────────────────

def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    d = dict(row)
    for key in ("authors", "keywords"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                d[key] = []
    return d


def insert_paper(paper: dict[str, Any], db_path: str | None = None) -> int:
    """Insert a single paper. Returns the new row-id."""
    authors = paper.get("authors", [])
    if isinstance(authors, list):
        authors = json.dumps(authors, ensure_ascii=False)
    keywords = paper.get("keywords", [])
    if isinstance(keywords, list):
        keywords = json.dumps(keywords, ensure_ascii=False)

    with _connect(db_path) as conn:
        cur = conn.execute(
            """INSERT OR IGNORE INTO papers
               (garuda_id, title, abstract, authors, year,
                journal, publisher, issn, eissn, doi, url,
                keywords, subject)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                paper.get("garuda_id", ""),
                paper.get("title", ""),
                paper.get("abstract", ""),
                authors,
                paper.get("year"),
                paper.get("journal", ""),
                paper.get("publisher", ""),
                paper.get("issn", ""),
                paper.get("eissn", ""),
                paper.get("doi", ""),
                paper.get("url", ""),
                keywords,
                paper.get("subject", "Public Health"),
            ),
        )
        return cur.lastrowid  # type: ignore[return-value]


def insert_papers(papers: list[dict[str, Any]], db_path: str | None = None) -> int:
    """Bulk-insert papers. Returns count of rows inserted."""
    count = 0
    for p in papers:
        row_id = insert_paper(p, db_path)
        if row_id:
            count += 1
    return count


def get_paper(paper_id: int, db_path: str | None = None) -> dict[str, Any] | None:
    with _connect(db_path) as conn:
        row = conn.execute("SELECT * FROM papers WHERE id=?", (paper_id,)).fetchone()
        return _row_to_dict(row) if row else None


def get_all_papers(db_path: str | None = None) -> list[dict[str, Any]]:
    with _connect(db_path) as conn:
        rows = conn.execute("SELECT * FROM papers ORDER BY id").fetchall()
        return [_row_to_dict(r) for r in rows]


def search_papers_sql(
    query: str,
    page: int = 1,
    per_page: int = 10,
    db_path: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Simple SQL LIKE search (fallback).  Returns (results, total)."""
    like = f"%{query}%"
    with _connect(db_path) as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM papers WHERE title LIKE ? OR abstract LIKE ?",
            (like, like),
        ).fetchone()[0]
        rows = conn.execute(
            """SELECT * FROM papers
               WHERE title LIKE ? OR abstract LIKE ?
               ORDER BY year DESC
               LIMIT ? OFFSET ?""",
            (like, like, per_page, (page - 1) * per_page),
        ).fetchall()
        return [_row_to_dict(r) for r in rows], total


def get_stats(db_path: str | None = None) -> dict[str, Any]:
    with _connect(db_path) as conn:
        total_papers = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
        total_journals = conn.execute(
            "SELECT COUNT(DISTINCT journal) FROM papers WHERE journal != ''"
        ).fetchone()[0]
        total_authors_raw = conn.execute("SELECT authors FROM papers").fetchall()
        author_set: set[str] = set()
        for row in total_authors_raw:
            try:
                for a in json.loads(row[0]):
                    author_set.add(a.strip())
            except (json.JSONDecodeError, TypeError):
                pass
        return {
            "total_papers": total_papers,
            "total_journals": total_journals,
            "total_authors": len(author_set),
        }


# ── citations ────────────────────────────────────────────────

def insert_citation(paper_id: int, cited_id: int, db_path: str | None = None) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO citations (paper_id, cited_id) VALUES (?,?)",
            (paper_id, cited_id),
        )


def get_citation_edges(db_path: str | None = None) -> list[tuple[int, int]]:
    with _connect(db_path) as conn:
        rows = conn.execute("SELECT paper_id, cited_id FROM citations").fetchall()
        return [(r[0], r[1]) for r in rows]


# ── relevance judgments ──────────────────────────────────────

def save_judgment(
    query: str, paper_id: int, relevance: int, user_id: str = "anon",
    db_path: str | None = None,
) -> None:
    with _connect(db_path) as conn:
        conn.execute(
            """INSERT INTO relevance_judgments (query, paper_id, relevance, user_id)
               VALUES (?,?,?,?)""",
            (query, paper_id, relevance, user_id),
        )


def get_judgments(query: str, db_path: str | None = None) -> dict[int, int]:
    """Return {paper_id: relevance} for a given query."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT paper_id, relevance FROM relevance_judgments WHERE query=?",
            (query,),
        ).fetchall()
        return {r[0]: r[1] for r in rows}


# ── users ──────────────────────────────────────────────────────

def create_user(
    firstname: str, lastname: str, email: str, password_hash: str, db_path: str | None = None
) -> int:
    """Insert a new user. Returns the new row-id or 0 if email exists."""
    with _connect(db_path) as conn:
        try:
            cur = conn.execute(
                """INSERT INTO users (firstname, lastname, email, password_hash)
                   VALUES (?,?,?,?)""",
                (firstname, lastname, email, password_hash),
            )
            return cur.lastrowid  # type: ignore[return-value]
        except sqlite3.IntegrityError:
            return 0  # Email already exists


def get_user_by_email(email: str, db_path: str | None = None) -> dict[str, Any] | None:
    """Get user by email."""
    with _connect(db_path) as conn:
        row = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int, db_path: str | None = None) -> dict[str, Any] | None:
    """Get user by id."""
    with _connect(db_path) as conn:
        row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        return dict(row) if row else None


def update_user_profile(user_id: int, firstname: str, lastname: str, gender: str, country: str, role: str, about: str, db_path: str | None = None) -> bool:
    """Update user profile information."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                """
                UPDATE users
                SET firstname = ?, lastname = ?, gender = ?, country = ?, role = ?, about = ?
                WHERE id = ?
                """,
                (firstname, lastname, gender, country, role, about, user_id)
            )
            return True
        except Exception:
            return False


def update_user_photo(user_id: int, photo_path: str, db_path: str | None = None) -> bool:
    """Update user profile photo path."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "UPDATE users SET profile_photo = ? WHERE id = ?",
                (photo_path, user_id)
            )
            return True
        except Exception:
            return False


def update_user_password(user_id: int, new_password_hash: str, db_path: str | None = None) -> bool:
    """Update user password hash."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (new_password_hash, user_id)
            )
            return True
        except Exception:
            return False


def remove_user_photo(user_id: int, db_path: str | None = None) -> bool:
    """Remove user photo."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "UPDATE users SET profile_photo = NULL WHERE id = ?",
                (user_id,)
            )
            return True
        except Exception:
            return False


def delete_user(user_id: int, db_path: str | None = None) -> bool:
    """Hapus akun user secara permanen beserta semua data terkait."""
    with _connect(db_path) as conn:
        try:
            # Hapus paper tersimpan milik user
            conn.execute("DELETE FROM saved_papers WHERE user_id = ?", (user_id,))
            # Hapus akun user
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return True
        except Exception:
            return False


# ── library (saved papers) ───────────────────────────────────

def save_paper(user_id: int, paper_id: int, db_path: str | None = None) -> bool:
    """Save a paper to user's library."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO saved_papers (user_id, paper_id) VALUES (?, ?)",
                (user_id, paper_id)
            )
            return True
        except Exception:
            return False


def unsave_paper(user_id: int, paper_id: int, db_path: str | None = None) -> bool:
    """Remove a paper from user's library."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "DELETE FROM saved_papers WHERE user_id = ? AND paper_id = ?",
                (user_id, paper_id)
            )
            return True
        except Exception:
            return False


def get_saved_papers(user_id: int, db_path: str | None = None) -> list[dict[str, Any]]:
    """Get all papers saved by a user, joined with paper details."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            """
            SELECT p.*, sp.created_at as saved_at
            FROM saved_papers sp
            JOIN papers p ON sp.paper_id = p.id
            WHERE sp.user_id = ?
            ORDER BY sp.created_at DESC
            """,
            (user_id,)
        ).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            # Parse authors
            raw = d.get("authors", "")
            if isinstance(raw, str) and raw.startswith("["):
                try:
                    d["authors"] = json.loads(raw)
                except Exception:
                    pass
            results.append(d)
        return results


def get_saved_paper_ids(user_id: int, db_path: str | None = None) -> set[int]:
    """Get set of paper IDs saved by a user."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT paper_id FROM saved_papers WHERE user_id = ?",
            (user_id,)
        ).fetchall()
        return {row["paper_id"] for row in rows}


# ── library (saved answers) ──────────────────────────────────

def save_answer(
    user_id: int,
    question: str,
    answer: str,
    source: str = "llm",
    citations: list | None = None,
    db_path: str | None = None,
) -> int | None:
    """Save an AI answer to user's library. Returns the row id or None."""
    cit_json = json.dumps(citations or [], ensure_ascii=False)
    with _connect(db_path) as conn:
        try:
            cur = conn.execute(
                """INSERT OR REPLACE INTO saved_answers
                   (user_id, question, answer, source, citations)
                   VALUES (?, ?, ?, ?, ?)""",
                (user_id, question, answer, source, cit_json),
            )
            return cur.lastrowid
        except Exception:
            return None


def unsave_answer(user_id: int, answer_id: int, db_path: str | None = None) -> bool:
    """Remove a saved answer from user's library."""
    with _connect(db_path) as conn:
        try:
            conn.execute(
                "DELETE FROM saved_answers WHERE id = ? AND user_id = ?",
                (answer_id, user_id),
            )
            return True
        except Exception:
            return False


def get_saved_answers(user_id: int, db_path: str | None = None) -> list[dict[str, Any]]:
    """Get all saved AI answers for a user."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            """SELECT * FROM saved_answers
               WHERE user_id = ? ORDER BY created_at DESC""",
            (user_id,),
        ).fetchall()
        results = []
        for row in rows:
            d = dict(row)
            raw = d.get("citations", "[]")
            if isinstance(raw, str):
                try:
                    d["citations"] = json.loads(raw)
                except Exception:
                    d["citations"] = []
            results.append(d)
        return results


def is_answer_saved(user_id: int, question: str, db_path: str | None = None) -> bool:
    """Check if user already saved an answer for this question."""
    with _connect(db_path) as conn:
        row = conn.execute(
            "SELECT id FROM saved_answers WHERE user_id = ? AND question = ?",
            (user_id, question),
        ).fetchone()
        return row is not None


# ── export ───────────────────────────────────────────────────

def export_to_json(path: str | None = None, db_path: str | None = None) -> None:
    """Export all papers to a JSON file."""
    papers = get_all_papers(db_path)
    out = path or config.PAPERS_PATH
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)


# ── auto-init on import ─────────────────────────────────────
init_db()
