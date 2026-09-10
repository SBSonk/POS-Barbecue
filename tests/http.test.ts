import http from 'http';
import path from 'path';
import fs from 'fs';
import { getDb } from '../src/database/db';

// Use a temporary test db
const testDbPath = path.join(process.cwd(), 'pos_http_test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.PORT = '3005';

async function verifyHttpServer() {
  console.log('🌐 Testing HTTP Server & API endpoints...');

  // Start server
  const { app, serverPromise } = await import('../src/index');
  const server = await serverPromise;

  const get = (urlPath: string) => {
    return new Promise<{ status: number; data: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:3005${urlPath}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode || 0, data }));
      }).on('error', reject);
    });
  };

  try {
    // 1. Test Static HTML serving & Navigation Controls
    const htmlRes = await get('/');
    if (
      htmlRes.status === 200 &&
      htmlRes.data.includes('Smokin\' BBQ & Brews') &&
      htmlRes.data.includes('id="cart-back-btn"') &&
      htmlRes.data.includes('id="cart-continue-btn"') &&
      htmlRes.data.includes('id="nav-pending-btn"') &&
      htmlRes.data.includes('id="pending-layout"') &&
      htmlRes.data.includes('data-method="QRPH"')
    ) {
      console.log(' ✅ GET / -> 200 OK (Served index.html with cart back navigation, Pending Orders tab, and QRPH payment)');
    } else {
      throw new Error(`Failed to serve index.html with new features: status ${htmlRes.status}`);
    }

    // 1b. Test Static CSS serving
    const cssRes = await get('/css/styles.css');
    if (
      cssRes.status === 200 &&
      cssRes.data.includes('.cart-back-btn') &&
      cssRes.data.includes('.pending-layout') &&
      cssRes.data.includes('.qrph-card-box') &&
      cssRes.data.includes('.restock-category-pills')
    ) {
      console.log(' ✅ GET /css/styles.css -> 200 OK (Served CSS with Pending orders, QRPH box, and Restock pills)');
    } else {
      throw new Error(`Failed to serve styles.css with new rules: status ${cssRes.status}`);
    }

    // 2. Test /api/info
    const infoRes = await get('/api/info');
    const infoJson = JSON.parse(infoRes.data);
    if (infoRes.status === 200 && infoJson.success && infoJson.port === 3005) {
      console.log(` ✅ GET /api/info -> 200 OK (Detected IPs: ${infoJson.local_ips.join(', ') || 'localhost'})`);
    } else {
      throw new Error(`Failed /api/info: ${infoRes.data}`);
    }

    // 3. Test /api/products
    const prodRes = await get('/api/products');
    const prodJson = JSON.parse(prodRes.data);
    if (prodRes.status === 200 && prodJson.success && prodJson.products.length >= 10) {
      console.log(` ✅ GET /api/products -> 200 OK (${prodJson.products.length} products loaded)`);
    } else {
      throw new Error(`Failed /api/products: ${prodRes.data}`);
    }

    // 4. Test /api/reports/eod
    const eodRes = await get('/api/reports/eod');
    const eodJson = JSON.parse(eodRes.data);
    if (eodRes.status === 200 && eodJson.success) {
      console.log(' ✅ GET /api/reports/eod -> 200 OK (EOD Summary working)');
    } else {
      throw new Error(`Failed /api/reports/eod: ${eodRes.data}`);
    }

    console.log('\n🎉 ALL HTTP API & STATIC ASSET VERIFICATIONS PASSED!\n');
  } finally {
    server.close();
    const db = await getDb();
    await db.close();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  }
}

verifyHttpServer().catch(err => {
  console.error('❌ HTTP verification failed:', err);
  process.exit(1);
});
