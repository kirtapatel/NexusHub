const { MongoClient } = require('mongodb');

let client;
let db;

async function getDb() {
  if (db) return db;
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  db = client.db('nexushub');
  return db;
}

module.exports = { getDb };
