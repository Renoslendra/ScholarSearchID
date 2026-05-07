"""LLM answer generation with inline citations — powered by OpenRouter.

Sends retrieved paper contexts to an LLM (tencent/hy3-preview via OpenRouter)
to generate a synthesised, citation-backed answer.  Falls back to an extractive
snippet if the LLM call fails or times out.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

import config

log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
#  HELPER: build citation list from papers
# ═══════════════════════════════════════════════════════════════

def _build_citations(papers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build a numbered citation list from papers."""
    citations: list[dict[str, Any]] = []
    for i, paper in enumerate(papers, 1):
        authors = paper.get("authors", [])
        if isinstance(authors, list):
            author_str = ", ".join(authors[:3])
            if len(authors) > 3:
                author_str += " et al."
        else:
            author_str = str(authors)

        citations.append({
            "ref_num": i,
            "id": paper.get("id", 0),
            "title": paper.get("title", ""),
            "authors": author_str,
            "year": paper.get("year", ""),
            "journal": paper.get("journal", ""),
            "url": paper.get("url", ""),
        })
    return citations


# ═══════════════════════════════════════════════════════════════
#  LLM CALL via OpenRouter (OpenAI-compatible REST API)
# ═══════════════════════════════════════════════════════════════

def _call_llm(question: str, papers: list[dict[str, Any]], lang: str = "id") -> str | None:
    """Call OpenRouter chat completion and return the answer text.

    Returns None on any error so the caller can fall back gracefully.
    """
    if not config.OPENROUTER_API_KEY:
        return None

    # Build context block for the system prompt
    context_parts: list[str] = []
    for i, paper in enumerate(papers, 1):
        title = paper.get("title", "")
        abstract = paper.get("abstract", "").strip()
        authors = paper.get("authors", [])
        year = paper.get("year", "")
        journal = paper.get("journal", "")

        if isinstance(authors, list):
            author_str = ", ".join(authors[:3])
        else:
            author_str = str(authors)

        context_parts.append(
            f"[{i}] \"{title}\"\n"
            f"    Authors: {author_str} | Year: {year} | Journal: {journal}\n"
            f"    Abstract: {abstract}"
        )

    context_block = "\n\n".join(context_parts)

    if lang == "en":
        system_prompt = (
            "You are an academic research assistant named ScholarSearch AI. "
            "Your task is to answer the user's question based ONLY on "
            "the scientific papers provided below. "
            "Answer in clear and academic English. "
            "Include reference numbers [1], [2], etc. inline in your answer "
            "to indicate information sources. "
            "If the requested information is not available in the provided papers, "
            "state that the information is not available in the existing sources.\n\n"
            "=== CONTEXT PAPERS ===\n\n"
            f"{context_block}"
        )
    else:
        system_prompt = (
            "Kamu adalah asisten riset akademik bernama ScholarSearch AI. "
            "Tugasmu adalah menjawab pertanyaan pengguna berdasarkan HANYA pada "
            "paper-paper ilmiah yang diberikan di bawah ini. "
            "Jawab dalam Bahasa Indonesia yang jelas dan akademis. "
            "Sertakan nomor referensi [1], [2], dst. secara inline di dalam jawabanmu "
            "untuk menunjukkan sumber informasi. "
            "Jika informasi yang diminta tidak ada di paper yang diberikan, "
            "katakan bahwa informasi tersebut tidak tersedia dalam sumber yang ada.\n\n"
            "=== PAPER KONTEKS ===\n\n"
            f"{context_block}"
        )

    payload = {
        "model": config.OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "max_tokens": 4096,
        "temperature": 0.4,
        "reasoning": {"effort": "low"},  # minimize internal reasoning to get content
    }

    headers = {
        "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://scholarsearch.id",
        "X-Title": "ScholarSearchID",
    }

    try:
        resp = requests.post(
            config.OPENROUTER_BASE_URL,
            json=payload,
            headers=headers,
            timeout=config.LLM_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        # Extract content from OpenAI-compatible response
        choices = data.get("choices", [])
        if choices:
            msg = choices[0].get("message", {})
            content = msg.get("content") or ""

            if content and content.strip():
                log.info("LLM response received (%d chars)", len(content))
                return content.strip()

            # If content is null, the reasoning model spent all tokens
            # on internal thinking.  Do NOT expose the reasoning trace.
            log.info("LLM content was null (reasoning model); using extractive fallback")

        log.warning("LLM returned empty content")
        return None

    except requests.exceptions.Timeout:
        log.warning("LLM request timed out after %ds", config.LLM_TIMEOUT)
        return None
    except requests.exceptions.RequestException as e:
        log.warning("LLM request failed: %s", e)
        return None
    except (KeyError, ValueError) as e:
        log.warning("LLM response parsing error: %s", e)
        return None


# ═══════════════════════════════════════════════════════════════
#  EXTRACTIVE FALLBACK (no LLM needed)
# ═══════════════════════════════════════════════════════════════

def _extractive_fallback(
    papers: list[dict[str, Any]],
    citations: list[dict[str, Any]],
) -> str:
    """Build an extractive answer from paper abstracts."""
    parts: list[str] = []
    for i, paper in enumerate(papers, 1):
        abstract = paper.get("abstract", "").strip()
        if abstract:
            sentences = abstract.replace(". ", ".\n").split("\n")
            snippet = ". ".join(sentences[:2]).strip()
            if not snippet.endswith("."):
                snippet += "."
            parts.append(f"{snippet} [{i}]")

    if parts:
        return " ".join(parts)

    return "Berikut paper yang relevan: " + "; ".join(
        f'"{c["title"]}" ({c["year"]}) [{c["ref_num"]}]' for c in citations
    )


# ═══════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════

def generate_answer(
    question: str,
    contexts: list[dict[str, Any]],
    *,
    max_sources: int = 4,
    use_llm: bool = True,
    lang: str = "id",
) -> dict[str, Any]:
    """Generate an answer from the top retrieved papers.

    Parameters
    ----------
    question : the user's natural-language question.
    contexts : list of paper dicts (must have id, title, abstract, authors, year).
    use_llm  : if True, attempt to call OpenRouter LLM first.

    Returns
    -------
    dict with keys: answer (str), citations (list), source (str).
    """
    if not contexts:
        no_result_msg = (
            "Sorry, no relevant papers were found for this question."
            if lang == "en"
            else "Maaf, tidak ditemukan paper yang relevan untuk pertanyaan ini."
        )
        return {
            "answer": no_result_msg,
            "citations": [],
            "source": "none",
        }

    top = contexts[:max_sources]
    citations = _build_citations(top)

    # ── Try LLM first ──
    answer_text = None
    source = "extractive"

    if use_llm:
        answer_text = _call_llm(question, top, lang=lang)
        if answer_text:
            source = "llm"

    # ── Fallback to extractive ──
    if not answer_text:
        answer_text = _extractive_fallback(top, citations)
        source = "extractive"

    return {
        "answer": answer_text,
        "citations": citations,
        "source": source,  # "llm" or "extractive" — UI can show a badge
    }
