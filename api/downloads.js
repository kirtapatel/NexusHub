const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Login required' });
    const user = jwt.verify(token, process.env.JWT_SECRET);

    const db = await getDb();
    const orders = await db.collection('orders').find({ email: user.email, status: 'verified' }).toArray();

    const downloads = await Promise.all(orders.map(async (order) => {
      const product = await db.collection('products').findOne({ product_id: order.product_id });
      return {
        order_id: order.order_id,
        product_name: order.product_name || product?.name || 'Unknown',
        file_link: product?.file_link || null,
        purchased_at: order.created_at
      };
    }));

    res.status(200).json(downloads);
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
