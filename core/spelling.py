"""Spelling correction using edit distance (Levenshtein) — from scratch.

Performance: vocabulary list and suggestion results are cached so
repeated queries and common typos are resolved instantly.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.inverted_index import InvertedIndex


# ── Spelling suggestion cache ──
_suggestion_cache: dict[str, list[str]] = {}
_SUGGESTION_CACHE_MAX = 1000


def _edit_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein edit distance between two strings."""
    m, n = len(s1), len(s2)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, n + 1):
            tmp = dp[j]
            if s1[i - 1] == s2[j - 1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j - 1])
            prev = tmp
    return dp[n]


def suggest(
    query: str,
    index: "InvertedIndex",
    *,
    max_distance: int = 2,
    max_suggestions: int = 3,
) -> list[str]:
    """Return spelling-correction suggestions for a single term.

    Compares *query* against the index vocabulary using Levenshtein
    distance and returns the closest matches.
    """
    query = query.lower().strip()
    if not query:
        return []

    # Check cache first
    if query in _suggestion_cache:
        return _suggestion_cache[query]

    vocab = index.vocabulary()
    if query in vocab:
        _suggestion_cache[query] = []
        return []  # already correct

    candidates: list[tuple[str, int, int]] = []
    for term in vocab:
        # Quick length filter — skip terms that can't possibly match
        if abs(len(term) - len(query)) > max_distance:
            continue
        # Quick first-char filter — most typos share first character
        if len(term) > 0 and len(query) > 0 and term[0] != query[0] and abs(len(term) - len(query)) > 1:
            continue
        dist = _edit_distance(query, term)
        if dist <= max_distance:
            candidates.append((term, dist, index.doc_freq(term)))

    # Sort by (distance ASC, doc_freq DESC)
    candidates.sort(key=lambda x: (x[1], -x[2]))
    result = [c[0] for c in candidates[:max_suggestions]]

    # Cache the result (evict oldest if full)
    if len(_suggestion_cache) >= _SUGGESTION_CACHE_MAX:
        _suggestion_cache.clear()
    _suggestion_cache[query] = result

    return result


def suggest_query(
    query_tokens: list[str],
    index: "InvertedIndex",
) -> str | None:
    """Return a corrected query string if any term has a closer match.

    If no corrections are needed, returns None.
    """
    vocab = index.vocabulary()  # Get once, not per-token
    corrected_tokens: list[str] = []
    changed = False
    for tok in query_tokens:
        if tok in vocab:
            corrected_tokens.append(tok)
        else:
            suggestions = suggest(tok, index)
            if suggestions:
                corrected_tokens.append(suggestions[0])
                changed = True
            else:
                corrected_tokens.append(tok)
    return " ".join(corrected_tokens) if changed else None
