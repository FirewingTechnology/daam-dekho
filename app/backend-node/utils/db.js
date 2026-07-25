import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../../daamdekho.db');

let db = null;

export const connectDB = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database connection error:', err);
        reject(err);
      } else {
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA foreign_keys = ON');
        console.log('✅ Database connected at:', DB_PATH);
        resolve(db);
      }
    });
  });
};

export const getDB = () => {
  if (!db) {
    console.warn('⚠️ Database not connected. Attempting auto-connection...');
    // We can't easily return a sync value if connectDB is async, 
    // but for SQLite it's usually synchronous enough if we don't use a promise.
    // However, to keep it clean, let's just throw a clearer error that suggests a retry.
    throw new Error('Database connection is not established. Please ensure connectDB() was called and successful.');
  }
  return db;
};

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};
