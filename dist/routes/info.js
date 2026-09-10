"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const network_1 = require("../utils/network");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const addresses = (0, network_1.getLocalIpAddresses)();
        const port = process.env.PORT || 3000;
        const businessNameRow = await db.get("SELECT value FROM settings WHERE key = 'business_name'");
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
