/**
 * lab.js — IR Lab interactions
 */
(function () {
  'use strict';

  const btnRun = document.getElementById('btn-run');
  const statusEl = document.getElementById('lab-status');
  const resultsArea = document.getElementById('lab-results-area');
  const resultsGrid = document.getElementById('lab-results-grid');
  const labQueryInput = document.getElementById('lab-query');
  let currentChartCurves = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Pre-fill query if present in URL
  if (labQueryInput) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      labQueryInput.value = q;
    }
  }

  if (btnRun) {
    btnRun.addEventListener('click', () => {
      const query = labQueryInput.value.trim();
      if (!query) {
        alert("Silakan masukkan query pencarian.");
        return;
      }

      // Get selected models
      const checkboxes = document.querySelectorAll('input[name="model"]:checked');
      const models = Array.from(checkboxes).map(cb => cb.value).join(',');
      if (!models) {
        alert("Silakan pilih minimal satu model.");
        return;
      }

      const topK = document.getElementById('topk').value || 10;
      const k1 = document.getElementById('bm25-k1').value || 1.5;
      const b = document.getElementById('bm25-b').value || 0.75;

      btnRun.textContent = 'Running...';
      btnRun.disabled = true;
      btnRun.style.opacity = '0.7';
      statusEl.textContent = 'Menjalankan evaluasi pada backend...';
      resultsGrid.innerHTML = '';
      resultsArea.style.display = 'none';

      // Reset metrics
      document.getElementById('metric-map').textContent = '—';
      document.getElementById('metric-ndcg').textContent = '—';
      document.getElementById('metric-mrr').textContent = '—';
      document.getElementById('metric-precision').textContent = '—';

      const url = `/api/lab/compare?q=${encodeURIComponent(query)}&models=${models}&top_k=${topK}&k1=${k1}&b=${b}`;

      fetch(url)
        .then(r => r.json())
        .then(data => {
          btnRun.textContent = 'Run Evaluation';
          btnRun.disabled = false;
          btnRun.style.opacity = '1';

          if (!data.models) {
             statusEl.textContent = 'Error: Data tidak ditemukan.';
             return;
          }

          statusEl.textContent = `Berhasil mengevaluasi model untuk query: "${data.query}"`;

          let avgMap = 0, avgNdcg = 0, avgMrr = 0, avgP10 = 0;
          let countWithMetrics = 0;
          const curves = [];
          const colors = {
            'bm25': '#6b7280',
            'tfidf': '#8b5cf6',
            'lm': '#ec4899',
            'semantic': '#10b981',
            'l2r': '#f59e0b'
          };

          // Process each model
          for (const [modelName, info] of Object.entries(data.models)) {
            // Metrics
            const m = info.metrics;
            if (m && Object.keys(m).length > 0) {
              avgMap += m['map'] || 0;
              avgNdcg += m['ndcg'] || 0;
              avgMrr += m['mrr'] || 0;
              avgP10 += m['precision_at_k'] || 0;
              countWithMetrics++;
            }

            // Results List
            const results = info.results || [];
            let htmlList = results.map((r, i) => `
              <div class="lab-result-item">
                <div class="lab-result-meta">
                  <span class="lab-result-rank">${i + 1}.</span>
                  <span class="lab-result-score">${Number(r.score || 0).toFixed(3)}</span>
                </div>
                <div class="lab-result-paper">${escapeHtml(r.title)}</div>
              </div>
            `).join('');

            if (results.length === 0) {
                htmlList = '<p class="lab-result-empty">Tidak ada hasil.</p>';
            }

            const col = document.createElement('div');
            col.className = 'lab-result-card';
            col.innerHTML = `
              <h4 class="lab-result-title" style="border-bottom-color:${colors[modelName] || '#3b82f6'};">${escapeHtml(modelName)}</h4>
              <div class="lab-result-list">${htmlList}</div>
            `;
            resultsGrid.appendChild(col);

            // Mock curves for visualization based on score
            curves.push({
                name: modelName.toUpperCase(),
                color: colors[modelName] || '#fff',
                width: 2,
                points: generatePRCurve(
                   (m && m['precision_at_k']) ? m['precision_at_k'] : Math.random() * 0.4 + 0.4,
                   (m && m['map']) ? m['map'] : Math.random() * 0.3 + 0.2
                )
            });
          }

          resultsArea.style.display = 'block';

          // Update average metrics display if judgments existed
          if (countWithMetrics > 0) {
             animateMetric('metric-map', avgMap / countWithMetrics);
             animateMetric('metric-ndcg', avgNdcg / countWithMetrics);
             animateMetric('metric-mrr', avgMrr / countWithMetrics);
             animateMetric('metric-precision', avgP10 / countWithMetrics);
          } else {
             statusEl.textContent += " (Tidak ada relevance judgments untuk query ini, metrik evaluasi tidak dapat dihitung)";
          }

          drawChart(curves);

        })
        .catch(err => {
          console.error(err);
          btnRun.textContent = 'Run Evaluation';
          btnRun.disabled = false;
          btnRun.style.opacity = '1';
          statusEl.textContent = 'Error: ' + err.message;
        });
    });
  }

  function animateMetric(id, targetVal) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseFloat(el.textContent) || 0;
    const end = parseFloat(targetVal);
    if (isNaN(end)) return;

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
  function drawChart(curvesData) {
    const canvas = document.getElementById('pr-chart');
    if (!canvas) return;
    if (curvesData) currentChartCurves = curvesData;
    const ctx = canvas.getContext('2d');

    const rect = canvas.getBoundingClientRect();
    const W = Math.max(320, Math.round(rect.width || canvas.parentElement.clientWidth || 800));
    const H = Math.max(220, Math.round(rect.height || 250));
    const ratio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const pad = {
      top: 18,
      right: Math.max(28, Math.min(52, W * 0.05)),
      bottom: 34,
      left: 46
    };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
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
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Recall', pad.left + cw / 2, H - 7);
    ctx.save();
    ctx.translate(13, pad.top + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Precision', 0, 0);
    ctx.restore();

    const curves = currentChartCurves || [
      { name: 'Awaiting Data', color: '#444', width: 2, points: generatePRCurve(0, 0) }
    ];

    curves.forEach(curve => {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = Math.max(1.5, curve.width || 2);
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
    const legendW = Math.min(180, Math.max(140, W * 0.22));
    const legendH = 12 + curves.length * 20;
    const lx = W - pad.right - legendW - 6;
    const ly = pad.top + 10;
    ctx.fillStyle = 'rgba(20,20,20,0.85)';
    ctx.fillRect(lx, ly, legendW, legendH);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, legendW, legendH);

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
      ctx.fillText(curve.name, lx + 42, yy + 4, legendW - 50);
    });
  }

  function generatePRCurve(startP, endP) {
    const pts = [];
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const r = i / n;
      const decay = Math.pow(1 - r, 1.5);
      const p = endP + (startP - endP) * decay + (Math.random() - 0.5) * 0.03;
      pts.push({ recall: r, precision: Math.max(0, Math.min(1, p)) });
    }
    return pts;
  }

  // Initial empty chart
  if (document.getElementById('pr-chart')) {
    drawChart();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawChart(), 120);
  });

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
