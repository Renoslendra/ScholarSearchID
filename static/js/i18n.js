/**
 * ScholarSearch i18n — Client-side language switcher (ID ↔ EN)
 * Uses localStorage to persist the user's language preference.
 * Translatable elements use data-i18n="key" attributes.
 * Placeholder text uses data-i18n-ph="key" attributes.
 */

const I18N = {
  id: {
    // ── Navbar ──
    'nav.search': 'Pencarian',
    'nav.answer': 'Jawaban',
    'nav.library': 'Perpustakaan',
    'nav.lab': 'Lab',
    'nav.signin': 'Masuk',
    'nav.signup': 'Daftar',
    'nav.search_placeholder': 'Cari...',

    // ── Index / Hero ──
    'hero.subtitle': 'Temukan Jawaban dari Jutaan Paper Akademik',
    'hero.search_mode': 'Mode Pencarian',
    'hero.answer_mode': 'Mode Jawaban',
    'hero.search_placeholder': 'Ajukan pertanyaan atau cari paper...',
    'hero.papers': 'Paper',
    'hero.journals': 'Jurnal',
    'hero.authors': 'Penulis',

    // ── Search ──
    'search.showing': 'Menampilkan hasil untuk',
    'search.results_suffix': 'hasil',
    'search.save': 'Simpan',
    'search.saved': 'Tersimpan',
    'search.view_paper': 'Lihat paper',
    'search.no_results': 'Tidak ditemukan hasil untuk query ini. Coba kata kunci lain.',
    'search.spelling': 'Mungkin maksud Anda:',
    'search.query_expanded': 'Query diperluas:',
    'search.empty_title': 'Cari paper akademik',
    'search.empty_desc': 'Ketik kata kunci di search bar di atas, lalu tekan Enter',
    'search.back_home': 'Kembali ke Homepage',

    // ── Answer / Citation ──
    'answer.title': 'Jawaban AI',
    'answer.subtitle': 'Dapatkan jawaban instan dari paper akademik',
    'answer.placeholder': 'Tanyakan pertanyaan riset Anda...',
    'answer.empty_title': 'Tanyakan Pertanyaan Riset Anda',
    'answer.empty_desc': 'AI akan mencari paper relevan dan menyusun jawaban dengan sitasi inline',
    'answer.loading': 'AI sedang menganalisis paper dan menyusun jawaban…',
    'answer.loading_time': 'Ini bisa memakan waktu 15-30 detik',
    'answer.copy': 'Salin',
    'answer.save': 'Simpan',
    'answer.ref_title': 'Literatur Referensi',
    'answer.source_ai': 'Disintesis AI dari',
    'answer.source_ext': 'Rangkuman dari',
    'answer.papers_suffix': 'paper',

    // ── Library — (see unified block below) ──

    // ── Lab ──
    'lab.title': 'IR Lab',
    'lab.subtitle': 'Eksperimen dengan model retrieval dan evaluasi metrik performa.',
    'lab.run': 'Jalankan Evaluasi',
    'lab.query_label': 'Search Query',
    'lab.config': 'Konfigurasi Retrieval',
    'lab.model_select': 'Pilihan Model',
    'lab.eval_results': 'Hasil Evaluasi',
    'lab.eval_hint': 'Klik "Jalankan Evaluasi" untuk mulai perbandingan model.',
    'lab.pr_curve': 'Precision-Recall Curve',
    'lab.results_per_model': 'Hasil per Model',

    // ── About ──
    'about.title': 'Tentang ScholarSearch',

    // ── Auth ──
    'auth.signin_title': 'Masuk ke ScholarSearch',
    'auth.signup_title': 'Buat Akun Baru',
    'auth.email': 'Email',
    'auth.password': 'Kata Sandi',
    'auth.confirm_password': 'Konfirmasi Kata Sandi',
    'auth.name': 'Nama Lengkap',
    'auth.signin_btn': 'Masuk',
    'auth.signup_btn': 'Daftar',
    'auth.no_account': 'Belum punya akun?',
    'auth.has_account': 'Sudah punya akun?',
    'auth.or': 'atau',

    // ── Profile ──
    'profile.title': 'Profil Saya',
    'profile.edit': 'Edit Profil',
    'profile.change_password': 'Ubah Kata Sandi',
    'profile.logout': 'Keluar',

    // ── Library ──
    'library.title': 'Perpustakaan',
    'library.subtitle': 'Daftar paper yang Anda simpan untuk dibaca kembali.',
    'library.saved_papers': 'Paper Tersimpan',
    'library.saved_answers': 'Jawaban AI Tersimpan',
    'library.loading_answers': 'Memuat jawaban tersimpan...',
    'library.no_answers': 'Belum ada jawaban AI yang disimpan. Simpan jawaban dari halaman Answer.',
    'library.empty': 'Belum ada paper yang disimpan',
    'library.empty_desc': 'Jelajahi ScholarSearch dan simpan paper favorit Anda.',
    'library.search_btn': 'Cari Paper',
    'library.filter_newest': 'Terbaru Disimpan',
    'library.filter_year_desc': 'Tahun Terbit (Terbaru)',
    'library.filter_year_asc': 'Tahun Terbit (Terlama)',
    'library.filter_title': 'Judul (A-Z)',
    'library.loading': 'Memuat perpustakaan...',
    'library.unsave': 'Hapus',
    'library.view': 'Lihat',

    // ── Footer ──
    'footer.copyright': '© 2026 ScholarSearch. Temu Kembali Informasi.',
  },

  en: {
    // ── Navbar ──
    'nav.search': 'Search',
    'nav.answer': 'Answer',
    'nav.library': 'Library',
    'nav.lab': 'Lab',
    'nav.signin': 'Sign in',
    'nav.signup': 'Sign up',
    'nav.search_placeholder': 'Search...',

    // ── Index / Hero ──
    'hero.subtitle': 'Discover Answers from Millions of Academic Papers',
    'hero.search_mode': 'Search Mode',
    'hero.answer_mode': 'Answer Mode',
    'hero.search_placeholder': 'Ask a question or search for papers...',
    'hero.papers': 'Papers',
    'hero.journals': 'Journals',
    'hero.authors': 'Authors',

    // ── Search ──
    'search.showing': 'Showing results for',
    'search.results_suffix': 'results',
    'search.save': 'Save',
    'search.saved': 'Saved',
    'search.view_paper': 'View paper',
    'search.no_results': 'No results found for this query. Try different keywords.',
    'search.spelling': 'Did you mean:',
    'search.query_expanded': 'Query expanded:',
    'search.empty_title': 'Search academic papers',
    'search.empty_desc': 'Type keywords in the search bar above, then press Enter',
    'search.back_home': 'Back to Homepage',

    // ── Answer / Citation ──
    'answer.title': 'AI Answer',
    'answer.subtitle': 'Get instant answers from academic papers',
    'answer.placeholder': 'Ask your research question...',
    'answer.empty_title': 'Ask Your Research Question',
    'answer.empty_desc': 'AI will search relevant papers and compose an answer with inline citations',
    'answer.loading': 'AI is analyzing papers and composing an answer…',
    'answer.loading_time': 'This may take 15-30 seconds',
    'answer.copy': 'Copy',
    'answer.save': 'Save',
    'answer.ref_title': 'Referenced Literature',
    'answer.source_ai': 'AI-synthesized from',
    'answer.source_ext': 'Extracted from',
    'answer.papers_suffix': 'papers',

    // ── Library ──
    'library.title': 'Library',
    'library.subtitle': 'Papers you have saved to read later.',
    'library.saved_papers': 'Saved Papers',
    'library.empty': 'No saved papers yet',
    'library.empty_desc': 'Explore ScholarSearch and save your favorite papers.',
    'library.search_btn': 'Search Papers',
    'library.filter_newest': 'Recently Saved',
    'library.filter_year_desc': 'Year Published (Newest)',
    'library.filter_year_asc': 'Year Published (Oldest)',
    'library.filter_title': 'Title (A-Z)',
    'library.loading': 'Loading library...',
    'library.unsave': 'Remove',
    'library.view': 'View',
    'library.saved_answers': 'Saved AI Answers',
    'library.loading_answers': 'Loading saved answers...',
    'library.no_answers': 'No saved AI answers yet. Save answers from the Answer page.',

    // ── Lab ──
    'lab.title': 'IR Lab',
    'lab.subtitle': 'Experiment with retrieval models and evaluate performance metrics.',
    'lab.run': 'Run Evaluation',
    'lab.query_label': 'Search Query',
    'lab.config': 'Retrieval Configuration',
    'lab.model_select': 'Model Selection',
    'lab.eval_results': 'Evaluation Results',
    'lab.eval_hint': 'Click "Run Evaluation" to start model comparison.',
    'lab.pr_curve': 'Precision-Recall Curve',
    'lab.results_per_model': 'Results per Model',

    // ── About ──
    'about.title': 'About ScholarSearch',

    // ── Auth ──
    'auth.signin_title': 'Sign in to ScholarSearch',
    'auth.signup_title': 'Create a New Account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.name': 'Full Name',
    'auth.signin_btn': 'Sign in',
    'auth.signup_btn': 'Sign up',
    'auth.no_account': "Don't have an account?",
    'auth.has_account': 'Already have an account?',
    'auth.or': 'or',

    // ── Profile ──
    'profile.title': 'My Profile',
    'profile.edit': 'Edit Profile',
    'profile.change_password': 'Change Password',
    'profile.logout': 'Log out',

    // ── Footer ──
    'footer.copyright': '© 2026 ScholarSearch. Information Retrieval.',
  }
};


/* ─── Core Functions ─── */

function getLang() {
  return localStorage.getItem('scholar_lang') || 'id';
}

function setLang(lang) {
  localStorage.setItem('scholar_lang', lang);
  applyLang(lang);
}

function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N['en'] && I18N['en'][key]) || key;
}

function applyLang(lang) {
  // Translate data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = I18N[lang] && I18N[lang][key];
    if (val) el.textContent = val;
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = I18N[lang] && I18N[lang][key];
    if (val) el.placeholder = val;
  });

  // Update toggle button
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    const label = lang === 'id' ? 'ID' : 'EN';
    const caption = lang === 'id' ? 'Terjemahkan' : 'Translate';
    const flag = lang === 'id'
      ? '<svg width="20" height="14" viewBox="0 0 20 14" style="border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,0.2);flex-shrink:0;"><rect width="20" height="7" fill="#FF0000"/><rect y="7" width="20" height="7" fill="#FFFFFF"/></svg>'
      : '<svg width="20" height="14" viewBox="0 0 60 42" style="border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,0.2);flex-shrink:0;"><rect width="60" height="42" fill="#012169"/><path d="M0,0 L60,42 M60,0 L0,42" stroke="#fff" stroke-width="7"/><path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V42 M0,21 H60" stroke="#fff" stroke-width="9"/><path d="M30,0 V42 M0,21 H60" stroke="#C8102E" stroke-width="5"/></svg>';
    toggleBtn.innerHTML = flag + '<span style="font-weight:700;">' + label + '</span><span style="opacity:0.7;font-size:11px;font-weight:400;">· ' + caption + '</span>';
  }

  document.documentElement.lang = lang;
}


/* ─── Language Toggle Button Injector ─── */

function injectLangToggle() {
  // Find the navbar-right or a suitable container
  const navRight = document.querySelector('.navbar-right');
  const hero = document.getElementById('hero');

  if (navRight) {
    // Pages with navbar
    const btn = document.createElement('button');
    btn.id = 'lang-toggle';
    btn.className = 'lang-toggle-btn';
    btn.title = 'Switch language';
    btn.onclick = () => {
      const newLang = getLang() === 'id' ? 'en' : 'id';
      setLang(newLang);
    };
    navRight.insertBefore(btn, navRight.firstChild);
  } else if (hero) {
    // Index / Hero page — place floating button
    const btn = document.createElement('button');
    btn.id = 'lang-toggle';
    btn.className = 'lang-toggle-btn lang-toggle-floating';
    btn.title = 'Switch language';
    btn.onclick = () => {
      const newLang = getLang() === 'id' ? 'en' : 'id';
      setLang(newLang);
    };
    document.body.appendChild(btn);
  }

  // Apply saved language
  applyLang(getLang());
}


/* ─── Inject Styles ─── */

function injectLangStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .lang-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 999px;
      color: var(--text-sec, #94a3b8);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .lang-toggle-btn:hover {
      background: rgba(59,130,246,0.15);
      border-color: rgba(59,130,246,0.4);
      color: #60a5fa;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59,130,246,0.15);
    }
    .lang-toggle-btn span {
      letter-spacing: 0.5px;
    }
    .lang-toggle-floating {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 8px 16px;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);
}


/* ─── Auto-init ─── */

document.addEventListener('DOMContentLoaded', () => {
  injectLangStyles();
  injectLangToggle();
});
