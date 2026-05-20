"""Learning to Rank — feature combination with simple linear model."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

import config
from core.bm25 import rank_bm25
from core.tfidf import rank_tfidf
from core.language_model import rank_language_model


def rank_l2r(
    query_tokens: list[str],
    index: "InvertedIndex",
    papers: list[dict[str, Any]],
    pagerank_scores: dict[int, float] | None = None,
    *,
    weights: dict[str, float] | None = None,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Combine multiple retrieval signals into a final score.

    Default weights: BM25=0.4, TF-IDF=0.25, LM=0.2, PageRank=0.15
    """
    if not query_tokens or index.doc_count == 0:
        return []

    w = weights or {"bm25": 0.4, "tfidf": 0.25, "lm": 0.2, "pagerank": 0.15}

    # Gather scores from each model (use moderate top_k for speed on shared hosting)
    big_k = min(index.doc_count, 50)
    bm25_list = rank_bm25(query_tokens, index, top_k=big_k)
    tfidf_list = rank_tfidf(query_tokens, index, top_k=big_k)
    lm_list = rank_language_model(query_tokens, index, top_k=big_k)

    # Min-max normalise each signal
    def _normalise(scores: list[tuple[int, float]]) -> dict[int, float]:
        if not scores:
            return {}
        vals = [s for _, s in scores]
        mn, mx = min(vals), max(vals)
        rng = mx - mn if mx > mn else 1.0
        return {d: (s - mn) / rng for d, s in scores}

    bm25_n = _normalise(bm25_list)
    tfidf_n = _normalise(tfidf_list)
    lm_n = _normalise(lm_list)
    pr = pagerank_scores or {}

    # Normalise PageRank
    if pr:
        vals = list(pr.values())
        mn, mx = min(vals), max(vals)
        rng = mx - mn if mx > mn else 1.0
        pr_n = {d: (s - mn) / rng for d, s in pr.items()}
    else:
        pr_n = {}

    # Combine
    all_docs = set(bm25_n) | set(tfidf_n) | set(lm_n)
    combined: dict[int, float] = {}
    for doc_id in all_docs:
        score = (
            w.get("bm25", 0) * bm25_n.get(doc_id, 0)
            + w.get("tfidf", 0) * tfidf_n.get(doc_id, 0)
            + w.get("lm", 0) * lm_n.get(doc_id, 0)
            + w.get("pagerank", 0) * pr_n.get(doc_id, 0)
        )
        combined[doc_id] = score

    ranked = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
