const { google } = require('googleapis');

export default async function handler(req, res) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
      process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID, range: 'Products!A:G',
    });
    const rows = response.data.values || [];
    const products = rows.slice(1).filter(r => r[6] === 'TRUE').map(r => ({
      product_id: r[0], name: r[1], description: r[2], price: parseInt(r[3]),
      file_link: r[4], image: r[5] || null,
    }));
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}
