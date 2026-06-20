(function() {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
  const user = getUser();
  if (!user || user.role !== 'admin') { alert('Admin access required.'); window.location.href = 'index.html'; return; }
  const el = document.getElementById('adminEmail');
  if (el) el.textContent = user.email;
})();

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name)) b.classList.add('active');
  });
  if (name === 'dashboard') loadDashboard();
  if (name === 'payments') loadPendingPayments();
  if (name === 'products') loadProducts();
  if (name === 'users') loadUsers();
  if (name === 'orders') loadOrders();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await apiCall('/admin?action=stats');
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="stat-value">${data.totalProducts}</div><div class="stat-label">Total Products</div></div>
      <div class="stat-card"><div class="stat-value">${data.totalUsers}</div><div class="stat-label">Users Registered</div></div>
      <div class="stat-card"><div class="stat-value">${data.totalOrders}</div><div class="stat-label">Verified Orders</div></div>
      <div class="stat-card"><div class="stat-value">₹${data.totalRevenue}</div><div class="stat-label">Revenue</div></div>
    `;
    const recent = document.getElementById('recentOrders');
    if (!data.recentOrders || data.recentOrders.length === 0) {
      recent.innerHTML = '<p style="color:#9ca3af">No orders yet.</p>'; return;
    }
    recent.innerHTML = `<table class="admin-table">
      <thead><tr><th>Order ID</th><th>Email</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${data.recentOrders.map(o => `
        <tr>
          <td style="font-size:.75rem;color:#7c3aed">${o.order_id}</td>
          <td>${o.email}</td><td>${o.product_id}</td><td>₹${o.amount}</td>
          <td><span class="badge ${o.status === 'verified' ? 'badge-green' : o.status === 'rejected' ? 'badge-red' : 'badge-gray'}">${o.status}</span></td>
          <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { document.getElementById('statsGrid').innerHTML = '<p style="color:#f87171">Failed to load.</p>'; }
}

// ── Pending Payments ───────────────────────────────────────────────────────────
async function loadPendingPayments() {
  const el = document.getElementById('paymentsTable');
  el.innerHTML = '<p>Loading...</p>';
  try {
    const orders = await apiCall('/admin?action=pending-payments');
    if (!orders.length) {
      el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">✅ No pending payments — all caught up!</div>'; return;
    }
    el.innerHTML = `<table class="admin-table">
      <thead><tr><th>Order ID</th><th>Email</th><th>Product</th><th>Amount</th><th>UTR Number</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr id="row-${o.order_id}">
          <td style="font-size:.75rem;color:#7c3aed">${o.order_id}</td>
          <td>${o.email}</td>
          <td>${o.product_name || o.product_id}</td>
          <td>₹${o.amount}</td>
          <td style="font-family:monospace;color:#a78bfa">${o.utr_number}</td>
          <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
          <td>
            <button class="btn-edit" onclick="verifyPayment('${o.order_id}','approve')" style="background:#059669;color:#fff">✅ Approve</button>
            <button class="btn-danger" onclick="verifyPayment('${o.order_id}','reject')" style="margin-left:6px">❌ Reject</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load payments.</p>'; }
}

async function verifyPayment(orderId, action) {
  const row = document.getElementById('row-' + orderId);
  const btns = row ? row.querySelectorAll('button') : [];
  btns.forEach(b => b.disabled = true);
  try {
    const res = await apiCall('/verify-payment', 'POST', { order_id: orderId, action });
    if (res.success) {
      if (row) {
        const badge = action === 'approve'
          ? '<span class="badge badge-green">✅ Approved</span>'
          : '<span class="badge badge-red">❌ Rejected</span>';
        row.querySelector('td:last-child').innerHTML = badge;
      }
    } else {
      alert(res.error || 'Action failed');
      btns.forEach(b => b.disabled = false);
    }
  } catch { alert('Network error'); btns.forEach(b => b.disabled = false); }
}

// ── Products ──────────────────────────────────────────────────────────────────
let allProducts = [];
async function loadProducts() {
  const el = document.getElementById('productTable');
  el.innerHTML = '<p>Loading...</p>';
  try {
    allProducts = await apiCall('/admin?action=products');
    if (!allProducts.length) { el.innerHTML = '<p style="color:#9ca3af">No products yet. Add one!</p>'; return; }
    el.innerHTML = `<table class="admin-table">
      <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Active</th><th>Actions</th></tr></thead>
      <tbody>${allProducts.map((p, i) => `
        <tr>
          <td style="font-size:.75rem">${p.product_id}</td><td>${p.name}</td><td>₹${p.price}</td>
          <td><span class="badge ${p.active === 'TRUE' ? 'badge-green' : 'badge-gray'}">${p.active === 'TRUE' ? 'Active' : 'Hidden'}</span></td>
          <td>
            <button class="btn-edit" onclick="editProduct(${i})">Edit</button>
            <button class="btn-danger" onclick="deleteProduct(${i})">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load products.</p>'; }
}

function openProductModal(prefill = null) {
  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = prefill ? 'Edit Product' : 'Add Product';
  document.getElementById('productId').value = prefill?.product_id || '';
  document.getElementById('pProductId').value = prefill?.product_id || '';
  document.getElementById('pProductId').disabled = !!prefill;
  document.getElementById('pName').value = prefill?.name || '';
  document.getElementById('pDescription').value = prefill?.description || '';
  document.getElementById('pPrice').value = prefill?.price || '';
  document.getElementById('pFileLink').value = prefill?.file_link || '';
  document.getElementById('pImage').value = prefill?.image || '';
  document.getElementById('pActive').value = prefill?.active || 'TRUE';
  document.getElementById('productFormMsg').innerHTML = '';
}

function closeProductModal() { document.getElementById('productModal').classList.add('hidden'); }
function editProduct(index) { openProductModal(allProducts[index]); }

async function deleteProduct(index) {
  const p = allProducts[index];
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
  try {
    const res = await apiCall('/admin', 'DELETE', { action: 'deleteProduct', product_id: p.product_id });
    if (res.success) loadProducts();
    else alert('Failed: ' + (res.error || 'unknown error'));
  } catch { alert('Network error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('productForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('productFormMsg');
      const existingId = document.getElementById('productId').value;
      const payload = {
        product_id: document.getElementById('pProductId').value.trim(),
        name: document.getElementById('pName').value.trim(),
        description: document.getElementById('pDescription').value.trim(),
        price: document.getElementById('pPrice').value.trim(),
        file_link: document.getElementById('pFileLink').value.trim(),
        image: document.getElementById('pImage').value.trim(),
        active: document.getElementById('pActive').value,
      };
      try {
        let res;
        if (existingId) {
          res = await apiCall('/admin', 'PUT', { action: 'updateProduct', ...payload });
        } else {
          res = await apiCall('/admin', 'POST', { action: 'addProduct', ...payload });
        }
        if (res.success) {
          msg.innerHTML = '<div class="message success">Saved!</div>';
          setTimeout(() => { closeProductModal(); loadProducts(); }, 800);
        } else {
          msg.innerHTML = `<div class="message error">${res.error || 'Failed to save'}</div>`;
        }
      } catch { msg.innerHTML = '<div class="message error">Network error</div>'; }
    });
  }
  loadDashboard();
});

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const el = document.getElementById('userTable');
  el.innerHTML = '<p>Loading...</p>';
  try {
    const users = await apiCall('/admin?action=users');
    if (!users.length) { el.innerHTML = '<p style="color:#9ca3af">No users found.</p>'; return; }
    el.innerHTML = `<table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
      <tbody>${users.map(u => `
        <tr>
          <td>${u.full_name || '—'}</td><td>${u.email}</td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-green' : 'badge-gray'}">${u.role}</span></td>
          <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load users.</p>'; }
}

// ── Orders ────────────────────────────────────────────────────────────────────
async function loadOrders() {
  const el = document.getElementById('ordersTable');
  el.innerHTML = '<p>Loading...</p>';
  try {
    const orders = await apiCall('/admin?action=orders');
    if (!orders.length) { el.innerHTML = '<p style="color:#9ca3af">No orders yet.</p>'; return; }
    el.innerHTML = `<table class="admin-table">
      <thead><tr><th>Order ID</th><th>Email</th><th>Product</th><th>Amount</th><th>UTR</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td style="font-size:.75rem;color:#7c3aed">${o.order_id}</td>
          <td>${o.email}</td><td>${o.product_name || o.product_id}</td><td>₹${o.amount}</td>
          <td style="font-family:monospace;font-size:.8rem">${o.utr_number || '—'}</td>
          <td><span class="badge ${o.status === 'verified' ? 'badge-green' : o.status === 'rejected' ? 'badge-red' : 'badge-gray'}">${o.status}</span></td>
          <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load orders.</p>'; }
}
