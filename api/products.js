const { getDb } = require('./db');

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const products = await db.collection('products')
      .find({ active: true })
      .project({ _id: 0, product_id: 1, name: 1, description: 1, price: 1, image: 1 })
      .toArray();
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}
