import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

// Fix dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open DB
const db = new sqlite3.Database(path.join(__dirname, "products.db"));

// Read JSON safely
const jsonPath = path.join(__dirname, "products.json");
const data = fs.readFileSync(jsonPath, "utf8");
const products = JSON.parse(data);

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS master_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE,
    brand TEXT,
    price REAL,
    category TEXT,
    source TEXT
  )
`);

// Insert query (no duplicates)
const insert = `
  INSERT OR IGNORE INTO master_products
  (title, brand, price, category, source)
  VALUES (?, ?, ?, ?, ?)
`;

db.serialize(() => {
  const stmt = db.prepare(insert);

  products.forEach(p => {
    stmt.run(
      p.title?.trim() || "",
      p.brand || "unknown",
      Number(p.price) || 0,
      p.category || "other",
      p.source || "json"
    );
  });

  stmt.finalize();

  console.log("✅ JSON Data Imported Successfully!");
});

db.close();
