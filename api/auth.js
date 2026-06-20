const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action, email, password, full_name } = req.body;
  try {
    const db = await getDb();
    const users = db.collection('users');

    if (action === 'signup') {
      const existing = await users.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Email already registered' });
      const password_hash = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      await users.insertOne({
        user_id: userId, email, password_hash,
        full_name: full_name || '', role: 'user',
        created_at: new Date().toISOString()
      });
      const token = jwt.sign({ user_id: userId, email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { email, full_name, role: 'user' } });
    }

    if (action === 'login') {
      const user = await users.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { email: user.email, full_name: user.full_name, role: user.role } });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
