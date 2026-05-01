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
  // data dummy ntar tinggal ganti dengan api call di backend nya
    const dummyKeywords = [
      "jurnal sistem informasi", "jurnal sistem pakar diagnosa penyakit",
      "jurnal sistem pendukung keputusan", "sistem temu kembali informasi",
      "klasifikasi teks bahasa indonesia", "deep learning untuk klasifikasi citra",
      "machine learning prediksi cuaca", "data mining algoritma apriori"
    ];
    // 1. TAHAP PERANCANGAN (Membuat fungsi untuk fitur autocomplete)
    function setupAutocomplete(inputId, containerClass) {
      
      // Mencari elemen HTML berdasarkan ID dan Class yang dikirimkan
      const searchInput = document.getElementById(inputId);
      const searchBox = document.querySelector(containerClass);

      // Jika elemen tidak ditemukan di halaman ini, hentikan fungsi agar tidak error
      if (!searchInput || !searchBox) return; 

      // Membuat wadah kotak dropdown <div> secara dinamis melalui JavaScript
      const suggestionsBox = document.createElement('div');
      suggestionsBox.className = 'search-suggestions';
      searchBox.appendChild(suggestionsBox); // Memasukkan kotak dropdown ke dalam kotak pencarian utama
      const searchIcon = searchBox.querySelector('svg');
      if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        
        searchIcon.addEventListener('click', (e) => {
          e.stopPropagation(); // Biar gak bentrok
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
      // Mendeteksi setiap kali user mengetik sesuatu di kolom input
      searchInput.addEventListener('input', function () {
        
        // Mengambil teks yang diketik, diubah ke huruf kecil semua, dan dihapus spasi lebihnya
        const query = this.value.toLowerCase().trim();
        
        // Mengosongkan isi dropdown dari pencarian sebelumnya
        suggestionsBox.innerHTML = '';

        // Jika user mengetik minimal 1 huruf
        if (query.length > 0) {
          
          // Mencari kata di dummyKeywords yang mengandung teks yang diketik user
          const matches = dummyKeywords.filter(item => item.toLowerCase().includes(query));

          // Jika ada kata yang cocok (ketemu)
          if (matches.length > 0) {
            
            // Lakukan perulangan untuk setiap kata yang cocok
            matches.forEach(match => {
              
              // Membuat baris (item) baru di dalam dropdown
              const div = document.createElement('div');
              div.className = 'suggestion-item';
              
              // Ikon kaca pembesar untuk di sebelah kiri teks
              const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
              const regex = new RegExp(`(${query})`, 'gi');
              const highlightedText = match.replace(regex, '<span class="suggestion-match">$1</span>');

              // Memasukkan ikon dan teks yang sudah di-highlight ke dalam baris
              div.innerHTML = `${icon} <span>${highlightedText}</span>`;
              
            div.addEventListener('click', () => {
                // 1. Cukup isikan kata yang dipilih ke dalam kolom input
                searchInput.value = match;
                
                // 2. Tutup kotak dropdown-nya
                suggestionsBox.classList.remove('active');
                searchBox.classList.remove('has-suggestions');
                
                // 3. Fokuskan kembali kursor ke dalam kotak teks biar user bisa ngetik lagi atau tekan enter
                searchInput.focus();
              });
              suggestionsBox.appendChild(div);
            });
            
            // Memunculkan kotak dropdown jika ada kata yg cocok
            suggestionsBox.classList.add('active');
            searchBox.classList.add('has-suggestions'); // Mengubah bentuk kotak search agar menyatu
          } else {
            // Jika kata tidak ditemukan, sembunyikan dropdown
            suggestionsBox.classList.remove('active');
            searchBox.classList.remove('has-suggestions');
          }
        } else {
          // Jika user menghapus ketikannya sampai kosong, sembunyikan dropdown
          suggestionsBox.classList.remove('active');
          searchBox.classList.remove('has-suggestions');
        }
      });

      // MENGHILANGKAN DROPDOWN JIKA USER KLIK DI LUAR KOTAK PENCARIAN
      document.addEventListener('click', function (e) {
        if (!searchBox.contains(e.target)) {
          suggestionsBox.classList.remove('active');
          searchBox.classList.remove('has-suggestions');
        }
      });

      // AKSI TOMBOL ENTER KHUSUS UNTUK NAVBAR
      if (inputId === 'nav-search') {
        searchInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter' && this.value.trim()) {
            e.preventDefault();
            // Cek sedang di halaman mana kita sekarang
            const targetUrl = window.location.pathname.includes('/citation') ? '/citation' : '/search';
            window.location.href = targetUrl + '?q=' + encodeURIComponent(this.value.trim());
          }
        });
      }
    }

    // 2. TAHAP EKSEKUSI (MEMANGGIL FUNGSI)
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
