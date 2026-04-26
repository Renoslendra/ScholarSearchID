/**
 * app.js — Global UI interactions for ScholarSearch ID
 */
(function () {
  'use strict';

  /* ---- Navbar scroll effect ---- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > 8) {
        navbar.style.boxShadow = '0 1px 8px rgba(0,0,0,0.4)';
      } else {
        navbar.style.boxShadow = 'none';
      }
      lastScroll = y;
    }, { passive: true });
  }

  /* ---- Active nav link highlight ---- */
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-nav a').forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (href === path || (path === '/' && href === '/')) {
      link.classList.add('active');
    }
  });

  /* ---- Mode toggle (index page) ---- */
  const modeToggle = document.getElementById('mode-toggle');
  if (modeToggle) {
    const btns = modeToggle.querySelectorAll('.mode-btn');
    const searchForm = document.getElementById('search-form');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        if (searchForm) {
          searchForm.action = mode === 'answer' ? '/citation' : '/search';
        }
        const input = document.getElementById('search-input');
        if (input) {
          input.placeholder = mode === 'answer'
            ? 'Ask a research question...'
            : 'Ask a question or search for papers...';
        }
      });
    });
  }

  /* ---- Copy button (answer page) ---- */
  const btnCopy = document.getElementById('btn-copy');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const body = document.querySelector('.answer-body');
      if (body) {
        navigator.clipboard.writeText(body.innerText).then(() => {
          btnCopy.style.color = '#22c55e';
          setTimeout(() => { btnCopy.style.color = ''; }, 1500);
        });
      }
    });
  }

  /* ---- Save button (answer page) ---- */
  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      btnSave.style.color = btnSave.style.color === 'rgb(37, 99, 235)' ? '' : '#2563eb';
    });
  }

  /* ---- Navbar search submit ---- */
  const navSearch = document.getElementById('nav-search');
  if (navSearch) {
    navSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && navSearch.value.trim()) {
        window.location.href = '/search?q=' + encodeURIComponent(navSearch.value.trim());
      }
    });
  }
})();
