require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD), // extra safety
  port: process.env.DB_PORT,
});


pool.connect()
  .then(() => console.log('Connected to DB'))
  .catch(err => console.error('Connection error', err.stack));

module.exports = pool;
