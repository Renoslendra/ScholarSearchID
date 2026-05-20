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
            ? (typeof t === 'function' ? t('answer.placeholder') : 'Tanyakan pertanyaan tentang kesehatan masyarakat...')
            : (typeof t === 'function' ? t('hero.search_placeholder') : 'Cari paper kesehatan, stunting, gizi, epidemiologi...');
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


  /* ---- State preservation across tabs ---- */
  const params = new URLSearchParams(window.location.search);
  const currentQ = params.get('q');
  
  // Save current query if exists
  if (currentQ) {
    sessionStorage.setItem('lastQuery', currentQ);
  }
  
  // Retrieve last query and populate nav links
  const lastQ = sessionStorage.getItem('lastQuery');
  if (lastQ) {
    document.querySelectorAll('.navbar-nav a').forEach(link => {
      let href = link.getAttribute('href');
      // Strip existing query params if any
      if (href.includes('?')) href = href.split('?')[0];
      
      if (href === '/search' || href === '/citation' || href === '/lab') {
        link.href = href + '?q=' + encodeURIComponent(lastQ);
      }
    });
    
    // Pre-fill nav search if present
    const navSearch = document.getElementById('nav-search');
    if (navSearch && !navSearch.value) {
      navSearch.value = lastQ;
    }
  }

  /* ---- Responsive mobile navigation ---- */
  function createIcon(name) {
    if (name === 'search') {
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    }
    return '';
  }

  function getDefaultLinks() {
    return [
      { href: '/', text: 'Home' },
      { href: '/search', text: 'Search' },
      { href: '/citation', text: 'Answer' },
      { href: '/library', text: 'Library' },
      { href: '/lab', text: 'Lab' }
    ];
  }

  function i18nKeyForHref(href) {
    const clean = (href || '').split('?')[0];
    if (clean === '/search') return 'nav.search';
    if (clean === '/citation') return 'nav.answer';
    if (clean === '/library') return 'nav.library';
    if (clean === '/lab') return 'nav.lab';
    return '';
  }

  function getLinksForNav(nav) {
    const links = [];
    const seen = new Set();

    function addLink(href, text) {
      if (!href || href.startsWith('#') || seen.has(href)) return;
      seen.add(href);
      links.push({ href, text: (text || href).trim() });
    }

    addLink('/', 'Home');
    nav.querySelectorAll('.navbar-nav a').forEach(link => {
      addLink(link.getAttribute('href'), link.textContent);
    });

    return links.length > 1 ? links : getDefaultLinks();
  }

  function createMobilePanel(nav, links) {
    const panel = document.createElement('div');
    panel.className = 'mobile-menu-panel';

    const searchForm = document.createElement('form');
    searchForm.className = 'mobile-menu-search';
    searchForm.setAttribute('role', 'search');
    searchForm.innerHTML =
      '<input type="search" aria-label="Search papers" placeholder="' + (typeof t === 'function' ? t('hero.search_placeholder') : 'Cari paper kesehatan, stunting, gizi, epidemiologi...') + '" autocomplete="off">' +
      '<button type="submit" aria-label="Search">' + createIcon('search') + '</button>';
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchForm.querySelector('input').value.trim();
      window.location.href = q ? '/search?q=' + encodeURIComponent(q) : '/search';
    });
    panel.appendChild(searchForm);

    const list = document.createElement('div');
    list.className = 'mobile-menu-links';
    links.forEach(item => {
      const link = document.createElement('a');
      link.className = 'mobile-menu-link';
      link.href = item.href;
      link.textContent = item.text;
      const i18nKey = i18nKeyForHref(item.href);
      if (i18nKey) link.setAttribute('data-i18n', i18nKey);
      const linkPath = new URL(link.href, window.location.origin).pathname;
      if (linkPath === path || (path === '/' && linkPath === '/')) {
        link.classList.add('active');
      }
      list.appendChild(link);
    });
    panel.appendChild(list);

    const actions = document.createElement('div');
    actions.className = 'mobile-menu-actions';
    const dropdownItems = nav.querySelectorAll('.user-menu .dropdown-item');
    const profileShortcut = nav.querySelector('.user-profile-nav');
    const signInButton = nav.querySelector('.btn-signin');

    if (dropdownItems.length) {
      dropdownItems.forEach(item => {
        const link = document.createElement('a');
        link.className = 'mobile-menu-action' + (item.classList.contains('dropdown-item--danger') ? ' danger' : '');
        link.href = item.getAttribute('href') || '#';
        link.textContent = item.textContent.trim();
        actions.appendChild(link);
      });
    } else if (profileShortcut) {
      const link = document.createElement('a');
      link.className = 'mobile-menu-action';
      link.href = '/profile';
      link.textContent = profileShortcut.textContent.trim() || 'Profile';
      actions.appendChild(link);
    } else if (signInButton) {
      const signIn = document.createElement('a');
      signIn.className = 'mobile-menu-action';
      signIn.href = '/signin';
      signIn.textContent = signInButton.textContent.trim() || 'Sign In';
      signIn.setAttribute('data-i18n', 'nav.signin');
      actions.appendChild(signIn);

      const register = document.createElement('a');
      register.className = 'mobile-menu-action';
      register.href = '/register';
      register.textContent = 'Register';
      register.setAttribute('data-i18n', 'nav.signup');
      actions.appendChild(register);
    } else if (nav.classList.contains('home-mobile-navbar')) {
      const signIn = document.createElement('a');
      signIn.className = 'mobile-menu-action';
      signIn.href = '/signin';
      signIn.textContent = 'Sign In';
      signIn.setAttribute('data-i18n', 'nav.signin');
      actions.appendChild(signIn);

      const register = document.createElement('a');
      register.className = 'mobile-menu-action';
      register.href = '/register';
      register.textContent = 'Register';
      register.setAttribute('data-i18n', 'nav.signup');
      actions.appendChild(register);
    }

    if (actions.children.length) {
      panel.appendChild(actions);
    }

    return panel;
  }

  function attachMobileMenu(nav) {
    if (!nav || nav.dataset.mobileReady === 'true') return;
    nav.dataset.mobileReady = 'true';

    const links = getLinksForNav(nav);
    const btn = document.createElement('button');
    const panelId = 'mobile-menu-' + Math.random().toString(36).slice(2);
    btn.type = 'button';
    btn.className = 'mobile-menu-toggle';
    btn.setAttribute('aria-label', 'Open navigation menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panelId);
    btn.innerHTML = '<span></span><span></span><span></span>';

    const panel = createMobilePanel(nav, links);
    panel.id = panelId;
    nav.appendChild(btn);
    nav.appendChild(panel);

    function setOpen(open) {
      document.querySelectorAll('.navbar.mobile-menu-open, .home-mobile-navbar.mobile-menu-open').forEach(other => {
        if (other !== nav) {
          other.classList.remove('mobile-menu-open');
          const otherBtn = other.querySelector('.mobile-menu-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });
      nav.classList.toggle('mobile-menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      document.body.classList.toggle('mobile-menu-lock', open);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!nav.classList.contains('mobile-menu-open'));
    });

    panel.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  function injectHomeMobileNav() {
    const hero = document.getElementById('hero');
    if (!hero || document.querySelector('.navbar')) return;
  }

  function initResponsiveNavigation() {
    document.querySelectorAll('.navbar').forEach(attachMobileMenu);
  }

  initResponsiveNavigation();

  /* ---- Load Security Module ---- */
  const secScript = document.createElement('script');
  secScript.src = '/static/security/security.js';
  document.head.appendChild(secScript);
})();
