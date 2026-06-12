import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 950, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/tools/repeat-sync', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[aria-label="Medication name, row 1"]');
  await sleep(300);
  await page.focus('[aria-label="Medication name, row 1"]');
  await sleep(400);
  await page.screenshot({ path: '/tmp/cpt-top.png' });
  console.log('captured');
} finally { await browser.close(); }
