"""Query likelihood language model with smoothing — from scratch."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

import config


def rank_language_model(
    query_tokens: list[str],
    index: "InvertedIndex",
    *,
    method: str = "jelinek-mercer",
    lam: float = config.LM_LAMBDA,
    mu: float = config.LM_MU,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Score documents using a unigram language model.

    Methods:
      - jelinek-mercer: P(t|d) = λ·P_ml(t|d) + (1-λ)·P(t|C)
      - dirichlet:      P(t|d) = (tf + μ·P(t|C)) / (|d| + μ)
    """
    if not query_tokens or index.doc_count == 0:
        return []

    total_tokens = index.total_tokens or 1
    scores: dict[int, float] = {}

    # Candidate docs
    candidates: set[int] = set()
    for t in query_tokens:
        candidates |= set(index.get_postings(t).keys())

    for doc_id in candidates:
        dl = index.doc_lengths.get(doc_id, 1)
        log_prob = 0.0
        for term in query_tokens:
            tf = index.term_freq(term, doc_id)
            # Collection probability
            cf = sum(index.get_postings(term).values())
            p_collection = cf / total_tokens if total_tokens > 0 else 1e-9

            if method == "dirichlet":
                p = (tf + mu * p_collection) / (dl + mu)
            else:  # jelinek-mercer
                p_ml = tf / dl if dl > 0 else 0
                p = lam * p_ml + (1 - lam) * p_collection

            if p > 0:
                log_prob += math.log(p)
            else:
                log_prob += math.log(1e-10)

        scores[doc_id] = log_prob

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
