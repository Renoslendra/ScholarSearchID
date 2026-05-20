"""Simplified semantic retrieval using keyword-overlap heuristic.

A full implementation would use sentence-transformers for embedding-based
search. This module provides a lightweight fallback that approximates
semantic similarity using Jaccard + keyword overlap scoring, so the API
contract remains the same and the UI works immediately.

Performance: papers are pre-tokenized once and cached in memory so
subsequent queries skip the expensive tokenize() step entirely.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex

import config
from core.tokenizer import tokenize


# ── Pre-tokenized paper cache (built once, reused every query) ──
_paper_token_cache: dict[int, set[str]] = {}


def _ensure_paper_tokens(papers: list[dict[str, Any]]) -> None:
    """Tokenize all papers once and cache the token sets."""
    global _paper_token_cache
    if _paper_token_cache:
        return  # Already built
    for paper in papers:
        doc_id = paper["id"]
        text = (paper.get("title", "") + " " + paper.get("abstract", ""))
        _paper_token_cache[doc_id] = set(tokenize(text))


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def rank_semantic(
    query_tokens: list[str],
    index: "InvertedIndex",
    papers: list[dict[str, Any]],
    *,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Score documents by token-level Jaccard similarity.

    This is a placeholder for true dense retrieval (e.g. Sentence-BERT).
    The API shape is identical so the caller does not need to change when
    a proper embedding model is integrated later.
    """
    if not query_tokens:
        return []

    # Pre-tokenize papers (only on first call, then cached)
    _ensure_paper_tokens(papers)

    q_set = set(query_tokens)
    scores: list[tuple[int, float]] = []

    for doc_id, doc_tokens in _paper_token_cache.items():
        sim = _jaccard(q_set, doc_tokens)
        if sim > 0:
            scores.append((doc_id, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]
