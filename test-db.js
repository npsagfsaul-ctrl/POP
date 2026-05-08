const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Current time from DB:', res.rows[0]);
    return client.end();
  })
  .catch(err => {
    console.error('Connection error:', err.stack);
    process.exit(1);
  });
