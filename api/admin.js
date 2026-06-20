const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

function verifyAdmin(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return user.role === 'admin' ? user : null;
  } catch { return null; }
}

export default async function handler(req, res) {
  const user = verifyAdmin(req);
  if (!user) return res.status(403).json({ error: 'Admin access required' });

  const db = await getDb();

  if (req.method === 'GET') {
    const action = req.query.action;

    if (action === 'stats') {
      const [totalProducts, totalUsers, orders] = await Promise.all([
        db.collection('products').countDocuments(),
        db.collection('users').countDocuments(),
        db.collection('orders').find({}).sort({ created_at: -1 }).toArray()
      ]);
      const verified = orders.filter(o => o.status === 'verified');
      const totalRevenue = verified.reduce((sum, o) => sum + (parseFloat(o.amount) || 0), 0);
      const recentOrders = orders.slice(0, 5).map(o => ({
        order_id: o.order_id, email: o.email, product_id: o.product_id,
        amount: o.amount, status: o.status, created_at: o.created_at
      }));
      return res.status(200).json({ totalProducts, totalUsers, totalOrders: verified.length, totalRevenue: totalRevenue.toFixed(2), recentOrders });
    }

    if (action === 'products') {
      const products = await db.collection('products').find({}).toArray();
      return res.status(200).json(products.map(p => ({
        product_id: p.product_id, name: p.name, description: p.description,
        price: p.price, file_link: p.file_link, image: p.image || '',
        active: p.active ? 'TRUE' : 'FALSE'
      })));
    }

    if (action === 'users') {
      const users = await db.collection('users').find({}).toArray();
      return res.status(200).json(users.map(u => ({
        user_id: u.user_id, email: u.email, full_name: u.full_name || '',
        created_at: u.created_at || '', role: u.role || 'user'
      })));
    }

    if (action === 'orders') {
      const orders = await db.collection('orders').find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json(orders.map(o => ({
        order_id: o.order_id, email: o.email, product_id: o.product_id,
        product_name: o.product_name || '', amount: o.amount,
        utr_number: o.utr_number || '', status: o.status, created_at: o.created_at
      })));
    }

    if (action === 'pending-payments') {
      const orders = await db.collection('orders').find({ status: 'pending' }).sort({ created_at: -1 }).toArray();
      return res.status(200).json(orders.map(o => ({
        order_id: o.order_id, email: o.email, product_id: o.product_id,
        product_name: o.product_name || '', amount: o.amount,
        utr_number: o.utr_number || '', created_at: o.created_at
      })));
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'POST') {
    const { action, product_id, name, description, price, file_link, image, active } = req.body;
    if (action !== 'addProduct') return res.status(400).json({ error: 'Invalid action' });
    if (!product_id || !name || !price || !file_link) {
      return res.status(400).json({ error: 'product_id, name, price, and file_link are required' });
    }
    const existing = await db.collection('products').findOne({ product_id });
    if (existing) return res.status(409).json({ error: 'Product ID already exists' });
    await db.collection('products').insertOne({
      product_id, name, description: description || '', price: parseFloat(price),
      file_link, image: image || '', active: active === 'TRUE' || active === true,
      created_at: new Date().toISOString()
    });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PUT') {
    const { action, product_id, name, description, price, file_link, image, active } = req.body;
    if (action !== 'updateProduct' || !product_id) return res.status(400).json({ error: 'Invalid action or missing product_id' });
    await db.collection('products').updateOne(
      { product_id },
      { $set: { name, description: description || '', price: parseFloat(price), file_link, image: image || '', active: active === 'TRUE' || active === true } }
    );
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { action, product_id } = req.body;
    if (action !== 'deleteProduct' || !product_id) return res.status(400).json({ error: 'Invalid action or missing product_id' });
    await db.collection('products').deleteOne({ product_id });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
