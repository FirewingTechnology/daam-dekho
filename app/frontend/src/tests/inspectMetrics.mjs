import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

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

async function testViewport(browser, vp, isMobile) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, isMobile, hasTouch: isMobile });
  
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('button[aria-label="Add to comparison"]', { timeout: 15000 });

  // Add 4 products
  for (let i = 0; i < 4; i++) {
    const btn = await page.$('button[aria-label="Add to comparison"]');
    if (btn) {
      await btn.click();
      await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
    }
  }

  // Navigate to compare via React Router link
  await page.evaluate(() => {
    const badge = document.querySelector('button.fixed.bottom-6.right-6') || Array.from(document.querySelectorAll('a')).find(a => a.href.includes('/compare'));
    if (badge) badge.click();
  });

  await page.waitForSelector('[data-testid="compare-matrix-scroll"]', { timeout: 10000 });
  await page.evaluate(() => new Promise(r => setTimeout(r, 600)));

  const metrics = await page.evaluate(() => {
    const htmlScrollWidth = document.documentElement.scrollWidth;
    const htmlClientWidth = document.documentElement.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const bodyClientWidth = document.body.clientWidth;

    const matrixScroll = document.querySelector('[data-testid="compare-matrix-scroll"]');
    const matrixScrollWidth = matrixScroll ? matrixScroll.scrollWidth : 0;
    const matrixClientWidth = matrixScroll ? matrixScroll.clientWidth : 0;

    const stickyCol = document.querySelector('td.sticky.left-0, th.sticky.left-0');
    const stickyRect = stickyCol ? {
      left: stickyCol.getBoundingClientRect().left,
      right: stickyCol.getBoundingClientRect().right,
      width: stickyCol.getBoundingClientRect().width
    } : null;

    const toolbar = document.querySelector('[data-testid="compare-floating-bar"]');
    const toolbarRect = toolbar ? {
      left: toolbar.getBoundingClientRect().left,
      right: toolbar.getBoundingClientRect().right,
      top: toolbar.getBoundingClientRect().top,
      bottom: toolbar.getBoundingClientRect().bottom,
      width: toolbar.getBoundingClientRect().width,
      height: toolbar.getBoundingClientRect().height
    } : null;

    return {
      htmlScrollWidth,
      htmlClientWidth,
      bodyScrollWidth,
      bodyClientWidth,
      matrixScrollWidth,
      matrixClientWidth,
      stickyLeft: stickyRect ? stickyRect.left : null,
      toolbarRect,
      windowWidth: window.innerWidth
    };
  });

  // Test swipe / horizontal scroll inside matrix
  const swipeResult = await page.evaluate(() => {
    const matrixScroll = document.querySelector('[data-testid="compare-matrix-scroll"]');
    if (!matrixScroll) return false;
    matrixScroll.scrollLeft = 200;
    const moved = matrixScroll.scrollLeft > 0;
    const pageScrollX = window.scrollX;
    return { moved, pageScrollX };
  });

  const isNoBodyOverflow = metrics.htmlScrollWidth <= metrics.htmlClientWidth && metrics.bodyScrollWidth <= metrics.bodyClientWidth;
  const isMatrixScrollable = metrics.matrixScrollWidth > metrics.matrixClientWidth;
  const isToolbarContained = metrics.toolbarRect ? (metrics.toolbarRect.right <= metrics.windowWidth + 2 && metrics.toolbarRect.left >= -2) : true;

  await page.close();

  return {
    ...vp,
    ...metrics,
    swipeResult,
    isNoBodyOverflow,
    isMatrixScrollable,
    isToolbarContained,
    passed: isNoBodyOverflow && (!isMobile || isMatrixScrollable) && isToolbarContained
  };
}

async function runAll() {
  console.log('===============================================================');
  console.log('DAAMDEKHO — REAL BROWSER MOBILE & DESKTOP AUTOMATED QA');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  console.log('📱 Testing Mobile Viewports...\n');
  const mobileResults = [];
  for (const vp of MOBILE_VIEWPORTS) {
    const res = await testViewport(browser, vp, true);
    mobileResults.push(res);
    console.log(`| ${res.name.padEnd(8)} | HTML: ${String(res.htmlScrollWidth).padStart(4)}/${String(res.htmlClientWidth).padStart(4)} | Body: ${String(res.bodyScrollWidth).padStart(4)}/${String(res.bodyClientWidth).padStart(4)} | Matrix: ${String(res.matrixScrollWidth).padStart(4)}/${String(res.matrixClientWidth).padStart(4)} | Result: ${res.passed ? 'PASS' : 'FAIL'} |`);
  }

  console.log('\n🖥️ Testing Desktop Viewports...\n');
  const desktopResults = [];
  for (const vp of DESKTOP_VIEWPORTS) {
    const res = await testViewport(browser, vp, false);
    desktopResults.push(res);
    console.log(`| ${res.name.padEnd(10)} | HTML: ${String(res.htmlScrollWidth).padStart(4)}/${String(res.htmlClientWidth).padStart(4)} | Body: ${String(res.bodyScrollWidth).padStart(4)}/${String(res.bodyClientWidth).padStart(4)} | Matrix: ${String(res.matrixScrollWidth).padStart(4)}/${String(res.matrixClientWidth).padStart(4)} | Result: ${res.passed ? 'PASS' : 'FAIL'} |`);
  }

  console.log('\n===============================================================');
  console.log('AUTOMATED QA COMPLETE');
  console.log('===============================================================\n');

  await browser.close();
}

runAll().catch(console.error);
