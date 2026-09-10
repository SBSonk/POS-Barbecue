import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

// POST /api/settings/verify-pin - Verify admin PIN
router.post('/verify-pin', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, authorized: false, error: 'PIN is required' });
    }

    const currentPinRow = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'") as any;
    const currentPin = currentPinRow?.value || '1234';

    if (String(pin).trim() === String(currentPin).trim()) {
      return res.json({ success: true, authorized: true, message: 'PIN verified' });
    } else {
      return res.status(401).json({ success: false, authorized: false, error: 'Invalid PIN' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings - Get public business settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT key, value FROM settings') as any[];
    const settings: Record<string, string> = {};
    for (const r of rows) {
      if (r.key === 'admin_pin') {
        settings.has_custom_pin = r.value !== '1234' ? 'true' : 'false';
      } else {
        settings[r.key] = r.value;
      }
    }

    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings - Update business settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { business_name, currency_symbol, tax_rate } = req.body;

    const upsertSetting = async (key: string, value: string) => {
      const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
      if (existing) {
        await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
      } else {
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    };

    if (business_name !== undefined) await upsertSetting('business_name', String(business_name).trim());
    if (currency_symbol !== undefined) await upsertSetting('currency_symbol', String(currency_symbol).trim());
    if (tax_rate !== undefined) await upsertSetting('tax_rate', String(tax_rate).trim());

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings/pin - Change Admin PIN
router.put('/pin', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { current_pin, new_pin } = req.body;

    if (!new_pin || String(new_pin).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'New PIN must be at least 4 digits/characters' });
    }

    const currentPinRow = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'") as any;
    const currentPin = currentPinRow?.value || '1234';

    if (String(current_pin).trim() !== String(currentPin).trim()) {
      return res.status(401).json({ success: false, error: 'Current PIN is incorrect' });
    }

    await db.run("UPDATE settings SET value = ? WHERE key = 'admin_pin'", [String(new_pin).trim()]);

    res.json({ success: true, message: 'Admin PIN changed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
