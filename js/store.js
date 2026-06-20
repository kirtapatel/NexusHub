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
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="price">₹${p.price}</div>
        <button class="btn-primary" onclick="buyProduct('${p.product_id}','${p.name}',${p.price})">Buy Now</button>
      </div>
    `).join('');
  } catch { grid.innerHTML = '<p>Error loading products.</p>'; }
});

async function buyProduct(productId, name, price) {
  try {
    const orderData = await apiCall('/create-order', 'POST', { product_id: productId });
    if (orderData.error) { alert('Error: ' + orderData.error); return; }
    const options = {
      key: orderData.key_id, amount: orderData.amount, currency: "INR",
      name: "NexusHub", description: name, order_id: orderData.id,
      prefill: { email: getUser()?.email || '' },
      theme: { color: "#7c3aed" },
      handler: async function(response) {
        const verifyData = await apiCall('/verify-payment', 'POST', {
          payment_id: response.razorpay_payment_id,
          order_id: response.razorpay_order_id,
          signature: response.razorpay_signature,
          product_id: productId
        });
        if (verifyData.success) {
          alert('Payment successful! Check My Downloads.');
          window.location.href = 'downloads.html';
        } else {
          alert('Verification failed. Contact support if money was deducted.');
        }
      }
    };
    const rzp = new Razorpay(options);
    rzp.open();
  } catch { alert('Something went wrong. Try again.'); }
}
