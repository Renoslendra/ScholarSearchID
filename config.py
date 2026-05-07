"""Project configuration for ScholarSearchID."""

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# ── Data paths ──────────────────────────────────────────────
DATABASE_PATH = os.path.join(DATA_DIR, "scholarsearch.db")
PAPERS_PATH = os.path.join(DATA_DIR, "papers.json")
CITATIONS_PATH = os.path.join(DATA_DIR, "citations.json")
STOPWORDS_PATH = os.path.join(DATA_DIR, "stopwords_id.txt")
INDEX_DIR = os.path.join(DATA_DIR, "index")

# ── Garuda scraping settings ───────────────────────────────
GARUDA_BASE_URL = "https://garuda.kemdiktisaintek.go.id"
CS_IT_AREA_ID = 60
SCRAPE_DELAY = 1.5          # seconds between requests
DEFAULT_SCRAPE_LIMIT = 1000  # max papers to collect
SCRAPE_JOURNAL_PAGES = 50   # pages of journal list to crawl
USER_AGENT = (
    "ScholarSearchID/1.0 "
    "(Academic Research Project; Universitas Trunojoyo Madura)"
)

# ── IR defaults ─────────────────────────────────────────────
DEFAULT_TOP_K = 10
BM25_K1 = 1.5
BM25_B = 0.75
LM_LAMBDA = 0.7             # Jelinek-Mercer smoothing
LM_MU = 2000                # Dirichlet smoothing
PAGERANK_DAMPING = 0.85
PAGERANK_ITERATIONS = 50

# ── API pagination ──────────────────────────────────────────
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50

# ── LLM (OpenRouter) ───────────────────────────────────────
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = "tencent/hy3-preview:free"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
LLM_TIMEOUT = 60  # seconds (reasoning models need more time)
