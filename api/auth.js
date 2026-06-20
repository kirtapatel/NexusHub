const { google } = require('googleapis');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const credentials = {
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

async function getSheets() {
  const auth = new google.auth.JWT(
    credentials.client_email, null, credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { action, email, password, full_name } = req.body;
  try {
    const sheets = await getSheets();
    if (action === 'signup') {
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID, range: 'Users!B:B',
      });
      const emails = (existing.data.values || []).flat();
      if (emails.includes(email)) return res.status(400).json({ error: 'Email already registered' });
      const password_hash = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID, range: 'Users!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[userId, email, password_hash, full_name || '', new Date().toISOString(), 'user']] },
      });
      const token = jwt.sign({ user_id: userId, email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { email, full_name, role: 'user' } });
    }
    if (action === 'login') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID, range: 'Users!A:F',
      });
      const users = response.data.values || [];
      const user = users.find(u => u[1] === email);
      if (!user || !(await bcrypt.compare(password, user[2]))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = jwt.sign({ user_id: user[0], email: user[1], role: user[5] }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ token, user: { email: user[1], full_name: user[3], role: user[5] } });
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
