const fs = require('fs');

const html = fs.readFileSync('debug_jiomart.html', 'utf8');

const startIndex = html.indexOf('window.APP_DATA = {');
if (startIndex !== -1) {
    const endIndex = html.indexOf('</script>', startIndex);
    if (endIndex !== -1) {
        const block = html.substring(startIndex, endIndex);
        
        // Mock window object
        const window = {};
        try {
            eval(block);
            const items = window.APP_DATA?.reduxData?.catalog?.search_results?.items || [];
            console.log(`Successfully extracted ${items.length} items from JSON payload!`);
            
            // Save preview to jiomart_items.json
            fs.writeFileSync('jiomart_items.json', JSON.stringify(items, null, 2));
            console.log('Saved preview to jiomart_items.json');
        } catch(e) {
            console.error('Failed to parse:', e.message);
        }
    }
} else {
    console.log("Could not find window.APP_DATA");
}
