const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

let browser;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return browser;
}

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing ?url= parameter');

  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000
    });

    await new Promise(r => setTimeout(r, 1500));

    const html = await page.content();
    const finalUrl = page.url();

    res.setHeader('X-Final-Url', finalUrl);
    res.send(html);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send('Proxy error: ' + err.message);
  } finally {
    if (page) await page.close();
  }
});

app.get('/health', (_, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Puppeteer proxy on port ${PORT}`));
