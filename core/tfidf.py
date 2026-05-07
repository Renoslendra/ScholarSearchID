"""TF-IDF and cosine similarity — implemented from scratch."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

import config


def _tfidf_vector(
    tokens: list[str],
    index: "InvertedIndex",
) -> dict[str, float]:
    """Compute the TF-IDF weight vector for a set of tokens."""
    N = index.doc_count or 1
    freq: dict[str, int] = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    vec: dict[str, float] = {}
    for term, tf in freq.items():
        df = max(index.doc_freq(term), 1)
        tf_log = 1 + math.log(tf) if tf > 0 else 0
        idf = math.log(N / df)
        vec[term] = tf_log * idf
    return vec


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a.get(k, 0) * b.get(k, 0) for k in set(a) | set(b))
    mag_a = math.sqrt(sum(v * v for v in a.values())) or 1
    mag_b = math.sqrt(sum(v * v for v in b.values())) or 1
    return dot / (mag_a * mag_b)


def rank_tfidf(
    query_tokens: list[str],
    index: "InvertedIndex",
    *,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Rank documents by cosine similarity of TF-IDF vectors."""
    if not query_tokens or index.doc_count == 0:
        return []

    q_vec = _tfidf_vector(query_tokens, index)

    # Candidate docs: any doc that contains at least one query term
    candidates: set[int] = set()
    for t in query_tokens:
        candidates |= set(index.get_postings(t).keys())

    scores: list[tuple[int, float]] = []
    for doc_id in candidates:
        # Build document vector (only for terms that overlap with query)
        d_vec: dict[str, float] = {}
        N = index.doc_count or 1
        for term in q_vec:
            tf = index.term_freq(term, doc_id)
            if tf > 0:
                tf_log = 1 + math.log(tf)
                df = max(index.doc_freq(term), 1)
                idf = math.log(N / df)
                d_vec[term] = tf_log * idf
        sim = _cosine(q_vec, d_vec)
        if sim > 0:
            scores.append((doc_id, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


def get_tfidf_weights(
    doc_id: int,
    query_tokens: list[str],
    index: "InvertedIndex",
) -> dict[str, float]:
    """Return per-term TF-IDF weights for display in result cards."""
    N = index.doc_count or 1
    weights: dict[str, float] = {}
    for term in query_tokens:
        tf = index.term_freq(term, doc_id)
        if tf > 0:
            tf_log = 1 + math.log(tf)
            df = max(index.doc_freq(term), 1)
            idf = math.log(N / df)
            weights[term] = round(tf_log * idf, 3)
    return weights
