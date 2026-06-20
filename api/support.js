const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');
const { sendAdminTicketAlert, sendUserReplyEmail } = require('./mailer');

function getUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

function isAdmin(user) { return user && user.role === 'admin'; }

export default async function handler(req, res) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Login required' });

  const db = await getDb();
  const tickets = db.collection('tickets');

  // POST — create ticket (user) or reply (admin)
  if (req.method === 'POST') {
    const { action, ticket_id, subject, category, message } = req.body;

    if (action === 'create') {
      if (!subject || !message) return res.status(400).json({ error: 'subject and message are required' });
      const tid = 'TKT_' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
      await tickets.insertOne({
        ticket_id: tid,
        user_email: user.email,
        user_id: user.user_id,
        subject,
        category: category || 'General',
        status: 'open',
        created_at: new Date().toISOString(),
        messages: [{ from: 'user', email: user.email, text: message, sent_at: new Date().toISOString() }]
      });
      sendAdminTicketAlert({ ticket_id: tid, email: user.email, subject, category: category || 'General', message }).catch(() => {});
      return res.status(200).json({ success: true, ticket_id: tid });
    }

    if (action === 'reply' && isAdmin(user)) {
      const { reply } = req.body;
      if (!ticket_id || !reply) return res.status(400).json({ error: 'ticket_id and reply required' });
      const ticket = await tickets.findOne({ ticket_id });
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      await tickets.updateOne({ ticket_id }, {
        $push: { messages: { from: 'admin', email: user.email, text: reply, sent_at: new Date().toISOString() } },
        $set: { status: 'replied', updated_at: new Date().toISOString() }
      });
      sendUserReplyEmail({ email: ticket.user_email, subject: ticket.subject, ticket_id, reply }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    if (action === 'close') {
      if (!ticket_id) return res.status(400).json({ error: 'ticket_id required' });
      const filter = isAdmin(user) ? { ticket_id } : { ticket_id, user_email: user.email };
      await tickets.updateOne(filter, { $set: { status: 'closed', updated_at: new Date().toISOString() } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // GET — fetch tickets
  if (req.method === 'GET') {
    const { action, ticket_id } = req.query;

    if (action === 'my-tickets') {
      const list = await tickets.find({ user_email: user.email }).sort({ created_at: -1 }).toArray();
      return res.status(200).json(list.map(t => ({
        ticket_id: t.ticket_id, subject: t.subject, category: t.category,
        status: t.status, created_at: t.created_at,
        last_reply: t.messages?.[t.messages.length - 1]?.text?.slice(0, 80) || ''
      })));
    }

    if (action === 'ticket-detail') {
      const filter = isAdmin(user) ? { ticket_id } : { ticket_id, user_email: user.email };
      const ticket = await tickets.findOne(filter);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      return res.status(200).json(ticket);
    }

    if (action === 'all-tickets' && isAdmin(user)) {
      const list = await tickets.find({}).sort({ created_at: -1 }).toArray();
      return res.status(200).json(list.map(t => ({
        ticket_id: t.ticket_id, user_email: t.user_email, subject: t.subject,
        category: t.category, status: t.status, created_at: t.created_at,
        message_count: t.messages?.length || 0
      })));
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
