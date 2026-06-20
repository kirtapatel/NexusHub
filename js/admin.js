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
  if (name === 'support') loadSupportTickets();
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

// ── Pending Payments ──────────────────────────────────────────────────────────
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
          <td>${o.email}</td><td>${o.product_name || o.product_id}</td><td>₹${o.amount}</td>
          <td style="font-family:monospace;color:#a78bfa">${o.utr_number}</td>
          <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
          <td style="white-space:nowrap">
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
      if (row) row.querySelector('td:last-child').innerHTML = action === 'approve'
        ? '<span class="badge badge-green">✅ Approved</span>'
        : '<span class="badge badge-red">❌ Rejected</span>';
    } else {
      alert(res.error || 'Action failed');
      btns.forEach(b => b.disabled = false);
    }
  } catch { alert('Network error'); btns.forEach(b => b.disabled = false); }
}

// ── Support Tickets ───────────────────────────────────────────────────────────
async function loadSupportTickets() {
  const el = document.getElementById('supportTable');
  el.innerHTML = '<p>Loading...</p>';
  try {
    const tickets = await apiCall('/support?action=all-tickets');
    if (!tickets.length) { el.innerHTML = '<p style="color:#9ca3af">No support tickets yet.</p>'; return; }
    el.innerHTML = `<table class="admin-table">
      <thead><tr><th>Ticket ID</th><th>User</th><th>Category</th><th>Subject</th><th>Messages</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${tickets.map(t => `
        <tr>
          <td style="font-size:.75rem;color:#7c3aed">${t.ticket_id}</td>
          <td style="font-size:.85rem">${t.user_email}</td>
          <td><span style="font-size:.8rem;color:#a78bfa">${t.category}</span></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.subject}</td>
          <td style="text-align:center">${t.message_count}</td>
          <td><span class="badge ${t.status === 'open' ? 'badge-gray' : t.status === 'replied' ? 'badge-green' : 'badge-red'}">${t.status}</span></td>
          <td style="font-size:.8rem">${t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
          <td><button class="btn-edit" onclick="openTicketDetail('${t.ticket_id}')">Reply →</button></td>
        </tr>`).join('')}
      </tbody></table>`;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load tickets.</p>'; }
}

async function openTicketDetail(ticketId) {
  document.getElementById('supportListView').style.display = 'none';
  document.getElementById('supportDetailView').style.display = 'block';
  const el = document.getElementById('supportDetail');
  el.innerHTML = '<p style="color:#9ca3af">Loading...</p>';
  try {
    const t = await apiCall(`/support?action=ticket-detail&ticket_id=${ticketId}`);
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <div>
          <h3 style="color:#a78bfa;margin-bottom:4px">${t.subject}</h3>
          <span style="font-size:.8rem;color:#9ca3af">${t.category} · ${t.user_email} · ${new Date(t.created_at).toLocaleDateString()}</span>
        </div>
        <span class="badge ${t.status === 'open' ? 'badge-gray' : t.status === 'replied' ? 'badge-green' : 'badge-red'}">${t.status}</span>
      </div>
      <div style="margin-bottom:1.5rem">${(t.messages || []).map(m => `
        <div style="padding:.8rem 1rem;border-radius:8px;margin-bottom:.6rem;max-width:85%;${m.from === 'admin' ? 'background:#0f3324;border-left:3px solid #059669;margin-left:auto;' : 'background:#1e1b4b;border-left:3px solid #7c3aed;'}">
          <div style="font-size:.75rem;color:#9ca3af;margin-bottom:4px">${m.from === 'admin' ? '🛡️ You (Admin)' : '👤 ' + t.user_email} · ${new Date(m.sent_at).toLocaleString()}</div>
          <div style="font-size:.9rem">${m.text}</div>
        </div>`).join('')}
      </div>
      ${t.status !== 'closed' ? `
      <div style="background:#12122a;border-radius:8px;padding:1rem">
        <label style="display:block;margin-bottom:.5rem;color:#a78bfa;font-size:.9rem">Reply to user</label>
        <textarea id="adminReplyText" rows="4" placeholder="Type your reply..." style="width:100%;padding:.8rem;border-radius:6px;border:1px solid #333;background:#1a1a3a;color:#fff;resize:vertical;font-size:.9rem;box-sizing:border-box"></textarea>
        <div id="replyMsg" style="margin-top:.5rem"></div>
        <div style="display:flex;gap:.5rem;margin-top:.8rem">
          <button class="btn-primary" style="width:auto;padding:.6rem 1.5rem" onclick="sendAdminReply('${t.ticket_id}')">Send Reply</button>
          <button onclick="closeTicketAdmin('${t.ticket_id}')" style="background:#374151;color:#9ca3af;border:none;padding:.6rem 1rem;border-radius:6px;cursor:pointer;font-size:.85rem">Close Ticket</button>
        </div>
      </div>` : '<p style="color:#6b7280;margin-top:1rem;font-size:.9rem">This ticket is closed.</p>'}
    `;
  } catch { el.innerHTML = '<p style="color:#f87171">Failed to load ticket.</p>'; }
}

async function sendAdminReply(ticketId) {
  const text = document.getElementById('adminReplyText').value.trim();
  const msg = document.getElementById('replyMsg');
  if (!text) { msg.innerHTML = '<div class="message error">Please write a reply first.</div>'; return; }
  try {
    const res = await apiCall('/support', 'POST', { action: 'reply', ticket_id: ticketId, reply: text });
    if (res.success) {
      msg.innerHTML = '<div class="message success">Reply sent! User has been notified by email.</div>';
      setTimeout(() => openTicketDetail(ticketId), 1000);
    } else {
      msg.innerHTML = `<div class="message error">${res.error || 'Failed to send reply.'}</div>`;
    }
  } catch { msg.innerHTML = '<div class="message error">Network error.</div>'; }
}

async function closeTicketAdmin(ticketId) {
  if (!confirm('Close this ticket?')) return;
  const res = await apiCall('/support', 'POST', { action: 'close', ticket_id: ticketId });
  if (res.success) showSupportList();
}

function showSupportList() {
  document.getElementById('supportDetailView').style.display = 'none';
  document.getElementById('supportListView').style.display = 'block';
  loadSupportTickets();
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
  if (!confirm(`Delete "${allProducts[index].name}"? This cannot be undone.`)) return;
  try {
    const res = await apiCall('/admin', 'DELETE', { action: 'deleteProduct', product_id: allProducts[index].product_id });
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
        const res = await apiCall('/admin', existingId ? 'PUT' : 'POST', {
          action: existingId ? 'updateProduct' : 'addProduct', ...payload
        });
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
