const Razorpay = require('razorpay');
const { google } = require('googleapis');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { product_id } = req.body;
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Products!A:D',
    });
    const products = (response.data.values || []).slice(1);
    const product = products.find(p => p[0] === product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const amount = parseInt(product[3]) * 100;
    const order = await razorpay.orders.create({
      amount, currency: 'INR', receipt: `receipt_${Date.now()}`, payment_capture: 1,
    });
    res.status(200).json({ id: order.id, amount: order.amount, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
}
