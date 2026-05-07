"""Core IR modules for ScholarSearchID."""

from core.tokenizer import tokenize, tokenize_query
from core.inverted_index import InvertedIndex
from core.bm25 import rank_bm25
from core.tfidf import rank_tfidf, get_tfidf_weights
from core.spelling import suggest, suggest_query
from core.language_model import rank_language_model
from core.query_expansion import expand_query, rocchio_expand
from core.semantic_search import rank_semantic
from core.pagerank import compute_pagerank, compute_hits
from core.evaluation import evaluate_ranking, precision_at_k, ndcg_at_k
from core.learning_to_rank import rank_l2r
from core.neural_ranker import rerank_neural
from core.index_builder import load_or_build_index, build_index

__all__ = [
    "tokenize", "tokenize_query",
    "InvertedIndex",
    "rank_bm25", "rank_tfidf", "get_tfidf_weights",
    "suggest", "suggest_query",
    "rank_language_model",
    "expand_query", "rocchio_expand",
    "rank_semantic",
    "compute_pagerank", "compute_hits",
    "evaluate_ranking", "precision_at_k", "ndcg_at_k",
    "rank_l2r",
    "rerank_neural",
    "load_or_build_index", "build_index",
]
