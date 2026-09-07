/* global process */
import puppeteer from 'puppeteer-core';

const VIEWPORTS = [
  // Mobile
  { name: 'Mobile 320x568 (iPhone SE 1st gen)', width: 320, height: 568 },
  { name: 'Mobile 360x800 (Android modern)', width: 360, height: 800 },
  { name: 'Mobile 375x812 (iPhone X/11/12 mini)', width: 375, height: 812 },
  { name: 'Mobile 390x844 (iPhone 13/14)', width: 390, height: 844 },
  { name: 'Mobile 412x915 (Pixel 7 / Galaxy S21)', width: 412, height: 915 },
  { name: 'Mobile 430x932 (iPhone 14/15 Pro Max)', width: 430, height: 932 },
  // Tablet
  { name: 'Tablet 768x1024 (iPad Mini / Portrait)', width: 768, height: 1024 },
  { name: 'Tablet 820x1180 (iPad Air)', width: 820, height: 1180 },
  { name: 'Tablet 1024x1366 (iPad Pro)', width: 1024, height: 1366 },
  // Desktop
  { name: 'Desktop 1280x720 (HD Laptop)', width: 1280, height: 720 },
  { name: 'Desktop 1366x768 (Standard Laptop)', width: 1366, height: 768 },
  { name: 'Desktop 1440x900 (MacBook)', width: 1440, height: 900 },
  { name: 'Desktop 1536x864 (Surface / Windows 125%)', width: 1536, height: 864 },
  { name: 'Desktop 1920x1080 (Full HD)', width: 1920, height: 1080 },
];

const ROUTES = [
  '/',
  '/products',
  '/category',
  '/compare',
  '/about',
  '/contact-us',
  '/privacy-policy',
  '/terms',
];

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runAudit() {
  console.log('🚀 Starting Complete DaamDekho Responsive & Overflow Audit...\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    const results = [];
    let totalPass = 0;
    let totalFail = 0;

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      await page.setViewport({ width: vp.width, height: vp.height });

      const rowResult = { viewport: `${vp.width}px` };

      for (const route of ROUTES) {
        const url = `http://localhost:5173${route}`;
        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
          // Short settle time for animations
          await new Promise((r) => setTimeout(r, 400));

          const evaluation = await page.evaluate(() => {
            const scrollWidth = document.documentElement.scrollWidth;
            const innerWidth = window.innerWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const hasOverflow = scrollWidth > innerWidth;
            const overflowDiff = Math.max(0, scrollWidth - innerWidth);

            // If overflow exists, locate elements that exceed the viewport
            let offendingElements = [];
            if (hasOverflow) {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                // Ignore intentional isolated scroll containers
                if (
                  el.getAttribute('data-testid') === 'compare-matrix-scroll' ||
                  el.closest('[data-testid="compare-matrix-scroll"]') ||
                  el.classList.contains('custom-scrollbar') ||
                  el.classList.contains('overflow-x-auto')
                ) {
                  continue;
                }
                const rect = el.getBoundingClientRect();
                if (rect.right > innerWidth + 1) {
                  const tag = el.tagName.toLowerCase();
                  const cls = el.className ? String(el.className).substring(0, 40) : '';
                  offendingElements.push(`${tag}.${cls} (right: ${Math.round(rect.right)}px > ${innerWidth}px)`);
                  if (offendingElements.length >= 3) break;
                }
              }
            }

            return {
              scrollWidth,
              innerWidth,
              bodyScrollWidth,
              hasOverflow,
              overflowDiff,
              offendingElements,
            };
          });

          if (evaluation.hasOverflow) {
            console.error(`  ❌ ${route} FAIL: overflow by ${evaluation.overflowDiff}px (scrollWidth: ${evaluation.scrollWidth}px > innerWidth: ${evaluation.innerWidth}px)`);
            if (evaluation.offendingElements.length > 0) {
              console.error(`     Culprits: ${evaluation.offendingElements.join(', ')}`);
            }
            rowResult[route] = `FAIL (+${evaluation.overflowDiff}px)`;
            totalFail++;
          } else {
            console.log(`  ✓ ${route} PASS (0px overflow)`);
            rowResult[route] = 'PASS';
            totalPass++;
          }
        } catch (err) {
          console.error(`  ⚠️ ${route} ERROR: ${err.message}`);
          rowResult[route] = 'ERR';
          totalFail++;
        }
      }

      results.push(rowResult);
    }

    console.log(`\n======================================================`);
    console.log(`SUMMARY: ${totalPass} PASS, ${totalFail} FAIL`);
    console.log(`======================================================\n`);
    console.table(results);

    if (totalFail > 0) {
      process.exit(1);
    } else {
      console.log('🎉 ALL ROUTES PASSED ZERO-OVERFLOW AUDIT ACROSS ALL 14 VIEWPORTS!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal audit error:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runAudit();
