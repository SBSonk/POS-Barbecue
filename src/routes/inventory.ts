import { Router, Request, Response } from 'express';
import { getDb } from '../database/db';

const router = Router();

// GET /api/inventory/low-stock - List all low stock and out-of-stock items
router.get('/low-stock', async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT * FROM products 
      WHERE is_active = 1 AND stock <= low_stock_threshold 
      ORDER BY stock ASC, name ASC
    `);

    const items = rows.map((prod: any) => ({
      ...prod,
      is_low_stock: prod.stock <= prod.low_stock_threshold && prod.stock > 0,
      is_out_of_stock: prod.stock <= 0
    }));

    res.json({ success: true, count: items.length, items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inventory/logs - Get recent stock adjustment logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { limit = 100, product_id } = req.query;

    let query = 'SELECT * FROM inventory_logs WHERE 1=1';
    const params: any[] = [];

    if (product_id) {
      query += ' AND product_id = ?';
      params.push(product_id);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit as string, 10) || 100);

    const logs = await db.all(query, params);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inventory/quick-restock - Bulk restock items
router.post('/quick-restock', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { updates, notes = 'Manual bulk restock' } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No restock updates provided' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      const results = [];
      for (const item of updates) {
        const prodId = parseInt(item.product_id, 10);
        const addStock = parseInt(item.add_stock, 10);

        if (isNaN(prodId) || isNaN(addStock) || addStock === 0) continue;

        const prod = await db.get('SELECT * FROM products WHERE id = ?', [prodId]) as any;
        if (!prod) continue;

        const newStock = Math.max(0, prod.stock + addStock);
        await db.run('UPDATE products SET stock = ?, updated_at = DATETIME(\'now\', \'localtime\') WHERE id = ?', [newStock, prodId]);
        await db.run(`
          INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, notes)
          VALUES (?, ?, ?, ?, 'RESTOCK', ?)
        `, [prodId, prod.name, addStock, newStock, notes]);

        results.push({ id: prodId, name: prod.name, old_stock: prod.stock, new_stock: newStock });
      }

      await db.run('COMMIT');

      res.json({ success: true, message: `Restocked ${results.length} items successfully`, results });
    } catch (innerErr) {
      await db.run('ROLLBACK');
      throw innerErr;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
