const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sendAdminPaymentAlert } = require('./mailer');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const { product_id, utr_number } = req.body;
    if (!product_id || !utr_number) return res.status(400).json({ error: 'product_id and utr_number are required' });

    const db = await getDb();
    const product = await db.collection('products').findOne({ product_id });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const duplicate = await db.collection('orders').findOne({ utr_number });
    if (duplicate) return res.status(409).json({ error: 'This UTR has already been submitted' });

    const order_id = 'ORD_' + uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
    await db.collection('orders').insertOne({
      order_id,
      email: user.email,
      user_id: user.user_id,
      product_id,
      product_name: product.name,
      amount: product.price,
      utr_number,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Notify admin — fire and forget (don't fail order if email fails)
    sendAdminPaymentAlert({
      order_id,
      email: user.email,
      product_name: product.name,
      amount: product.price,
      utr_number
    }).catch(() => {});

    res.status(200).json({ success: true, order_id, message: 'Payment submitted! Admin will verify and unlock your download shortly.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
}
