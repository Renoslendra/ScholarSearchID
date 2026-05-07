"""IR evaluation metrics — implemented from scratch."""

from __future__ import annotations

import math


def precision_at_k(relevances: list[int], k: int) -> float:
    """Precision@K: fraction of top-K results that are relevant."""
    if k <= 0:
        return 0.0
    top = relevances[:k]
    return sum(1 for r in top if r > 0) / k


def recall_at_k(relevances: list[int], k: int, total_relevant: int) -> float:
    """Recall@K: fraction of all relevant docs found in top-K."""
    if total_relevant <= 0:
        return 0.0
    top = relevances[:k]
    return sum(1 for r in top if r > 0) / total_relevant


def f1_at_k(relevances: list[int], k: int, total_relevant: int) -> float:
    """F1@K: harmonic mean of precision and recall at K."""
    p = precision_at_k(relevances, k)
    r = recall_at_k(relevances, k, total_relevant)
    if p + r == 0:
        return 0.0
    return 2 * p * r / (p + r)


def average_precision(relevances: list[int]) -> float:
    """Average Precision for a single query."""
    hits = 0
    sum_prec = 0.0
    for i, r in enumerate(relevances, 1):
        if r > 0:
            hits += 1
            sum_prec += hits / i
    return sum_prec / hits if hits > 0 else 0.0


def mean_average_precision(queries_relevances: list[list[int]]) -> float:
    """MAP: mean of average precisions across queries."""
    if not queries_relevances:
        return 0.0
    return sum(average_precision(r) for r in queries_relevances) / len(queries_relevances)


def dcg_at_k(relevances: list[int], k: int) -> float:
    """Discounted Cumulative Gain at K."""
    total = 0.0
    for i, r in enumerate(relevances[:k], 1):
        total += (2 ** r - 1) / math.log2(i + 1)
    return total


def ndcg_at_k(relevances: list[int], k: int) -> float:
    """Normalised DCG at K."""
    dcg = dcg_at_k(relevances, k)
    ideal = sorted(relevances, reverse=True)
    idcg = dcg_at_k(ideal, k)
    return dcg / idcg if idcg > 0 else 0.0


def mrr(queries_first_relevant: list[int]) -> float:
    """Mean Reciprocal Rank.

    *queries_first_relevant* is a list of 1-indexed positions where the
    first relevant doc appears (0 if none found).
    """
    if not queries_first_relevant:
        return 0.0
    total = 0.0
    for pos in queries_first_relevant:
        if pos > 0:
            total += 1.0 / pos
    return total / len(queries_first_relevant)


def evaluate_ranking(
    ranked_doc_ids: list[int],
    judgments: dict[int, int],
    k: int = 10,
) -> dict[str, float]:
    """Convenience function: compute all metrics for a single query.

    Parameters
    ----------
    ranked_doc_ids : ordered list of document IDs (best first).
    judgments      : {doc_id: relevance} ground-truth.
    k              : cutoff.
    """
    relevances = [judgments.get(d, 0) for d in ranked_doc_ids]
    total_relevant = sum(1 for v in judgments.values() if v > 0)

    # Compute MRR: find position of first relevant doc
    first_rel_pos = 0
    for i, r in enumerate(relevances, 1):
        if r > 0:
            first_rel_pos = i
            break
    mrr_val = (1.0 / first_rel_pos) if first_rel_pos > 0 else 0.0

    return {
        "p_at_5": round(precision_at_k(relevances, 5), 4),
        "p_at_10": round(precision_at_k(relevances, 10), 4),
        "precision_at_k": round(precision_at_k(relevances, k), 4),
        "recall_at_k": round(recall_at_k(relevances, k, total_relevant), 4),
        "f1_at_k": round(f1_at_k(relevances, k, total_relevant), 4),
        "map": round(average_precision(relevances), 4),
        "ndcg": round(ndcg_at_k(relevances, k), 4),
        "ndcg_at_10": round(ndcg_at_k(relevances, 10), 4),
        "mrr": round(mrr_val, 4),
    }
