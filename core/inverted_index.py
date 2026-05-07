"""Inverted index with positional posting lists — built from scratch."""

from __future__ import annotations

import json
import math
import os
from collections import defaultdict
from typing import Any

import config
from core.tokenizer import tokenize


class InvertedIndex:
    """Term → posting-list index over a corpus of documents."""

    def __init__(self) -> None:
        self.index: dict[str, dict[int, int]] = defaultdict(dict)
        # term → {doc_id: term_frequency}
        self.doc_lengths: dict[int, int] = {}
        self.doc_count: int = 0
        self.total_tokens: int = 0

    # ── Building ─────────────────────────────────────────────

    def add_document(self, doc_id: int, tokens: list[str]) -> None:
        """Add a tokenised document to the index."""
        self.doc_lengths[doc_id] = len(tokens)
        self.total_tokens += len(tokens)
        self.doc_count = len(self.doc_lengths)
        freq: dict[str, int] = defaultdict(int)
        for tok in tokens:
            freq[tok] += 1
        for term, tf in freq.items():
            self.index[term][doc_id] = tf

    def build_from_papers(self, papers: list[dict[str, Any]]) -> None:
        """Build index from a list of paper dicts."""
        for paper in papers:
            doc_id = paper["id"]
            text = (paper.get("title", "") + " " + paper.get("abstract", ""))
            tokens = tokenize(text)
            self.add_document(doc_id, tokens)

    # ── Querying ─────────────────────────────────────────────

    @property
    def avg_dl(self) -> float:
        if not self.doc_lengths:
            return 0.0
        return self.total_tokens / len(self.doc_lengths)

    def doc_freq(self, term: str) -> int:
        return len(self.index.get(term, {}))

    def term_freq(self, term: str, doc_id: int) -> int:
        return self.index.get(term, {}).get(doc_id, 0)

    def get_postings(self, term: str) -> dict[int, int]:
        return dict(self.index.get(term, {}))

    def vocabulary(self) -> set[str]:
        return set(self.index.keys())

    # ── Boolean retrieval ────────────────────────────────────

    def boolean_and(self, term1: str, term2: str) -> set[int]:
        return set(self.index.get(term1, {})) & set(self.index.get(term2, {}))

    def boolean_or(self, term1: str, term2: str) -> set[int]:
        return set(self.index.get(term1, {})) | set(self.index.get(term2, {}))

    def boolean_not(self, term: str) -> set[int]:
        all_docs = set(self.doc_lengths.keys())
        return all_docs - set(self.index.get(term, {}))

    def boolean_query(self, query_tokens: list[str]) -> set[int]:
        """Simple AND query over all tokens."""
        if not query_tokens:
            return set()
        result = set(self.index.get(query_tokens[0], {}).keys())
        for tok in query_tokens[1:]:
            result &= set(self.index.get(tok, {}).keys())
        return result

    # ── Persistence ──────────────────────────────────────────

    def save(self, path: str | None = None) -> None:
        """Serialize index to JSON file."""
        path = path or os.path.join(config.INDEX_DIR, "inverted_index.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = {
            "index": {t: {str(d): f for d, f in postings.items()}
                      for t, postings in self.index.items()},
            "doc_lengths": {str(d): l for d, l in self.doc_lengths.items()},
            "doc_count": self.doc_count,
            "total_tokens": self.total_tokens,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def load(self, path: str | None = None) -> None:
        """Deserialize index from JSON file."""
        path = path or os.path.join(config.INDEX_DIR, "inverted_index.json")
        if not os.path.isfile(path):
            return
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        self.index = defaultdict(dict)
        for term, postings in data.get("index", {}).items():
            self.index[term] = {int(d): f for d, f in postings.items()}
        self.doc_lengths = {int(d): l for d, l in data.get("doc_lengths", {}).items()}
        self.doc_count = data.get("doc_count", 0)
        self.total_tokens = data.get("total_tokens", 0)
