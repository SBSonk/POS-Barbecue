import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase, seedInitialProducts } from './database/db';
import productsRouter from './routes/products';
import transactionsRouter from './routes/transactions';
import reportsRouter from './routes/reports';
import inventoryRouter from './routes/inventory';
import settingsRouter from './routes/settings';
import infoRouter from './routes/info';
import { getLocalIpAddresses } from './utils/network';

const app = express();
const PORT = (process.env.PORT && process.env.PORT !== '8080') ? parseInt(process.env.PORT, 10) : 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from 'public' folder
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/info', infoRouter);

// Fallback to index.html for SPA routing
app.use((_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

async function startServer() {
  try {
    // 1. Initialize SQLite Database & Seed Default Products
    await initDatabase();
    await seedInitialProducts();

    // 2. Start Express Server
    const server = app.listen(3000, '0.0.0.0', () => {
      const ips = getLocalIpAddresses();

      console.log('\n' + '='.repeat(60));
      console.log('       🍖 SMOKIN\' BBQ & BREWS POS SYSTEM 🍺');
      console.log('='.repeat(60));
      console.log(` ✅ Server successfully running on PORT ${PORT}!`);
      console.log('\n 📱 HOW TO ACCESS FROM DEVICES ON SAME WI-FI NETWORK:');
      console.log(`    💻 Laptop Browser:  http://localhost:${PORT}  (or http://127.0.0.1:${PORT})`);
      if (ips.length > 0) {
        ips.forEach(ip => {
          console.log(`    📲 Mobile / Tablet: http://${ip}:${PORT}`);
        });
      } else {
        console.log(`    📲 Mobile / Tablet: http://<YOUR_LAPTOP_IP>:${PORT}`);
      }
      console.log('\n 🔒 Default Admin PIN: 1234');
      console.log('='.repeat(60) + '\n');
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

const serverPromise = startServer();

export { app, serverPromise };
