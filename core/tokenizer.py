"""Tokenizer and Indonesian stemming for ScholarSearchID.

Uses Sastrawi (Nazief-Adriani algorithm) for Indonesian stemming,
with a graceful fallback to simple lowercasing when the library is
unavailable.
"""

from __future__ import annotations

import os
import re
import unicodedata

import config

# ── Load stopwords ───────────────────────────────────────────

_STOPWORDS: set[str] = set()


def _load_stopwords() -> set[str]:
    global _STOPWORDS
    if _STOPWORDS:
        return _STOPWORDS
    path = config.STOPWORDS_PATH
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            _STOPWORDS = {line.strip().lower() for line in f if line.strip()}
    return _STOPWORDS


# ── Stemmer (Sastrawi) ───────────────────────────────────────

try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _stemmer = StemmerFactory().create_stemmer()
except ImportError:
    _stemmer = None


def stem(word: str) -> str:
    """Stem a single Indonesian word."""
    if _stemmer is not None:
        return _stemmer.stem(word)
    return word.lower()


# ── Public API ───────────────────────────────────────────────

def tokenize(
    text: str,
    *,
    remove_stopwords: bool = True,
    do_stem: bool = True,
    min_length: int = 2,
) -> list[str]:
    """Tokenize *text* into a list of normalised tokens.

    Pipeline: NFD → lowercase → strip accents → split on non-alpha →
    remove stopwords → stem.
    """
    if not text:
        return []

    # Normalise unicode
    text = unicodedata.normalize("NFKD", text)
    text = text.lower()
    # Remove accents
    text = "".join(c for c in text if not unicodedata.combining(c))
    # Split on non-alphabetic characters
    tokens = re.findall(r"[a-z0-9]+", text)

    stopwords = _load_stopwords() if remove_stopwords else set()
    result: list[str] = []
    for tok in tokens:
        if len(tok) < min_length:
            continue
        if tok in stopwords:
            continue
        if do_stem:
            tok = stem(tok)
        if len(tok) >= min_length and tok not in stopwords:
            result.append(tok)
    return result


def tokenize_query(query: str) -> list[str]:
    """Tokenize a search query (lighter stemming, keep more tokens)."""
    return tokenize(query, remove_stopwords=True, do_stem=True, min_length=2)
