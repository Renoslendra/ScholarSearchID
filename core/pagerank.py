"""PageRank and HITS — implemented from scratch."""

from __future__ import annotations

from collections import defaultdict

import config


def compute_pagerank(
    edges: list[tuple[int, int]],
    *,
    damping: float = config.PAGERANK_DAMPING,
    iterations: int = config.PAGERANK_ITERATIONS,
) -> dict[int, float]:
    """Compute PageRank scores from a list of (src, dst) edges.

    Returns a mapping node_id → score.
    """
    # Build adjacency
    out_links: dict[int, list[int]] = defaultdict(list)
    nodes: set[int] = set()
    for src, dst in edges:
        out_links[src].append(dst)
        nodes.add(src)
        nodes.add(dst)

    if not nodes:
        return {}

    N = len(nodes)
    pr: dict[int, float] = {n: 1.0 / N for n in nodes}

    for _ in range(iterations):
        new_pr: dict[int, float] = {}
        for node in nodes:
            rank_sum = 0.0
            # Find all nodes that point TO this node
            for src, dst in edges:
                if dst == node:
                    out_degree = len(out_links[src]) or 1
                    rank_sum += pr[src] / out_degree
            new_pr[node] = (1 - damping) / N + damping * rank_sum
        pr = new_pr

    return pr


def compute_hits(
    edges: list[tuple[int, int]],
    iterations: int = 20,
) -> tuple[dict[int, float], dict[int, float]]:
    """Compute HITS hub and authority scores.

    Returns (hub_scores, authority_scores).
    """
    nodes: set[int] = set()
    for src, dst in edges:
        nodes.add(src)
        nodes.add(dst)

    if not nodes:
        return {}, {}

    hub: dict[int, float] = {n: 1.0 for n in nodes}
    auth: dict[int, float] = {n: 1.0 for n in nodes}

    for _ in range(iterations):
        # Update authority
        new_auth: dict[int, float] = {n: 0.0 for n in nodes}
        for src, dst in edges:
            new_auth[dst] += hub[src]
        # Normalise
        norm = max(sum(v * v for v in new_auth.values()) ** 0.5, 1e-10)
        auth = {n: v / norm for n, v in new_auth.items()}

        # Update hub
        new_hub: dict[int, float] = {n: 0.0 for n in nodes}
        for src, dst in edges:
            new_hub[src] += auth[dst]
        norm = max(sum(v * v for v in new_hub.values()) ** 0.5, 1e-10)
        hub = {n: v / norm for n, v in new_hub.items()}

    return hub, auth
