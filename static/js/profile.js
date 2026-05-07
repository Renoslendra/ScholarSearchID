/**
 * profile.js — Profile & Edit Profile interactions
 * ScholarSearch ID
 */
(function () {
  'use strict';

  /* ── User menu dropdown toggle ── */
  const userMenu = document.getElementById('user-menu');
  const trigger  = document.getElementById('user-menu-trigger');

  if (trigger && userMenu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(userMenu.classList.contains('open')));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        userMenu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Change Password toggle ── */
  const togglePw = document.getElementById('btn-toggle-password');
  const pwForm   = document.getElementById('pw-form');

  if (togglePw && pwForm) {
    togglePw.addEventListener('click', () => {
      const isVisible = pwForm.style.display !== 'none';
      pwForm.style.display = isVisible ? 'none' : 'block';
      togglePw.textContent = isVisible ? 'Change Password' : 'Cancel';
    });
  }

  /* ── Save password (real API call) ── */
  const btnSavePw = document.getElementById('btn-save-pw');
  if (btnSavePw) {
    btnSavePw.addEventListener('click', async () => {
      const oldPw = document.getElementById('old-password').value;
      const newPw = document.getElementById('new-password').value;

      if (!oldPw || !newPw) {
        alert('Mohon isi kedua field password.');
        return;
      }
      if (newPw.length < 6) {
        alert('Password baru minimal 6 karakter.');
        return;
      }

      btnSavePw.textContent = 'Saving...';
      btnSavePw.disabled = true;

      try {
        const res = await fetch('/api/profile/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_password: oldPw, new_password: newPw })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
          btnSavePw.textContent = 'Password Updated!';
          btnSavePw.style.background = '#22c55e';
          setTimeout(() => {
            btnSavePw.textContent = 'Change Password';
            btnSavePw.style.background = '';
            btnSavePw.disabled = false;
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('pw-form').style.display = 'none';
            document.getElementById('btn-toggle-password').textContent = 'Change Password';
          }, 1500);
        } else {
          alert(data.error || 'Gagal mengubah password.');
          btnSavePw.textContent = 'Change Password';
          btnSavePw.disabled = false;
        }
      } catch (err) {
        alert('Terjadi kesalahan jaringan.');
        btnSavePw.textContent = 'Change Password';
        btnSavePw.disabled = false;
      }
    });
  }

  /* ── Upload profile photo (real) ── */
  const btnUpload = document.getElementById('btn-upload-photo');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.querySelectorAll('.profile-avatar-xl, .profile-avatar-lg, .user-avatar').forEach(el => {
            el.style.backgroundImage = `url(${ev.target.result})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.textContent = '';
          });
        };
        reader.readAsDataURL(file);

        // Upload to server
        btnUpload.textContent = 'Uploading...';
        btnUpload.disabled = true;

        const formData = new FormData();
        formData.append('photo', file);

        try {
          const res = await fetch('/api/profile/photo', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            btnUpload.textContent = 'Uploaded!';
            btnUpload.style.background = '#22c55e';
            setTimeout(() => {
              btnUpload.textContent = 'Upload Profil';
              btnUpload.style.background = '';
              btnUpload.disabled = false;
            }, 1500);
          } else {
            alert(data.error || 'Upload gagal');
            btnUpload.textContent = 'Upload Profil';
            btnUpload.disabled = false;
          }
        } catch (err) {
          alert('Terjadi kesalahan jaringan saat upload.');
          btnUpload.textContent = 'Upload Profil';
          btnUpload.disabled = false;
        }
      };
      input.click();
    });
  }

})();
