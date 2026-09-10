import { Router, Request, Response } from 'express';
import { getLocalIpAddresses } from '../utils/network';
import { getDb } from '../database/db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const addresses = getLocalIpAddresses();
    const port = process.env.PORT || 3000;
    const businessNameRow = await db.get("SELECT value FROM settings WHERE key = 'business_name'") as any;

    res.json({
      success: true,
      business_name: businessNameRow?.value || 'BBQ POS System',
      port: Number(port),
      local_ips: addresses,
      access_urls: [
        `http://localhost:${port}`,
        ...addresses.map(ip => `http://${ip}:${port}`)
      ],
      server_time: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
