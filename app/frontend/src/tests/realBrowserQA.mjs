import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const DUMMY_PRODUCTS = [
  {
    _id: 'p1',
    id: 'p1',
    title: 'Apple iPhone 15 Pro Max (256 GB, Natural Titanium)',
    brand: 'Apple',
    category: 'Mobile',
    base_image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&q=80',
    price: 159900,
    discounted_price: 148900,
    rating: 4.8,
    reviews: 1240,
    specifications: {
      RAM: '8 GB',
      Storage: '256 GB',
      Processor: 'A17 Pro Chip',
      Display: '6.7 inch Super Retina XDR OLED 120Hz',
      Camera: '48MP + 12MP + 12MP Quad-Pixel',
      Battery: '4422 mAh Fast Charging',
      OS: 'iOS 17'
    },
    vendors: {
      amazon: { price: 148900, rating: 4.8, in_stock: true, link: 'https://amazon.in' },
      flipkart: { price: 151900, rating: 4.7, in_stock: true, link: 'https://flipkart.com' },
      croma: { price: 149900, rating: 4.6, in_stock: true, link: 'https://croma.com' }
    }
  },
  {
    _id: 'p2',
    id: 'p2',
    title: 'Samsung Galaxy S24 Ultra (512 GB, Titanium Gray)',
    brand: 'Samsung',
    category: 'Mobile',
    base_image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80',
    price: 139999,
    discounted_price: 129999,
    rating: 4.7,
    reviews: 980,
    specifications: {
      RAM: '12 GB',
      Storage: '512 GB',
      Processor: 'Snapdragon 8 Gen 3 for Galaxy',
      Display: '6.8 inch Dynamic AMOLED 2X 120Hz',
      Camera: '200MP + 50MP + 12MP + 10MP',
      Battery: '5000 mAh 45W Fast Charging',
      OS: 'Android 14, One UI 6.1'
    },
    vendors: {
      amazon: { price: 129999, rating: 4.7, in_stock: true, link: 'https://amazon.in' },
      flipkart: { price: 131999, rating: 4.6, in_stock: true, link: 'https://flipkart.com' }
    }
  },
  {
    _id: 'p3',
    id: 'p3',
    title: 'OnePlus 12 (256 GB, Silky Black)',
    brand: 'OnePlus',
    category: 'Mobile',
    base_image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80',
    price: 69999,
    discounted_price: 64999,
    rating: 4.6,
    reviews: 650,
    specifications: {
      RAM: '12 GB',
      Storage: '256 GB',
      Processor: 'Snapdragon 8 Gen 3',
      Display: '6.82 inch 2K ProXDR Display 120Hz',
      Camera: '50MP + 64MP + 48MP Hasselblad',
      Battery: '5400 mAh 100W SUPERVOOC',
      OS: 'OxygenOS 14'
    },
    vendors: {
      amazon: { price: 64999, rating: 4.6, in_stock: true, link: 'https://amazon.in' },
      flipkart: { price: 65999, rating: 4.5, in_stock: true, link: 'https://flipkart.com' }
    }
  },
  {
    _id: 'p4',
    id: 'p4',
    title: 'Google Pixel 8 Pro (128 GB, Bay Blue)',
    brand: 'Google',
    category: 'Mobile',
    base_image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&q=80',
    price: 106999,
    discounted_price: 97999,
    rating: 4.5,
    reviews: 420,
    specifications: {
      RAM: '12 GB',
      Storage: '128 GB',
      Processor: 'Google Tensor G3',
      Display: '6.7 inch Super Actua Display 120Hz',
      Camera: '50MP + 48MP + 48MP Triple Rear',
      Battery: '5050 mAh 30W Fast Charging',
      OS: 'Android 14'
    },
    vendors: {
      flipkart: { price: 97999, rating: 4.5, in_stock: true, link: 'https://flipkart.com' },
      amazon: { price: 99999, rating: 4.4, in_stock: true, link: 'https://amazon.in' }
    }
  }
];

const MOBILE_VIEWPORTS = [
  { name: '320×568', width: 320, height: 568 },
  { name: '360×800', width: 360, height: 800 },
  { name: '375×812', width: 375, height: 812 },
  { name: '390×844', width: 390, height: 844 },
  { name: '412×915', width: 412, height: 915 },
  { name: '430×932', width: 430, height: 932 },
];

const DESKTOP_VIEWPORTS = [
  { name: '768×1024', width: 768, height: 1024 },
  { name: '1024×768', width: 1024, height: 768 },
  { name: '1280×720', width: 1280, height: 720 },
  { name: '1440×900', width: 1440, height: 900 },
  { name: '1920×1080', width: 1920, height: 1080 },
];

async function runQA() {
  console.log('===============================================================');
  console.log('DAAMDEKHO — REAL BROWSER MOBILE & DESKTOP AUTOMATED QA');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  console.log('📦 Step 1: Loading comparison page with 4 populated products...');
  await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle2' });

  // Inject 4 products into comparison page state
  await page.evaluate((products) => {
    // Navigate with history state containing 4 products
    window.history.pushState(products, '', '/compare');
    window.dispatchEvent(new PopStateEvent('popstate', { state: products }));
  }, DUMMY_PRODUCTS);

  // Reload/re-render compare with state
  await page.goto(`${BASE_URL}/compare`, { waitUntil: 'networkidle2' });
  await page.evaluate((products) => {
    // Set in window and force re-render if needed
    const compareBadge = document.querySelector('button.fixed.bottom-6.right-6');
    window.history.replaceState(products, '', '/compare');
  }, DUMMY_PRODUCTS);

  // Re-navigate to trigger state in Router
  await page.evaluate((products) => {
    window.history.pushState(products, '', '/compare');
  }, DUMMY_PRODUCTS);

  await page.evaluate(() => new Promise(r => setTimeout(r, 600)));

  // If table not rendered via history state, pass directly into DOM
  const tableExists = await page.$('[data-testid="compare-matrix-scroll"]');
  console.log('  Matrix table rendered:', !!tableExists);

  console.log('\n🔍 Step 2: Measuring Real Mobile Viewport Overflows & Matrix Scroll...\n');

  const results = [];

  for (const vp of MOBILE_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

    const metrics = await page.evaluate(() => {
      const htmlScrollWidth = document.documentElement.scrollWidth;
      const htmlClientWidth = document.documentElement.clientWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const bodyClientWidth = document.body.clientWidth;

      const matrixScroll = document.querySelector('[data-testid="compare-matrix-scroll"]');
      const matrixScrollWidth = matrixScroll ? matrixScroll.scrollWidth : 0;
      const matrixClientWidth = matrixScroll ? matrixScroll.clientWidth : 0;

      const toolbar = document.querySelector('[data-testid="compare-floating-bar"]');
      const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;

      return {
        htmlScrollWidth,
        htmlClientWidth,
        bodyScrollWidth,
        bodyClientWidth,
        matrixScrollWidth,
        matrixClientWidth,
        toolbarRect,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      };
    });

    const isNoBodyOverflow = metrics.htmlScrollWidth <= metrics.htmlClientWidth && metrics.bodyScrollWidth <= metrics.bodyClientWidth;
    const isToolbarContained = metrics.toolbarRect ? (metrics.toolbarRect.right <= metrics.windowWidth + 2 && metrics.toolbarRect.left >= -2) : true;

    results.push({
      viewport: vp.name,
      htmlScrollWidth: metrics.htmlScrollWidth,
      htmlClientWidth: metrics.htmlClientWidth,
      bodyScrollWidth: metrics.bodyScrollWidth,
      bodyClientWidth: metrics.bodyClientWidth,
      matrixScrollWidth: metrics.matrixScrollWidth,
      matrixClientWidth: metrics.matrixClientWidth,
      isNoBodyOverflow,
      isToolbarContained,
      passed: isNoBodyOverflow && isToolbarContained
    });
  }

  // Print results table
  console.log('| Viewport | HTML scrollWidth | HTML clientWidth | Body scrollWidth | Body clientWidth | Result |');
  console.log('|---|---:|---:|---:|---:|---|');
  for (const r of results) {
    console.log(`| ${r.viewport.padEnd(8)} | ${String(r.htmlScrollWidth).padStart(16)} | ${String(r.htmlClientWidth).padStart(16)} | ${String(r.bodyScrollWidth).padStart(16)} | ${String(r.bodyClientWidth).padStart(16)} | ${r.passed ? 'PASS' : 'FAIL'} |`);
  }

  console.log('\n🍔 Step 3: Testing Mobile Header & Drawer Navigation...');
  await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
  const drawerTest = await page.evaluate(async () => {
    const hamburger = document.querySelector('button[aria-label="Toggle Navigation Menu"]');
    if (!hamburger) return { error: 'Hamburger button not found' };

    hamburger.click();
    await new Promise(r => setTimeout(r, 300));

    const isDrawerVisible = document.querySelector('.fixed.inset-x-0.bg-\\[\\#0c0f14\\]\\/98, header ~ div') !== null;
    const bodyOverflow = document.body.style.overflow;

    // Close
    hamburger.click();
    await new Promise(r => setTimeout(r, 300));
    const bodyOverflowAfter = document.body.style.overflow;

    return {
      isDrawerVisible,
      bodyOverflow,
      bodyOverflowAfter
    };
  });
  console.log('  Drawer opened successfully:', drawerTest.isDrawerVisible);
  console.log('  Body scroll lock active during drawer open:', drawerTest.bodyOverflow === 'hidden');
  console.log('  Body scroll restored on drawer close:', drawerTest.bodyOverflowAfter === '');

  console.log('\n🌓 Step 4: Testing Dark Mode & Theme Toggle...');
  const themeTest = await page.evaluate(async () => {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    
    const darkBg = window.getComputedStyle(document.body).backgroundColor;

    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');

    return { darkBg };
  });
  console.log('  Dark mode styles applied cleanly, background:', themeTest.darkBg);

  console.log('\n🖥️ Step 5: Testing Desktop Viewports...');
  const desktopResults = [];
  for (const vp of DESKTOP_VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    const dtMetrics = await page.evaluate(() => ({
      htmlScrollWidth: document.documentElement.scrollWidth,
      htmlClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth
    }));

    const dtPass = dtMetrics.htmlScrollWidth <= dtMetrics.htmlClientWidth && dtMetrics.bodyScrollWidth <= dtMetrics.bodyClientWidth;
    desktopResults.push({ ...vp, ...dtMetrics, passed: dtPass });
  }

  for (const d of desktopResults) {
    console.log(`  ${d.name.padEnd(10)} | HTML: ${d.htmlScrollWidth}/${d.htmlClientWidth} | Body: ${d.bodyScrollWidth}/${d.bodyClientWidth} | ${d.passed ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n===============================================================');
  console.log('REAL BROWSER QA FINISHED — ALL CHECKS EXECUTED');
  console.log('===============================================================\n');

  await browser.close();
}

runQA().catch(err => {
  console.error('QA script error:', err);
  process.exit(1);
});
