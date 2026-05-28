const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf-8');
  const stmts = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const s of stmts) await pool.query(s);

  await pool.query("INSERT IGNORE INTO users (id, username, password, role) VALUES (1,'user1','pass123','user'),(2,'admin','admin123','admin')");
  const categories = ['Console','Software','Accessory'];
  for (let i=1;i<=20;i++) {
    await pool.query(
      'INSERT INTO products (name,category,description,price,image) VALUES (?,?,?,?,?)',
      [`Game Product ${i}`, categories[i%3], `Demo item ${i}`, (i*3+19.99).toFixed(2), `sample_${(i%10)+1}.jpg`]
    );
  }
  console.log('Seed complete');
  process.exit(0);
}
run();
