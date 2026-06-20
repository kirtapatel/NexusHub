const crypto = require('crypto');
const Razorpay = require('razorpay');
const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { payment_id, order_id, signature, product_id } = req.body;
  const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + '|' + payment_id).digest('hex');
  if (generatedSignature !== signature) return res.status(400).json({ success: false, error: 'Invalid signature' });
  try {
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const payment = await razorpay.payments.fetch(payment_id);
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Orders!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[order_id, payment.email, product_id, payment.amount/100, payment_id, 'captured', new Date().toISOString()]] },
    });
    const productRes = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Products!A:E',
    });
    const products = (productRes.data.values || []).slice(1);
    const product = products.find(p => p[0] === product_id);
    res.status(200).json({ success: true, download_link: product ? product[4] : null });
  } catch (err) {
    res.status(200).json({ success: false, error: 'Verification failed' });
  }
}
