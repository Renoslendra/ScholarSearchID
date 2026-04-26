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
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        userMenu.classList.remove('open');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') userMenu.classList.remove('open');
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

  /* ── Save password (demo) ── */
  const btnSavePw = document.getElementById('btn-save-pw');
  if (btnSavePw) {
    btnSavePw.addEventListener('click', () => {
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

      // Demo — in real app, send to server
      btnSavePw.textContent = 'Saved!';
      btnSavePw.style.background = '#22c55e';
      setTimeout(() => {
        btnSavePw.textContent = 'Change Password';
        btnSavePw.style.background = '';
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('pw-form').style.display = 'none';
        document.getElementById('btn-toggle-password').textContent = 'Change Password';
      }, 1500);
    });
  }

  /* ── Upload profile photo (demo) ── */
  const btnUpload = document.getElementById('btn-upload-photo');
  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            // Update all avatars on the page
            document.querySelectorAll('.profile-avatar-xl, .profile-avatar-lg, .user-avatar').forEach(el => {
              el.style.backgroundImage = `url(${ev.target.result})`;
              el.style.backgroundSize = 'cover';
              el.style.backgroundPosition = 'center';
              el.textContent = '';
            });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }

  /* ── Edit profile form submit (demo) ── */
  const editForm = document.getElementById('edit-profile-form');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-profile');
      btn.textContent = 'Saved!';
      btn.style.background = '#22c55e';
      setTimeout(() => {
        btn.textContent = 'Save Changes';
        btn.style.background = '';
      }, 1500);
    });
  }

})();
