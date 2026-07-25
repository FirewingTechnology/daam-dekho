import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('../../daamdekho.db');
db.all("SELECT * FROM product_specifications LIMIT 5", (err, rows) => {
  console.log(rows);
  db.close();
});
