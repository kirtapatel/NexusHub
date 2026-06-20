document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
  const list = document.getElementById('downloadsList');
  try {
    const downloads = await apiCall('/downloads');
    if (!downloads || downloads.length === 0) {
      list.innerHTML = '<p>No purchases yet. <a href="store.html">Visit store</a></p>'; return;
    }
    list.innerHTML = downloads.map(d => `
      <div class="download-item">
        <div><strong>${d.product_name}</strong><br><small>${new Date(d.purchased_at).toLocaleDateString()}</small></div>
        <a href="${d.file_link}" class="btn-primary" style="width:auto;padding:0.5rem 1rem;">Download</a>
      </div>
    `).join('');
  } catch { list.innerHTML = '<p>Error loading downloads.</p>'; }
});
