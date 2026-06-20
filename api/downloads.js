const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Login required' });
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Orders!A:G',
    });
    const orders = (ordersRes.data.values || []).filter(row => row[1] === user.email && row[5] === 'captured');
    const productsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Products!A:E',
    });
    const products = (productsRes.data.values || []).slice(1);
    const downloads = orders.map(order => {
      const product = products.find(p => p[0] === order[2]);
      return { order_id: order[0], product_name: product?.[1] || 'Unknown', file_link: product?.[4] || null, purchased_at: order[6] };
    });
    res.status(200).json(downloads);
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
