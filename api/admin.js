const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

async function getSheets() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

function verifyAdmin(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'admin') return null;
    return user;
  } catch { return null; }
}

export default async function handler(req, res) {
  const user = verifyAdmin(req);
  if (!user) return res.status(403).json({ error: 'Admin access required' });

  const sheets = await getSheets();
  const sid = process.env.SPREADSHEET_ID;

  // ── GET: stats, products, users, orders ────────────────────────────────────
  if (req.method === 'GET') {
    const action = req.query.action;

    if (action === 'stats') {
      const [prodRes, userRes, orderRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Products!A:G' }),
        sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Users!A:F' }),
        sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Orders!A:G' }),
      ]);
      const products = (prodRes.data.values || []).slice(1);
      const users = (userRes.data.values || []).slice(1);
      const orders = (orderRes.data.values || []).slice(1).filter(r => r[5] === 'captured');
      const totalRevenue = orders.reduce((sum, r) => sum + (parseFloat(r[3]) || 0), 0);
      const recentOrders = orders.slice(-5).reverse().map(r => ({
        order_id: r[0], email: r[1], product_id: r[2], amount: r[3], created_at: r[6]
      }));
      return res.status(200).json({
        totalProducts: products.length,
        totalUsers: users.length,
        totalOrders: orders.length,
        totalRevenue: totalRevenue.toFixed(2),
        recentOrders,
      });
    }

    if (action === 'products') {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Products!A:G' });
      const rows = (r.data.values || []).slice(1);
      return res.status(200).json(rows.map(r => ({
        product_id: r[0], name: r[1], description: r[2], price: r[3],
        file_link: r[4], image: r[5] || '', active: r[6] || 'FALSE',
      })));
    }

    if (action === 'users') {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Users!A:F' });
      const rows = (r.data.values || []).slice(1);
      return res.status(200).json(rows.map(r => ({
        user_id: r[0], email: r[1], full_name: r[3] || '', created_at: r[4] || '', role: r[5] || 'user',
      })));
    }

    if (action === 'orders') {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Orders!A:G' });
      const rows = (r.data.values || []).slice(1);
      return res.status(200).json(rows.map(r => ({
        order_id: r[0], email: r[1], product_id: r[2], amount: r[3],
        payment_id: r[4], status: r[5] || '', created_at: r[6] || '',
      })));
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // ── POST: add product ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, product_id, name, description, price, file_link, image, active } = req.body;
    if (action !== 'addProduct') return res.status(400).json({ error: 'Invalid action' });
    if (!product_id || !name || !price || !file_link) {
      return res.status(400).json({ error: 'product_id, name, price, and file_link are required' });
    }
    // Check duplicate product_id
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: 'Products!A:A' });
    const ids = (existing.data.values || []).flat();
    if (ids.includes(product_id)) return res.status(409).json({ error: 'Product ID already exists' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sid, range: 'Products!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[product_id, name, description || '', price, file_link, image || '', active || 'TRUE']] },
    });
    return res.status(200).json({ success: true });
  }

  // ── PUT: update product ────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { action, row_index, name, description, price, file_link, image, active } = req.body;
    if (action !== 'updateProduct' || !row_index) return res.status(400).json({ error: 'Invalid action or missing row_index' });

    // Preserve product_id (column A), update columns B–G
    await sheets.spreadsheets.values.update({
      spreadsheetId: sid,
      range: `Products!B${row_index}:G${row_index}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[name, description || '', price, file_link, image || '', active || 'TRUE']] },
    });
    return res.status(200).json({ success: true });
  }

  // ── DELETE: remove product row ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { action, row_index } = req.body;
    if (action !== 'deleteProduct' || !row_index) return res.status(400).json({ error: 'Invalid action or missing row_index' });

    // Get spreadsheet ID to find the Products sheet sheetId
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sid });
    const sheet = meta.data.sheets.find(s => s.properties.title === 'Products');
    if (!sheet) return res.status(404).json({ error: 'Products sheet not found' });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: row_index - 1,
              endIndex: row_index,
            }
          }
        }]
      }
    });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
