/**
 * lab.js — IR Lab interactions and Precision-Recall chart rendering
 */
(function () {
  'use strict';

  /* ---- Run Evaluation button ---- */
  const btnRun = document.getElementById('btn-run');
  if (btnRun) {
    btnRun.addEventListener('click', () => {
      btnRun.textContent = 'Running...';
      btnRun.disabled = true;
      btnRun.style.opacity = '0.7';

      setTimeout(() => {
        // Simulate new random metrics
        const metrics = {
          map: (0.6 + Math.random() * 0.15).toFixed(3),
          ndcg: (0.65 + Math.random() * 0.15).toFixed(3),
          mrr: (0.75 + Math.random() * 0.12).toFixed(3),
          recall: (0.88 + Math.random() * 0.1).toFixed(3)
        };
        animateMetric('metric-map', metrics.map);
        animateMetric('metric-ndcg', metrics.ndcg);
        animateMetric('metric-mrr', metrics.mrr);
        animateMetric('metric-recall', metrics.recall);

        drawChart();

        btnRun.textContent = 'Run Evaluation';
        btnRun.disabled = false;
        btnRun.style.opacity = '1';
      }, 1200);
    });
  }

  function animateMetric(id, targetVal) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseFloat(el.textContent) || 0;
    const end = parseFloat(targetVal);
    const duration = 600;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = (start + (end - start) * ease).toFixed(3);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- Precision-Recall Chart ---- */
  function drawChart() {
    const canvas = document.getElementById('pr-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 20, right: 30, bottom: 30, left: 40 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = pad.left + (cw / 5) * i;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + ch); ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#71717a';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Recall', W / 2, H - 4);
    ctx.save();
    ctx.translate(12, pad.top + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Precision', 0, 0);
    ctx.restore();

    // Generate curves
    const curves = [
      { name: 'Hybrid (BM25+Dense)', color: '#2563eb', width: 3, points: generatePRCurve(0.92, 0.6) },
      { name: 'Dense (BERT)',        color: '#60a5fa', width: 2, points: generatePRCurve(0.88, 0.5) },
      { name: 'BM25 Baseline',       color: '#6b7280', width: 2, points: generatePRCurve(0.82, 0.35), dash: [6, 4] }
    ];

    curves.forEach(curve => {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = curve.width;
      ctx.setLineDash(curve.dash || []);
      ctx.beginPath();
      curve.points.forEach((p, i) => {
        const x = pad.left + p.recall * cw;
        const y = pad.top + (1 - p.precision) * ch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Legend
    const lx = W - pad.right - 180;
    const ly = pad.top + 10;
    ctx.fillStyle = 'rgba(20,20,20,0.85)';
    ctx.fillRect(lx, ly, 175, 70);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, 175, 70);

    curves.forEach((curve, i) => {
      const yy = ly + 16 + i * 20;
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = curve.width;
      ctx.setLineDash(curve.dash || []);
      ctx.beginPath(); ctx.moveTo(lx + 10, yy); ctx.lineTo(lx + 35, yy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ccc';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(curve.name, lx + 42, yy + 4);
    });
  }

  function generatePRCurve(startP, endP) {
    const pts = [];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const r = i / n;
      const decay = Math.pow(1 - r, 1.5);
      const p = endP + (startP - endP) * decay + (Math.random() - 0.5) * 0.03;
      pts.push({ recall: r, precision: Math.max(0.1, Math.min(1, p)) });
    }
    return pts;
  }

  // Initial draw
  if (document.getElementById('pr-chart')) {
    drawChart();
  }

  /* ---- Threshold slider display ---- */
  const threshold = document.getElementById('threshold');
  if (threshold) {
    const labels = threshold.closest('.lab-field').querySelector('.slider-labels');
    if (labels) {
      const mid = labels.children[1];
      threshold.addEventListener('input', () => {
        mid.textContent = (threshold.value / 100).toFixed(2);
      });
    }
  }
})();
