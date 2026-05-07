"""Simplified neural re-ranking stub.

A full implementation would use a cross-encoder (IndoBERT) to re-rank
BM25 candidates. This module provides a simplified re-ranking based on
exact-match boosting and title-preference, keeping the same API.
"""

from __future__ import annotations

from typing import Any

import config
from core.tokenizer import tokenize


def rerank_neural(
    query_tokens: list[str],
    candidates: list[tuple[int, float]],
    papers_by_id: dict[int, dict[str, Any]],
    *,
    top_k: int = config.DEFAULT_TOP_K,
) -> list[tuple[int, float]]:
    """Re-rank candidate results using title-match boosting.

    This is a lightweight stand-in for a cross-encoder (BERT).
    The API is designed so that swapping in a real model later
    requires no changes to callers.
    """
    if not candidates:
        return []

    q_set = set(query_tokens)
    rescored: list[tuple[int, float]] = []

    for doc_id, base_score in candidates:
        paper = papers_by_id.get(doc_id, {})
        title_tokens = set(tokenize(paper.get("title", "")))

        # Boost if query terms appear in title
        title_overlap = len(q_set & title_tokens) / max(len(q_set), 1)
        # Recency boost (newer papers get slight boost)
        year = paper.get("year") or 2020
        recency = min(max((year - 2015) / 10, 0), 1)

        adjusted = base_score * (1 + 0.3 * title_overlap + 0.1 * recency)
        rescored.append((doc_id, adjusted))

    rescored.sort(key=lambda x: x[1], reverse=True)
    return rescored[:top_k]
