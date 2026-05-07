"""Index builder — construct all IR data structures from the database."""

from __future__ import annotations

import database
from core.inverted_index import InvertedIndex


def build_index(db_path: str | None = None) -> InvertedIndex:
    """Build (or rebuild) the inverted index from the paper database."""
    papers = database.get_all_papers(db_path)
    idx = InvertedIndex()
    idx.build_from_papers(papers)
    idx.save()
    print(f"  Index built: {idx.doc_count} docs, {len(idx.vocabulary())} terms")
    return idx


def load_or_build_index(db_path: str | None = None) -> InvertedIndex:
    """Load a persisted index, or build one if not available."""
    idx = InvertedIndex()
    idx.load()
    if idx.doc_count > 0:
        return idx
    return build_index(db_path)


if __name__ == "__main__":
    build_index()
