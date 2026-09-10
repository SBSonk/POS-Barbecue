"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
function generateReceiptNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `BBQ-${dateStr}-${randomSuffix}`;
}
// POST /api/transactions - Checkout & atomic inventory deduction
router.post('/', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { items, payment_method = 'CASH', amount_tendered, discount = 0, cashier_note = '', status = 'COMPLETED' } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty. Please add items.' });
        }
        let subtotal = 0;
        const lineItems = [];
        // Begin manual SQLite transaction
        await db.run('BEGIN TRANSACTION');
        try {
            // 1. Verify and price all items
            for (const item of items) {
                const prodId = parseInt(item.product_id, 10);
                const qty = parseInt(item.quantity, 10);
                if (isNaN(prodId) || isNaN(qty) || qty <= 0) {
                    throw new Error(`Invalid product ID (${item.product_id}) or quantity (${item.quantity})`);
                }
                const product = await db.get('SELECT * FROM products WHERE id = ?', [prodId]);
                if (!product) {
                    throw new Error(`Product with ID ${prodId} not found`);
                }
                if (product.is_active !== 1) {
                    throw new Error(`Product '${product.name}' is currently unavailable`);
                }
                const itemTotal = product.price * qty;
                subtotal += itemTotal;
                const newStock = product.stock - qty;
                lineItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    category: product.category,
                    unit_price: product.price,
                    quantity: qty,
                    item_total: itemTotal,
                    resulting_stock: newStock
                });
            }
            const numDiscount = Math.max(0, parseFloat(discount) || 0);
            const taxRateSetting = await db.get("SELECT value FROM settings WHERE key = 'tax_rate'");
            const taxRate = parseFloat(taxRateSetting?.value || '0') / 100;
            const taxableAmount = Math.max(0, subtotal - numDiscount);
            const tax = parseFloat((taxableAmount * taxRate).toFixed(2));
            const total = parseFloat((taxableAmount + tax).toFixed(2));
            let tendered = amount_tendered !== undefined && amount_tendered !== null && amount_tendered !== ''
                ? parseFloat(amount_tendered)
                : total;
            if (isNaN(tendered) || tendered < total) {
                tendered = total;
            }
            const changeDue = parseFloat(Math.max(0, tendered - total).toFixed(2));
            const receiptNumber = generateReceiptNumber();
            const orderStatus = (String(status).toUpperCase() === 'PENDING') ? 'PENDING' : 'COMPLETED';
            // 2. Insert transaction
            const transResult = await db.run(`
        INSERT INTO transactions (
          receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status, cashier_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [receiptNumber, subtotal, tax, numDiscount, total, payment_method.toUpperCase(), tendered, changeDue, orderStatus, cashier_note]);
            const transactionId = transResult.lastID;
            // 3. Insert transaction items & deduct inventory
            for (const line of lineItems) {
                await db.run(`
          INSERT INTO transaction_items (
            transaction_id, product_id, product_name, category, unit_price, quantity, item_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [transactionId, line.product_id, line.product_name, line.category, line.unit_price, line.quantity, line.item_total]);
                await db.run(`
          UPDATE products
          SET stock = ?, updated_at = DATETIME('now', 'localtime')
          WHERE id = ?
        `, [line.resulting_stock, line.product_id]);
                await db.run(`
          INSERT INTO inventory_logs (
            product_id, product_name, change_amount, resulting_stock, reason, reference_id, notes
          ) VALUES (?, ?, ?, ?, 'SALE', ?, ?)
        `, [line.product_id, line.product_name, -line.quantity, line.resulting_stock, transactionId, `Sale: Receipt ${receiptNumber}`]);
            }
            await db.run('COMMIT');
            res.status(201).json({
                success: true,
                transaction: {
                    id: transactionId,
                    receipt_number: receiptNumber,
                    subtotal,
                    tax,
                    discount: numDiscount,
                    total,
                    payment_method: payment_method.toUpperCase(),
                    amount_tendered: tendered,
                    change_due: changeDue,
                    status: orderStatus,
                    cashier_note,
                    items: lineItems
                }
            });
        }
        catch (innerErr) {
            await db.run('ROLLBACK');
            throw innerErr;
        }
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
// GET /api/transactions - Get transaction history with filters
router.get('/', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { date, status, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM transactions WHERE 1=1';
        const params = [];
        if (date && typeof date === 'string') {
            query += " AND DATE(created_at) = DATE(?)";
            params.push(date);
        }
        if (status && typeof status === 'string' && status !== 'ALL') {
            query += ' AND status = ?';
            params.push(status.toUpperCase());
        }
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);
        const transactions = await db.all(query, params);
        // Fetch items for each transaction
        const enriched = await Promise.all(transactions.map(async (t) => {
            const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            return { ...t, items };
        }));
        res.json({ success: true, transactions: enriched });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [transaction.id]);
        transaction.items = items;
        res.json({ success: true, transaction });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/transactions/:id/complete - Mark pending order as completed and paid
router.post('/:id/complete', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { id } = req.params;
        const { payment_method, amount_tendered, change_due, note_append } = req.body;
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        if (transaction.status === 'VOIDED') {
            return res.status(400).json({ success: false, error: 'Cannot complete a voided transaction' });
        }
        let updatedNote = transaction.cashier_note || '';
        if (note_append) {
            updatedNote = updatedNote ? `${updatedNote}${note_append}` : note_append.replace(/^ \| /, '');
        }
        // Default to existing values if not provided (for backwards compatibility)
        const newMethod = payment_method || transaction.payment_method;
        const newTendered = amount_tendered !== undefined ? amount_tendered : transaction.amount_tendered;
        const newChange = change_due !== undefined ? change_due : transaction.change_due;
        await db.run(`
      UPDATE transactions
      SET status = 'COMPLETED',
          payment_method = ?,
          amount_tendered = ?,
          change_due = ?,
          cashier_note = ?
      WHERE id = ?
    `, [newMethod, newTendered, newChange, updatedNote, id]);
        const updated = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [id]);
        updated.items = items;
        res.json({
            success: true,
            message: 'Order paid and completed',
            transaction: updated
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// PATCH /api/transactions/:id/status - Update transaction status
router.patch('/:id/status', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }
        const validStatuses = ['PENDING', 'COMPLETED', 'VOIDED'];
        const newStatus = status.toUpperCase();
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        if (newStatus === 'VOIDED' && transaction.status !== 'VOIDED') {
            return res.status(400).json({ success: false, error: 'Please use the /void endpoint to void a transaction' });
        }
        await db.run('UPDATE transactions SET status = ? WHERE id = ?', [newStatus, id]);
        const updated = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [id]);
        updated.items = items;
        res.json({ success: true, transaction: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/transactions/:id/void - Void/Undo transaction & restore inventory
router.post('/:id/void', async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const { id } = req.params;
        const { reason = 'Accidental checkout / customer cancel' } = req.body;
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        if (transaction.status === 'VOIDED') {
            return res.status(400).json({ success: false, error: 'Transaction is already voided' });
        }
        const items = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [id]);
        await db.run('BEGIN TRANSACTION');
        try {
            // 1. Mark transaction as voided
            await db.run(`
        UPDATE transactions
        SET status = 'VOIDED', void_reason = ?, voided_at = DATETIME('now', 'localtime')
        WHERE id = ?
      `, [reason, id]);
            // 2. Restore inventory for each item
            for (const item of items) {
                await db.run(`
          UPDATE products
          SET stock = stock + ?, updated_at = DATETIME('now', 'localtime')
          WHERE id = ?
        `, [item.quantity, item.product_id]);
                const updatedProd = await db.get('SELECT stock FROM products WHERE id = ?', [item.product_id]);
                const newStock = updatedProd ? updatedProd.stock : item.quantity;
                await db.run(`
          INSERT INTO inventory_logs (
            product_id, product_name, change_amount, resulting_stock, reason, reference_id, notes
          ) VALUES (?, ?, ?, ?, 'VOID_RESTORE', ?, ?)
        `, [item.product_id, item.product_name, item.quantity, newStock, transaction.id, `Voided Receipt ${transaction.receipt_number}: ${reason}`]);
            }
            await db.run('COMMIT');
            res.json({
                success: true,
                message: 'Transaction voided and stock restored successfully',
                transaction: {
                    ...transaction,
                    status: 'VOIDED',
                    void_reason: reason,
                    voided_at: new Date().toISOString()
                }
            });
        }
        catch (innerErr) {
            await db.run('ROLLBACK');
            throw innerErr;
        }
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = router;
