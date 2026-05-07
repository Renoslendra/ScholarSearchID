/**
 * Security module — Anti-Inspect & Anti-Tamper measures.
 * Mencegah user biasa membuka DevTools, klik kanan, dan shortcuts.
 *
 * CATATAN: Proteksi frontend ini bukan keamanan absolut.
 * Keamanan sesungguhnya ada di backend (security headers, rate limiting, CSRF, dll).
 * Script ini hanya lapisan tambahan untuk mencegah user non-teknis.
 */
(function () {
  'use strict';

  // ── 1. Disable Right-Click (Context Menu) ─────────────────
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  });

  // ── 2. Disable Keyboard Shortcuts ─────────────────────────
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C (Inspect Element picker)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+K (Firefox Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.keyCode === 75)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+M (Responsive Design Mode)
    if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm' || e.keyCode === 77)) {
      e.preventDefault();
      return false;
    }
  });

  // ── 3. Disable Drag & Drop (mencegah drag gambar/elemen) ──
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
    return false;
  });

  // ── 4. Disable Text Selection (opsional, mencegah copy) ───
  document.addEventListener('selectstart', function (e) {
    // Izinkan seleksi di input & textarea agar user tetap bisa mengetik
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // ── 5. Disable Copy ──────────────────────────────────────
  document.addEventListener('copy', function (e) {
    // Izinkan copy di input & textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // ── 6. DevTools Detection via debugger trap ───────────────
  // Jika DevTools terbuka, debugger statement akan memperlambat eksekusi.
  let devtoolsWarningShown = false;
  setInterval(function () {
    const before = performance.now();
    debugger;
    const after = performance.now();
    if (after - before > 100 && !devtoolsWarningShown) {
      devtoolsWarningShown = true;
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#ef4444;font-family:system-ui,sans-serif;text-align:center;padding:40px;">' +
        '<div>' +
        '<h1 style="font-size:2rem;margin-bottom:16px;">⛔ Akses Ditolak</h1>' +
        '<p style="color:#94a3b8;font-size:1rem;">Developer Tools terdeteksi. Fitur inspect telah dimatikan untuk keamanan.</p>' +
        '<p style="color:#64748b;font-size:0.85rem;margin-top:12px;">Tutup DevTools dan refresh halaman untuk melanjutkan.</p>' +
        '</div></div>';
    }
  }, 2000);

  // ── 7. Console Warning ────────────────────────────────────
  // Tampilkan peringatan di console jika ada yang berhasil membukanya
  console.log(
    '%c⛔ PERINGATAN KEAMANAN!',
    'color: #ef4444; font-size: 24px; font-weight: bold;'
  );
  console.log(
    '%cJangan pernah menempel atau menjalankan kode apapun di sini.\nIni bisa membahayakan akun Anda.',
    'color: #f97316; font-size: 14px;'
  );
})();
