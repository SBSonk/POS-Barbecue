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
// GET /api/products - Get all products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { activeOnly, category, search } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];
        if (activeOnly === 'true' || activeOnly === '1' || activeOnly === undefined) {
            if (activeOnly !== 'false') {
                query += ' AND is_active = 1';
            }
        }
        if (category && category !== 'All') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (search && typeof search === 'string' && search.trim()) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }
        query += ' ORDER BY category ASC, name ASC';
        const rawProducts = yield db.all(query, params);
        const products = rawProducts.map((prod) => (Object.assign(Object.assign({}, prod), { is_low_stock: prod.stock <= prod.low_stock_threshold && prod.stock > 0, is_out_of_stock: prod.stock <= 0 })));
        res.json({ success: true, products });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// GET /api/products/categories - Get unique category list
router.get('/categories', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const rows = yield db.all('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category ASC');
        const categories = rows.map((r) => r.category);
        res.json({ success: true, categories });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// GET /api/products/:id - Get product by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const product = yield db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        product.is_low_stock = product.stock <= product.low_stock_threshold && product.stock > 0;
        product.is_out_of_stock = product.stock <= 0;
        res.json({ success: true, product });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// POST /api/products - Create new product
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { name, category, price, stock = 0, low_stock_threshold = 5, icon = '🍖', description = '' } = req.body;
        if (!name || price === undefined || !category) {
            return res.status(400).json({ success: false, error: 'Name, category, and price are required' });
        }
        const numPrice = parseFloat(price);
        const numStock = parseInt(stock, 10) || 0;
        const numLowStock = parseInt(low_stock_threshold, 10) || 5;
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ success: false, error: 'Invalid price' });
        }
        const insertRes = yield db.run(`
      INSERT INTO products (name, category, price, stock, low_stock_threshold, icon, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [name.trim(), category.trim(), numPrice, numStock, numLowStock, icon.trim() || '🍖', description.trim()]);
        const newId = insertRes.lastID;
        if (newId && numStock > 0) {
            yield db.run(`
        INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, notes)
        VALUES (?, ?, ?, ?, 'INITIAL_STOCK', 'Initial stock on creation')
      `, [newId, name.trim(), numStock, numStock]);
        }
        const newProduct = yield db.get('SELECT * FROM products WHERE id = ?', [newId]);
        res.status(201).json({ success: true, product: newProduct });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/products/:id - Update product details
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { id } = req.params;
        const { name, category, price, low_stock_threshold, icon, description, is_active } = req.body;
        const existing = yield db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        const newName = name !== undefined ? name.trim() : existing.name;
        const newCategory = category !== undefined ? category.trim() : existing.category;
        const newPrice = price !== undefined ? parseFloat(price) : existing.price;
        const newLowStock = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : existing.low_stock_threshold;
        const newIcon = icon !== undefined ? icon.trim() : existing.icon;
        const newDescription = description !== undefined ? description.trim() : existing.description;
        const newActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;
        yield db.run(`
      UPDATE products
      SET name = ?, category = ?, price = ?, low_stock_threshold = ?, icon = ?, description = ?, is_active = ?, updated_at = DATETIME('now', 'localtime')
      WHERE id = ?
    `, [newName, newCategory, newPrice, newLowStock, newIcon, newDescription, newActive, id]);
        const updated = yield db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json({ success: true, product: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PATCH /api/products/:id/stock - Adjust or restock single product stock
router.patch('/:id/stock', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { id } = req.params;
        const { change_amount, new_stock, reason = 'MANUAL_ADJUSTMENT', notes = '' } = req.body;
        const product = yield db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        let resultingStock = product.stock;
        let actualChange = 0;
        if (new_stock !== undefined) {
            resultingStock = parseInt(new_stock, 10);
            actualChange = resultingStock - product.stock;
        }
        else if (change_amount !== undefined) {
            actualChange = parseInt(change_amount, 10);
            resultingStock = product.stock + actualChange;
        }
        else {
            return res.status(400).json({ success: false, error: 'Must provide change_amount or new_stock' });
        }
        if (isNaN(resultingStock) || resultingStock < 0) {
            resultingStock = 0;
            actualChange = 0 - product.stock;
        }
        yield db.run(`
      UPDATE products
      SET stock = ?, updated_at = DATETIME('now', 'localtime')
      WHERE id = ?
    `, [resultingStock, id]);
        yield db.run(`
      INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, product.name, actualChange, resultingStock, reason, notes]);
        const updated = yield db.get('SELECT * FROM products WHERE id = ?', [id]);
        res.json({ success: true, product: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// DELETE /api/products/:id - Soft delete (deactivate) product
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { id } = req.params;
        const product = yield db.get('SELECT * FROM products WHERE id = ?', [id]);
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        yield db.run(`
      UPDATE products
      SET is_active = 0, updated_at = DATETIME('now', 'localtime')
      WHERE id = ?
    `, [id]);
        res.json({ success: true, message: `Product '${product.name}' deactivated successfully` });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
exports.default = router;
