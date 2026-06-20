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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const admin = verifyAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { order_id, action } = req.body;
  if (!order_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'order_id and action (approve/reject) required' });
  }

  try {
    const db = await getDb();
    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    const result = await db.collection('orders').updateOne(
      { order_id, status: 'pending' },
      { $set: { status: newStatus, verified_at: new Date().toISOString(), verified_by: admin.email } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Order not found or already processed' });
    res.status(200).json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
}
