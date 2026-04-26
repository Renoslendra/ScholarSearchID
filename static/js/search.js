/**
 * search.js — Search input handling and redirection
 */
(function () {
  'use strict';

  /* ---- Home page search form ---- */
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('search-input');
      const q = input ? input.value.trim() : '';
      if (!q) return;
      const mode = document.querySelector('.mode-btn.active');
      const target = mode && mode.dataset.mode === 'answer' ? '/citation' : '/search';
      window.location.href = target + '?q=' + encodeURIComponent(q);
    });
  }

  /* ---- Search results page: read query param ---- */
  const queryText = document.getElementById('query-text');
  if (queryText) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      queryText.textContent = '"' + q + '"';
      document.title = q + ' — ScholarSearch ID';
    }
    // Populate nav search with current query
    const navSearch = document.getElementById('nav-search');
    if (navSearch && q) navSearch.value = q;
  }

  /* ---- Filter button toggle ---- */
  const filterBtn = document.getElementById('filter-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      filterBtn.style.opacity = filterBtn.style.opacity === '0.5' ? '1' : '0.5';
    });
  }

  /* ---- Pagination ---- */
  const pagination = document.getElementById('pagination');
  if (pagination) {
    pagination.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        pagination.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
})();
