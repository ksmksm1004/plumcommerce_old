const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const products = [
  ['Nintendo Switch 2 Console Bundle', 'Console', 'Premium portable console bundle for Plum Commerce demo shopping experiences.', '399.99', 'product_01.jpg'],
  ['PlayStation 5 Slim Disc Edition', 'Console', 'Slim disc console with studio product imagery for storefront testing.', '499.99', 'product_02.jpg'],
  ['Xbox Series X Console', 'Console', 'High-performance console sample item for game commerce migrations.', '499.99', 'product_03.jpg'],
  ['Mario Kart World', 'Software', 'Colorful racing game sample box art for catalog browsing.', '69.99', 'product_04.jpg'],
  ['Zelda Fantasy Adventure', 'Software', 'Fantasy adventure game sample packaging for product detail pages.', '69.99', 'product_05.jpg'],
  ['Final Fantasy RPG', 'Software', 'Role-playing game sample package with premium thumbnail artwork.', '69.99', 'product_06.jpg'],
  ['Elden Ring Dark Fantasy', 'Software', 'Dark fantasy game sample box art for online store demonstrations.', '69.99', 'product_07.jpg'],
  ['FC26 Football Game', 'Software', 'Football game sample product for seasonal storefront testing.', '69.99', 'product_08.jpg'],
  ['DualSense Controller', 'Accessory', 'Wireless controller accessory sample for cart and checkout flows.', '74.99', 'product_09.jpg'],
  ['Xbox Wireless Controller', 'Accessory', 'Wireless controller sample accessory for marketplace demos.', '64.99', 'product_10.jpg'],
  ['Switch Pro Controller', 'Accessory', 'Pro controller sample accessory with dark studio product image.', '69.99', 'product_11.jpg'],
  ['Gaming Headset', 'Accessory', 'Over-ear gaming headset sample product for accessories category pages.', '89.99', 'product_12.jpg'],
  ['NVMe Expansion Card', 'Accessory', 'Storage expansion sample card for console accessory merchandising.', '129.99', 'product_13.jpg'],
  ['Fighting Game Deluxe Edition', 'Software', 'Deluxe fighting game sample package for premium product listings.', '89.99', 'product_14.jpg'],
  ['Racing Simulator Game', 'Software', 'Racing simulator sample game for storefront catalog testing.', '79.99', 'product_15.jpg'],
  ['Super Hero Action Game', 'Software', 'Super hero action game sample box art for demo product grids.', '69.99', 'product_16.jpg'],
  ['Portable Console Carrying Case', 'Accessory', 'Protective portable console carrying case sample accessory.', '34.99', 'product_17.jpg'],
  ['HDMI 2.1 Cable', 'Accessory', 'High-speed HDMI 2.1 cable sample product for checkout scenarios.', '19.99', 'product_18.jpg'],
  ['Monster Hunter Adventure', 'Software', 'Monster hunting adventure sample game packaging for catalog demos.', '69.99', 'product_19.jpg'],
  ['Controller Charging Dock', 'Accessory', 'Dual controller charging dock sample accessory for product pages.', '39.99', 'product_20.jpg'],
];

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf-8');
  const stmts = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const s of stmts) await pool.query(s);
  await pool.query('ALTER TABLE products ADD COLUMN thumbnail VARCHAR(255) NULL').catch(error => {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  });

  await pool.query("INSERT IGNORE INTO users (id, username, password, role) VALUES (1,'user1','pass123','user'),(2,'admin','admin123','admin')");
  await pool.query('DELETE FROM cart_items');
  await pool.query('DELETE FROM products');
  await pool.query('ALTER TABLE products AUTO_INCREMENT = 1');
  for (const product of products) {
    await pool.query(
      'INSERT INTO products (name, category, description, price, image, thumbnail) VALUES (?, ?, ?, ?, ?, ?)',
      [...product, `thumb_${product[4]}`]
    );
  }
  console.log('Seed complete');
  process.exit(0);
}

run();
