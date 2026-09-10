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
const network_1 = require("../utils/network");
const db_1 = require("../database/db");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const addresses = (0, network_1.getLocalIpAddresses)();
        const port = process.env.PORT || 3000;
        const businessNameRow = yield db.get("SELECT value FROM settings WHERE key = 'business_name'");
        res.json({
            success: true,
            business_name: (businessNameRow === null || businessNameRow === void 0 ? void 0 : businessNameRow.value) || 'BBQ POS System',
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
}));
exports.default = router;
