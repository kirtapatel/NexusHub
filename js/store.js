document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }
  const grid = document.getElementById('productGrid');
  try {
    const products = await apiCall('/products');
    if (!products || products.length === 0) {
      grid.innerHTML = '<p>No products available yet.</p>'; return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:8px;margin-bottom:12px;">` : ''}
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="price">₹${p.price}</div>
        <button class="btn-primary" onclick="openPaymentModal('${p.product_id}','${p.name}',${p.price})">Buy Now</button>
      </div>
    `).join('');
  } catch { grid.innerHTML = '<p>Error loading products.</p>'; }
});

function openPaymentModal(productId, name, price) {
  document.getElementById('modalProductName').textContent = name;
  document.getElementById('modalProductPrice').textContent = '₹' + price;
  document.getElementById('paymentProductId').value = productId;
  document.getElementById('utrInput').value = '';
  document.getElementById('paymentMsg').innerHTML = '';
  document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('paymentForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('paymentMsg');
    const utr = document.getElementById('utrInput').value.trim();
    const productId = document.getElementById('paymentProductId').value;
    if (!utr) { msg.innerHTML = '<div class="message error">Please enter your UTR / Transaction ID</div>'; return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      const res = await apiCall('/create-order', 'POST', { product_id: productId, utr_number: utr });
      if (res.success) {
        msg.innerHTML = '<div class="message success">✅ Payment submitted! Admin will verify and unlock your download shortly.</div>';
        btn.textContent = 'Submitted';
        setTimeout(() => closePaymentModal(), 3000);
      } else {
        msg.innerHTML = `<div class="message error">${res.error || 'Submission failed. Try again.'}</div>`;
        btn.disabled = false; btn.textContent = 'Submit Payment';
      }
    } catch {
      msg.innerHTML = '<div class="message error">Network error. Try again.</div>';
      btn.disabled = false; btn.textContent = 'Submit Payment';
    }
  });
});
