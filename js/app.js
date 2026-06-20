const API_BASE = '/api';
function getToken() { return localStorage.getItem('nexushub_token'); }
function setToken(token) { localStorage.setItem('nexushub_token', token); }
function removeToken() { localStorage.removeItem('nexushub_token'); }
function isLoggedIn() { return !!getToken(); }
function getUser() {
  const token = getToken();
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}
function checkAuth() {
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');
  const downloadsLink = document.getElementById('downloadsLink');
  const adminLink = document.getElementById('adminLink');
  if (isLoggedIn()) {
    if (loginLink) loginLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'inline';
    if (downloadsLink) downloadsLink.style.display = 'inline';
    const user = getUser();
    if (adminLink && user?.role === 'admin') adminLink.style.display = 'inline';
  }
}
function logout() { removeToken(); window.location.href = 'index.html'; }
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return response.json();
}
