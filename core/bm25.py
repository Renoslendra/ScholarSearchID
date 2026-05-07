"""BM25 Okapi ranking — implemented from scratch."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

import config


def rank_bm25(
    query_tokens: list[str],
    index: "InvertedIndex",
    *,
    k1: float = config.BM25_K1,
    b: float = config.BM25_B,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Return (doc_id, score) pairs sorted by BM25 score (descending).

    Parameters
    ----------
    query_tokens : tokenised query terms.
    index : an InvertedIndex instance.
    k1, b : BM25 hyper-parameters.
    top_k : how many results to return.
    """
    scores: dict[int, float] = {}
    N = index.doc_count
    avg_dl = index.avg_dl

    if N == 0 or avg_dl == 0:
        return []

    for term in query_tokens:
        df = index.doc_freq(term)
        if df == 0:
            continue
        idf = math.log((N - df + 0.5) / (df + 0.5) + 1.0)
        postings = index.get_postings(term)
        for doc_id, tf in postings.items():
            dl = index.doc_lengths.get(doc_id, avg_dl)
            tf_norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avg_dl))
            scores[doc_id] = scores.get(doc_id, 0.0) + idf * tf_norm

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
