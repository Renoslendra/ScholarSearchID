/**
 * citation_graph.js — Simulated citation graph / reference interactions
 */
(function () {
  'use strict';

  /* ---- Ref card hover effects ---- */
  const refCards = document.querySelectorAll('.ref-card');
  refCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const num = card.querySelector('.ref-num');
      if (num) num.style.transform = 'scale(1.1)';
    });
    card.addEventListener('mouseleave', () => {
      const num = card.querySelector('.ref-num');
      if (num) num.style.transform = 'scale(1)';
    });
  });

  /* ---- Ref link scroll-to ---- */
  document.querySelectorAll('.ref-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href').replace('#', '');
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.borderColor = '#3b82f6';
        setTimeout(() => { target.style.borderColor = ''; }, 2000);
      }
    });
  });

  /* ---- Query param ---- */
  const answerQuery = document.querySelector('.answer-query');
  if (answerQuery) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      answerQuery.innerHTML = '<strong>Query: ' + q + '</strong>';
    }
  }
})();
