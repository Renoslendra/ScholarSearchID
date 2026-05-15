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

document.addEventListener('DOMContentLoaded', () => {
    const AUTOCOMPLETE_STORAGE_KEY = 'scholarsearch.autocomplete.titles.v1';
    const AUTOCOMPLETE_LIMIT = 8;
    const AUTOCOMPLETE_MIN_CHARS = 2;
    let _acCache = Object.create(null);
    let _acTitleIndex = [];
    let _acTitlesReady = false;
    let _acPreloadPromise = null;

    function normalizeText(text) {
      return String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function setAutocompleteTitles(titles) {
      const unique = [];
      const seen = new Set();
      titles.forEach(title => {
        const cleanTitle = String(title || '').trim();
        if (!cleanTitle || seen.has(cleanTitle)) return;
        seen.add(cleanTitle);
        unique.push(cleanTitle);
      });

      _acTitleIndex = unique.map(title => ({
        title,
        normalized: normalizeText(title)
      }));
      _acTitlesReady = _acTitleIndex.length > 0;
      _acCache = Object.create(null);
    }

    function loadStoredAutocomplete() {
      try {
        const cached = JSON.parse(localStorage.getItem(AUTOCOMPLETE_STORAGE_KEY) || '{}');
        if (Array.isArray(cached.titles)) {
          setAutocompleteTitles(cached.titles);
        }
      } catch {
        // Ignore broken local autocomplete cache.
      }
    }

    function preloadAutocomplete() {
      if (_acPreloadPromise) return _acPreloadPromise;

      _acPreloadPromise = fetch('/api/autocomplete/bootstrap', { cache: 'force-cache' })
        .then(resp => resp.ok ? resp.json() : null)
        .then(data => {
          if (!data || !Array.isArray(data.titles)) return;
          setAutocompleteTitles(data.titles);
          try {
            localStorage.setItem(AUTOCOMPLETE_STORAGE_KEY, JSON.stringify({
              version: data.version || data.titles.length,
              titles: data.titles
            }));
          } catch {
            // Local storage can be full or disabled; autocomplete still works via memory/API.
          }
        })
        .catch(() => {});

      return _acPreloadPromise;
    }

    function getLocalSuggestions(query, limit = AUTOCOMPLETE_LIMIT) {
      const normalizedQuery = normalizeText(query);
      if (normalizedQuery.length < AUTOCOMPLETE_MIN_CHARS || !_acTitleIndex.length) {
        return [];
      }

      const terms = normalizedQuery.split(' ').filter(Boolean);
      const singleTerm = terms.length === 1;
      const matches = [];
      const seen = new Set();

      function add(item) {
        if (seen.has(item.title)) return matches.length >= limit;
        seen.add(item.title);
        matches.push(item.title);
        return matches.length >= limit;
      }

      if (singleTerm) {
        for (const item of _acTitleIndex) {
          const words = item.normalized.split(' ');
          if (words.some(word => word.startsWith(normalizedQuery)) && add(item)) {
            return matches;
          }
        }
      }

      for (const item of _acTitleIndex) {
        if (seen.has(item.title)) continue;
        if (terms.every(term => item.normalized.includes(term)) && add(item)) {
          break;
        }
      }

      return matches;
    }

    async function fetchSuggestions(query, signal) {
      const cacheKey = normalizeText(query);
      if (_acCache[cacheKey]) return _acCache[cacheKey];

      const localMatches = getLocalSuggestions(query);
      if (localMatches.length || _acTitlesReady) {
        _acCache[cacheKey] = localMatches;
        return localMatches;
      }

      try {
        const resp = await fetch('/api/autocomplete?q=' + encodeURIComponent(query) + '&limit=' + AUTOCOMPLETE_LIMIT, { signal });
        const data = await resp.json();
        const suggestions = data.suggestions || [];
        _acCache[cacheKey] = suggestions;
        return suggestions;
      } catch (err) {
        if (err && err.name === 'AbortError') throw err;
        return [];
      }
    }

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function escapeRegExp(text) {
      return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function setupAutocomplete(inputId, containerClass) {
      const searchInput = document.getElementById(inputId);
      const searchBox = document.querySelector(containerClass);

      if (!searchInput || !searchBox) return;

      const suggestionsBox = document.createElement('div');
      suggestionsBox.className = 'search-suggestions';
      searchBox.appendChild(suggestionsBox);

      function hideSuggestions() {
        suggestionsBox.innerHTML = '';
        suggestionsBox.classList.remove('active');
        searchBox.classList.remove('has-suggestions');
      }

      function renderSuggestions(matches, query) {
        suggestionsBox.innerHTML = '';
        if (!matches.length) {
          hideSuggestions();
          return;
        }

        const terms = normalizeText(query).split(' ').filter(Boolean).map(escapeRegExp);
        const regex = terms.length ? new RegExp('(' + terms.join('|') + ')', 'gi') : null;
        const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
        const fragment = document.createDocumentFragment();

        matches.forEach(match => {
          const div = document.createElement('div');
          div.className = 'suggestion-item';

          const safeMatch = escapeHtml(match);
          const highlightedText = regex
            ? safeMatch.replace(regex, '<span class="suggestion-match">$1</span>')
            : safeMatch;

          div.innerHTML = `${icon}<span class="suggestion-text">${highlightedText}</span>`;
          div.addEventListener('click', () => {
            searchInput.value = match;
            hideSuggestions();
            searchInput.focus();
          });
          fragment.appendChild(div);
        });

        suggestionsBox.appendChild(fragment);
        suggestionsBox.classList.add('active');
        searchBox.classList.add('has-suggestions');
      }

      const searchIcon = searchBox.querySelector('svg');
      if (searchIcon) {
        searchIcon.style.cursor = 'pointer';

        searchIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          const q = searchInput.value.trim();
          if (!q) return;

          if (inputId === 'nav-search') {
            const targetUrl = window.location.pathname.includes('/citation') ? '/citation' : '/search';
            window.location.href = targetUrl + '?q=' + encodeURIComponent(q);
          } else {
            const form = document.getElementById('search-form');
            if (form) {
              if (typeof form.requestSubmit === 'function') {
                form.requestSubmit();
              } else {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }
          }
        });
      }

      let requestId = 0;
      let abortController = null;

      searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        const normalizedQuery = normalizeText(query);
        requestId += 1;

        if (abortController) {
          abortController.abort();
          abortController = null;
        }

        if (normalizedQuery.length < AUTOCOMPLETE_MIN_CHARS) {
          hideSuggestions();
          return;
        }

        const localMatches = getLocalSuggestions(query);
        if (localMatches.length || _acTitlesReady) {
          renderSuggestions(localMatches, query);
          return;
        }

        const currentRequest = requestId;
        abortController = new AbortController();
        fetchSuggestions(query, abortController.signal)
          .then(matches => {
            if (currentRequest !== requestId || normalizeText(searchInput.value) !== normalizedQuery) return;
            renderSuggestions(matches, searchInput.value.trim());
          })
          .catch(err => {
            if (!err || err.name !== 'AbortError') hideSuggestions();
          });
      });

      searchInput.addEventListener('focus', function () {
        const query = this.value.trim();
        if (normalizeText(query).length >= AUTOCOMPLETE_MIN_CHARS && _acTitlesReady) {
          renderSuggestions(getLocalSuggestions(query), query);
        }
      });

      document.addEventListener('click', function (e) {
        if (!searchBox.contains(e.target)) {
          hideSuggestions();
        }
      });

      if (inputId === 'nav-search') {
        searchInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter' && this.value.trim()) {
            e.preventDefault();
            if (window.location.pathname.includes('/citation')) {
              return;
            }
            window.location.href = '/search?q=' + encodeURIComponent(this.value.trim());
          }
        });
      }
    }

    loadStoredAutocomplete();
    preloadAutocomplete();
    setupAutocomplete('search-input', '.search-box');
    setupAutocomplete('nav-search', '.navbar-search');
  });
  /* ---- MEMBACA URL UNTUK MENGEMBALIKAN TEKS PENCARIAN ---- */
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');

  if (q) {
    // 1. Kembalikan teks ke kotak navbar
    const navSearch = document.getElementById('nav-search');
    if (navSearch) navSearch.value = q;

    // 2. Ganti teks H1 di halaman Search
    const queryText = document.getElementById('query-text');
    if (queryText) {
      queryText.textContent = '"' + q + '"';
      document.title = q + ' — ScholarSearch ID';
    }

    // 3. Ganti teks Query di halaman Answer
    const answerQuery = document.querySelector('.answer-query strong');
    if (answerQuery) {
      answerQuery.textContent = 'Query: ' + q;
    }

    // 4. Update navbar links to preserve query across pages
    const navLinks = document.querySelectorAll('.navbar-nav a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === '/search' || href === '/citation') {
        link.href = href + '?q=' + encodeURIComponent(q);
      }
    });
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
