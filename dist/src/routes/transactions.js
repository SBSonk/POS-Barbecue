"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { items, payment_method = 'CASH', amount_tendered, discount = 0, cashier_note = '' } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty. Please add items.' });
        }
        let subtotal = 0;
        const lineItems = [];
        // Begin manual SQLite transaction
        yield db.run('BEGIN TRANSACTION');
        try {
            // 1. Verify and price all items
            for (const item of items) {
                const prodId = parseInt(item.product_id, 10);
                const qty = parseInt(item.quantity, 10);
                if (isNaN(prodId) || isNaN(qty) || qty <= 0) {
                    throw new Error(`Invalid product ID (${item.product_id}) or quantity (${item.quantity})`);
                }
                const product = yield db.get('SELECT * FROM products WHERE id = ?', [prodId]);
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
            const taxRateSetting = yield db.get("SELECT value FROM settings WHERE key = 'tax_rate'");
            const taxRate = parseFloat((taxRateSetting === null || taxRateSetting === void 0 ? void 0 : taxRateSetting.value) || '0') / 100;
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
            // 2. Insert transaction
            const transResult = yield db.run(`
        INSERT INTO transactions (
          receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status, cashier_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
      `, [receiptNumber, subtotal, tax, numDiscount, total, payment_method.toUpperCase(), tendered, changeDue, cashier_note]);
            const transactionId = transResult.lastID;
            // 3. Insert transaction items & deduct inventory
            for (const line of lineItems) {
                yield db.run(`
          INSERT INTO transaction_items (
            transaction_id, product_id, product_name, category, unit_price, quantity, item_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [transactionId, line.product_id, line.product_name, line.category, line.unit_price, line.quantity, line.item_total]);
                yield db.run(`
          UPDATE products
          SET stock = ?, updated_at = DATETIME('now', 'localtime')
          WHERE id = ?
        `, [line.resulting_stock, line.product_id]);
                yield db.run(`
          INSERT INTO inventory_logs (
            product_id, product_name, change_amount, resulting_stock, reason, reference_id, notes
          ) VALUES (?, ?, ?, ?, 'SALE', ?, ?)
        `, [line.product_id, line.product_name, -line.quantity, line.resulting_stock, transactionId, `Sale: Receipt ${receiptNumber}`]);
            }
            yield db.run('COMMIT');
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
                    status: 'COMPLETED',
                    cashier_note,
                    items: lineItems
                }
            });
        }
        catch (innerErr) {
            yield db.run('ROLLBACK');
            throw innerErr;
        }
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}));
// GET /api/transactions - Get transaction history with filters
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
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
        const transactions = yield db.all(query, params);
        // Fetch items for each transaction
        const enriched = yield Promise.all(transactions.map((t) => __awaiter(void 0, void 0, void 0, function* () {
            const items = yield db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [t.id]);
            return Object.assign(Object.assign({}, t), { items });
        })));
        res.json({ success: true, transactions: enriched });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// GET /api/transactions/:id - Get single transaction
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const transaction = yield db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        const items = yield db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [transaction.id]);
        transaction.items = items;
        res.json({ success: true, transaction });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// POST /api/transactions/:id/void - Void/Undo transaction & restore inventory
router.post('/:id/void', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { id } = req.params;
        const { reason = 'Accidental checkout / customer cancel' } = req.body;
        const transaction = yield db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) {
            return res.status(404).json({ success: false, error: 'Transaction not found' });
        }
        if (transaction.status === 'VOIDED') {
            return res.status(400).json({ success: false, error: 'Transaction is already voided' });
        }
        const items = yield db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [id]);
        yield db.run('BEGIN TRANSACTION');
        try {
            // 1. Mark transaction as voided
            yield db.run(`
        UPDATE transactions
        SET status = 'VOIDED', void_reason = ?, voided_at = DATETIME('now', 'localtime')
        WHERE id = ?
      `, [reason, id]);
            // 2. Restore inventory for each item
            for (const item of items) {
                yield db.run(`
          UPDATE products
          SET stock = stock + ?, updated_at = DATETIME('now', 'localtime')
          WHERE id = ?
        `, [item.quantity, item.product_id]);
                const updatedProd = yield db.get('SELECT stock FROM products WHERE id = ?', [item.product_id]);
                const newStock = updatedProd ? updatedProd.stock : item.quantity;
                yield db.run(`
          INSERT INTO inventory_logs (
            product_id, product_name, change_amount, resulting_stock, reason, reference_id, notes
          ) VALUES (?, ?, ?, ?, 'VOID_RESTORE', ?, ?)
        `, [item.product_id, item.product_name, item.quantity, newStock, transaction.id, `Voided Receipt ${transaction.receipt_number}: ${reason}`]);
            }
            yield db.run('COMMIT');
            res.json({
                success: true,
                message: 'Transaction voided and stock restored successfully',
                transaction: Object.assign(Object.assign({}, transaction), { status: 'VOIDED', void_reason: reason, voided_at: new Date().toISOString() })
            });
        }
        catch (innerErr) {
            yield db.run('ROLLBACK');
            throw innerErr;
        }
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}));
exports.default = router;
