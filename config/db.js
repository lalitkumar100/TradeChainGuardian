const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD), // extra safety
  port: Number(process.env.DB_PORT),
});


pool.connect()
  .then((client) => {
    console.log('Connected to DB');
    client.release();
  })
  .catch(err => console.error('Connection error', err.stack));

module.exports = pool;
