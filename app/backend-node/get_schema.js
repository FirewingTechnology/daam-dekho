import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('products.db');

db.serialize(() => {
    db.each("SELECT sql FROM sqlite_master WHERE type='table'", (err, row) => {
        if (err) {
            console.error(err);
        } else {
            console.log(row.sql);
        }
    });
});

db.close();
