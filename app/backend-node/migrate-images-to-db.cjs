const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get the base directory (one level up from backend-node)
const baseDir = path.join(__dirname, '..');
const db = new sqlite3.Database(path.join(baseDir, 'backend-node/products.db'), (err) => {
  if (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
  
  console.log('\n=== MIGRATING IMAGES TO DATABASE ===\n');
  
  const jsonFilesToLoad = [
    'scraping/database/flipkartproducts_normalized.json',
    'scraping/database/jiomart_mobile_normalized.json',
    'scraping/database/vijaysales_mobile_normalized.json'
  ];
  
  let totalUpdated = 0;
  let filesProcessed = 0;
  
  jsonFilesToLoad.forEach((jsonFile, index) => {
    const filePath = path.join(baseDir, jsonFile);
    
    console.log(`[${index + 1}/${jsonFilesToLoad.length}] Processing: ${jsonFile}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  X File not found: ${filePath}`);
      filesProcessed++;
      if (filesProcessed === jsonFilesToLoad.length) {
        console.log(`\nMigration complete: ${totalUpdated} products updated`);
        db.close();
      }
      return;
    }
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Handle both array and object with 'data' property
      const products = Array.isArray(data) ? data : (data.data || []);
      console.log(`  OK Found ${products.length} products in JSON`);
      
      let updated = 0;
      const vendorMatch = jsonFile.match(/(\w+)(?:_mobile)?/);
      const vendor = vendorMatch ? vendorMatch[1] : 'unknown';
      const tableName = `${vendor}_products`;
      
      products.forEach(product => {
        if (!product.id || !product.title) return;
        
        const imageUrls = product.image_urls || product.image_url;
        const imageUrlsJson = JSON.stringify(Array.isArray(imageUrls) ? imageUrls : [imageUrls]);
        
        // Update product in database
        db.run(
          `UPDATE ${tableName} SET image_urls = ? WHERE id = ? OR title = ?`,
          [imageUrlsJson, product.id, product.title],
          function(err) {
            if (!err && this.changes > 0) {
              updated++;
              totalUpdated++;
            }
          }
        );
      });
      
      console.log(`  -> Updated ${updated} products in ${tableName}\n`);
      filesProcessed++;
      
      // Close when all files processed
      if (filesProcessed === jsonFilesToLoad.length) {
        console.log(`\nMigration complete: ${totalUpdated} products updated`);
        db.close();
      }
    } catch (e) {
      console.log(`  X Error reading file: ${e.message}\n`);
      filesProcessed++;
      if (filesProcessed === jsonFilesToLoad.length) {
        console.log(`\nMigration complete: ${totalUpdated} products updated`);
        db.close();
      }
    }
  });
});
