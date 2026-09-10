"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalIpAddresses = getLocalIpAddresses;
const os_1 = __importDefault(require("os"));
function getLocalIpAddresses() {
    const interfaces = os_1.default.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        const netInterfaces = interfaces[name];
        if (!netInterfaces)
            continue;
        for (const net of netInterfaces) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            // Node 18+ uses family: 'IPv4' or 4
            const isIPv4 = net.family === 'IPv4' || net.family === 4;
            if (isIPv4 && !net.internal) {
                addresses.push(net.address);
            }
        }
    }
    return addresses;
}
