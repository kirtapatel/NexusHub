document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const msg = document.getElementById('loginMessage');
      try {
        const data = await apiCall('/auth', 'POST', { action: 'login', email, password });
        if (data.token) {
          setToken(data.token);
          msg.innerHTML = '<div class="message success">Login successful!</div>';
          setTimeout(() => window.location.href = 'store.html', 1000);
        } else {
          msg.innerHTML = `<div class="message error">${data.error}</div>`;
        }
      } catch { msg.innerHTML = '<div class="message error">Network error</div>'; }
    });
  }
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const msg = document.getElementById('signupMessage');
      try {
        const data = await apiCall('/auth', 'POST', { action: 'signup', email, password, full_name });
        if (data.token) {
          setToken(data.token);
          msg.innerHTML = '<div class="message success">Account created!</div>';
          setTimeout(() => window.location.href = 'store.html', 1000);
        } else {
          msg.innerHTML = `<div class="message error">${data.error}</div>`;
        }
      } catch { msg.innerHTML = '<div class="message error">Network error</div>'; }
    });
  }
});
