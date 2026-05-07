"""Query expansion using Rocchio algorithm and simple thesaurus — from scratch."""

from __future__ import annotations

from collections import Counter
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

from core.tokenizer import tokenize


# ── Simple synonym / thesaurus map (CS & IT domain) ─────────
_THESAURUS: dict[str, list[str]] = {
    "machine": ["mesin"],
    "mesin": ["machine"],
    "learning": ["pembelajaran", "belajar"],
    "pembelajaran": ["learning"],
    "jaringan": ["network", "networking"],
    "network": ["jaringan"],
    "komputer": ["computer"],
    "computer": ["komputer"],
    "sistem": ["system"],
    "system": ["sistem"],
    "informasi": ["information"],
    "information": ["informasi"],
    "data": ["data"],
    "analisis": ["analysis"],
    "analysis": ["analisis"],
    "algoritma": ["algorithm"],
    "algorithm": ["algoritma"],
    "klasifikasi": ["classification"],
    "classification": ["klasifikasi"],
    "prediksi": ["prediction"],
    "prediction": ["prediksi"],
    "citra": ["image"],
    "image": ["citra", "gambar"],
    "teks": ["text"],
    "text": ["teks"],
    "deteksi": ["detection"],
    "detection": ["deteksi"],
    "pengolahan": ["processing"],
    "processing": ["pengolahan"],
    "keamanan": ["security"],
    "security": ["keamanan"],
    "web": ["website"],
    "website": ["web"],
    "mobile": ["seluler"],
    "database": ["basis data"],
    "deep": ["dalam", "mendalam"],
    "neural": ["saraf"],
    "artificial": ["buatan"],
    "intelligence": ["kecerdasan"],
    "kecerdasan": ["intelligence"],
}


def expand_thesaurus(tokens: list[str], max_expand: int = 2) -> list[str]:
    """Add synonym terms from the domain thesaurus."""
    expanded = list(tokens)
    for tok in tokens:
        synonyms = _THESAURUS.get(tok, [])
        for syn in synonyms[:max_expand]:
            stemmed = tokenize(syn, remove_stopwords=False, do_stem=True)
            expanded.extend(stemmed)
    return expanded


# ── Rocchio relevance feedback ───────────────────────────────

def rocchio_expand(
    query_tokens: list[str],
    relevant_doc_tokens: list[list[str]],
    non_relevant_doc_tokens: list[list[str]] | None = None,
    *,
    alpha: float = 1.0,
    beta: float = 0.75,
    gamma: float = 0.15,
    top_expand: int = 5,
) -> list[str]:
    """Expand query using Rocchio algorithm.

    q_new = α·q + β·(avg relevant) - γ·(avg non-relevant)
    We pick the top-N terms from q_new that are not already in the query.
    """
    # Query vector
    q_vec: Counter[str] = Counter()
    for t in query_tokens:
        q_vec[t] += alpha

    # Relevant centroid
    if relevant_doc_tokens:
        rel_count = len(relevant_doc_tokens)
        for doc_tokens in relevant_doc_tokens:
            for t in doc_tokens:
                q_vec[t] += beta / rel_count

    # Non-relevant centroid
    if non_relevant_doc_tokens:
        nrel_count = len(non_relevant_doc_tokens)
        for doc_tokens in non_relevant_doc_tokens:
            for t in doc_tokens:
                q_vec[t] -= gamma / nrel_count

    # Pick top expansion terms not in original query
    original = set(query_tokens)
    candidates = [(t, w) for t, w in q_vec.items() if t not in original and w > 0]
    candidates.sort(key=lambda x: x[1], reverse=True)
    expansion = [t for t, _ in candidates[:top_expand]]
    return list(query_tokens) + expansion


# ── Public convenience function ──────────────────────────────

def expand_query(
    query_tokens: list[str],
    index: "InvertedIndex | None" = None,
) -> list[str]:
    """Expand query using thesaurus. Returns expanded token list."""
    return expand_thesaurus(query_tokens)
