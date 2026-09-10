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
// POST /api/settings/verify-pin - Verify admin PIN
router.post('/verify-pin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { pin } = req.body;
        if (!pin) {
            return res.status(400).json({ success: false, authorized: false, error: 'PIN is required' });
        }
        const currentPinRow = yield db.get("SELECT value FROM settings WHERE key = 'admin_pin'");
        const currentPin = (currentPinRow === null || currentPinRow === void 0 ? void 0 : currentPinRow.value) || '1234';
        if (String(pin).trim() === String(currentPin).trim()) {
            return res.json({ success: true, authorized: true, message: 'PIN verified' });
        }
        else {
            return res.status(401).json({ success: false, authorized: false, error: 'Invalid PIN' });
        }
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// GET /api/settings - Get public business settings
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const rows = yield db.all('SELECT key, value FROM settings');
        const settings = {};
        for (const r of rows) {
            if (r.key === 'admin_pin') {
                settings.has_custom_pin = r.value !== '1234' ? 'true' : 'false';
            }
            else {
                settings[r.key] = r.value;
            }
        }
        res.json({ success: true, settings });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/settings - Update business settings
router.put('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { business_name, currency_symbol, tax_rate } = req.body;
        const upsertSetting = (key, value) => __awaiter(void 0, void 0, void 0, function* () {
            const existing = yield db.get('SELECT key FROM settings WHERE key = ?', [key]);
            if (existing) {
                yield db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
            }
            else {
                yield db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
            }
        });
        if (business_name !== undefined)
            yield upsertSetting('business_name', String(business_name).trim());
        if (currency_symbol !== undefined)
            yield upsertSetting('currency_symbol', String(currency_symbol).trim());
        if (tax_rate !== undefined)
            yield upsertSetting('tax_rate', String(tax_rate).trim());
        res.json({ success: true, message: 'Settings updated successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
// PUT /api/settings/pin - Change Admin PIN
router.put('/pin', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { current_pin, new_pin } = req.body;
        if (!new_pin || String(new_pin).trim().length < 4) {
            return res.status(400).json({ success: false, error: 'New PIN must be at least 4 digits/characters' });
        }
        const currentPinRow = yield db.get("SELECT value FROM settings WHERE key = 'admin_pin'");
        const currentPin = (currentPinRow === null || currentPinRow === void 0 ? void 0 : currentPinRow.value) || '1234';
        if (String(current_pin).trim() !== String(currentPin).trim()) {
            return res.status(401).json({ success: false, error: 'Current PIN is incorrect' });
        }
        yield db.run("UPDATE settings SET value = ? WHERE key = 'admin_pin'", [String(new_pin).trim()]);
        res.json({ success: true, message: 'Admin PIN changed successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
exports.default = router;
