const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// שומרים instance אחד של הדפדפן לכל חיי השרת
let browser;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // חשוב ב-Render (מגביל /dev/shm)
        '--disable-gpu',
      ]
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

    // User-Agent אמיתי של Chrome
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/120.0.0.0 Safari/537.36'
    );

    // ממתין עד שהרשת שקטה — כלומר אחרי כל ה-redirects וה-JS
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2', // ממתין שלא יהיו בקשות רשת פעילות
      timeout: 20000
    });

    // מחכים עוד רגע קט למקרה של redirect מאוחר
    await new Promise(r => setTimeout(r, 1500));

    const html = await page.content();
    const finalUrl = page.url();

    res.setHeader('X-Final-Url', finalUrl); // שימושי לדיבוג
    res.send(html);

  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).send('Proxy error: ' + err.message);
  } finally {
    if (page) await page.close(); // סוגרים את ה-tab, לא את הדפדפן
  }
});

// בדיקת חיים
app.get('/health', (_, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Puppeteer proxy on port ${PORT}`));
