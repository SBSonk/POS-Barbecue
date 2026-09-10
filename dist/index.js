"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverPromise = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./database/db");
const products_1 = __importDefault(require("./routes/products"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const reports_1 = __importDefault(require("./routes/reports"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const settings_1 = __importDefault(require("./routes/settings"));
const info_1 = __importDefault(require("./routes/info"));
const network_1 = require("./utils/network");
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static frontend assets from 'public' folder
const publicPath = path_1.default.join(process.cwd(), 'public');
app.use(express_1.default.static(publicPath));
// API Routes
app.use('/api/products', products_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/info', info_1.default);
// Fallback to index.html for SPA routing
app.use((_req, res) => {
    res.sendFile(path_1.default.join(publicPath, 'index.html'));
});
async function startServer() {
    try {
        // 1. Initialize SQLite Database & Seed Default Products
        await (0, db_1.initDatabase)();
        await (0, db_1.seedInitialProducts)();
        // 2. Start Express Server on 0.0.0.0 (all network interfaces for local Wi-Fi)
        const server = app.listen(PORT, '0.0.0.0', () => {
            const ips = (0, network_1.getLocalIpAddresses)();
            console.log('\n' + '='.repeat(60));
            console.log('       🍖 SMOKIN\' BBQ & BREWS POS SYSTEM 🍺');
            console.log('='.repeat(60));
            console.log(` ✅ Server successfully running on PORT ${PORT}!`);
            console.log('\n 📱 HOW TO ACCESS FROM DEVICES ON SAME WI-FI NETWORK:');
            console.log(`    💻 Laptop Browser:  http://localhost:${PORT}`);
            if (ips.length > 0) {
                ips.forEach(ip => {
                    console.log(`    📲 Mobile / Tablet: http://${ip}:${PORT}`);
                });
            }
            else {
                console.log(`    📲 Mobile / Tablet: http://<YOUR_LAPTOP_IP>:${PORT}`);
            }
            console.log('\n 🔒 Default Admin PIN: 1234');
            console.log('='.repeat(60) + '\n');
        });
        return server;
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
const serverPromise = startServer();
exports.serverPromise = serverPromise;
