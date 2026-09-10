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
// GET /api/reports/eod - End of Day Cash & Sales Summary
router.get('/eod', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield (0, db_1.getDb)();
        const { date, startDate, endDate } = req.query;
        let dateCondition = "DATE(t.created_at) = DATE('now', 'localtime')";
        const dateParams = [];
        if (startDate && endDate) {
            dateCondition = "DATE(t.created_at) BETWEEN DATE(?) AND DATE(?)";
            dateParams.push(startDate, endDate);
        }
        else if (date && typeof date === 'string') {
            dateCondition = "DATE(t.created_at) = DATE(?)";
            dateParams.push(date);
        }
        // 1. Overview Totals (Completed transactions)
        const totalsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'VOIDED' THEN 1 END) as voided_orders,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN subtotal ELSE 0 END), 0) as total_subtotal,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN tax ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN discount ELSE 0 END), 0) as total_discount,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'VOIDED' THEN total ELSE 0 END), 0) as total_voided_amount
      FROM transactions t
      WHERE ${dateCondition}
    `;
        const totals = yield db.get(totalsQuery, dateParams);
        const completedOrders = (totals === null || totals === void 0 ? void 0 : totals.completed_orders) || 0;
        const totalRevenue = (totals === null || totals === void 0 ? void 0 : totals.total_revenue) || 0;
        const avgOrderValue = completedOrders > 0 ? parseFloat((totalRevenue / completedOrders).toFixed(2)) : 0;
        // 2. Payment Method Breakdown
        const paymentsQuery = `
      SELECT 
        payment_method,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_amount
      FROM transactions t
      WHERE ${dateCondition} AND status = 'COMPLETED'
      GROUP BY payment_method
    `;
        const payments = yield db.all(paymentsQuery, dateParams);
        let cashTotal = 0;
        let cardTotal = 0;
        let transferTotal = 0;
        for (const p of payments) {
            if (p.payment_method === 'CASH')
                cashTotal = p.total_amount;
            else if (p.payment_method === 'CARD')
                cardTotal = p.total_amount;
            else if (p.payment_method === 'TRANSFER')
                transferTotal = p.total_amount;
        }
        // 3. Product Sales Breakdown
        const productSalesQuery = `
      SELECT 
        ti.product_id,
        ti.product_name,
        ti.category,
        SUM(ti.quantity) as quantity_sold,
        SUM(ti.item_total) as revenue_generated
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ${dateCondition} AND t.status = 'COMPLETED'
      GROUP BY ti.product_id, ti.product_name, ti.category
      ORDER BY quantity_sold DESC, revenue_generated DESC
    `;
        const productSales = yield db.all(productSalesQuery, dateParams);
        const totalItemsSold = productSales.reduce((sum, item) => sum + item.quantity_sold, 0);
        // 4. Category Breakdown
        const categorySalesQuery = `
      SELECT 
        ti.category,
        SUM(ti.quantity) as quantity_sold,
        SUM(ti.item_total) as revenue_generated
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE ${dateCondition} AND t.status = 'COMPLETED'
      GROUP BY ti.category
      ORDER BY revenue_generated DESC
    `;
        const categorySales = yield db.all(categorySalesQuery, dateParams);
        // 5. Hourly Sales Trend
        const hourlySalesQuery = `
      SELECT 
        STRFTIME('%H:00', t.created_at) as hour,
        COUNT(*) as orders_count,
        SUM(t.total) as revenue
      FROM transactions t
      WHERE ${dateCondition} AND t.status = 'COMPLETED'
      GROUP BY hour
      ORDER BY hour ASC
    `;
        const hourlySales = yield db.all(hourlySalesQuery, dateParams);
        res.json({
            success: true,
            report_date: date || (startDate && endDate ? `${startDate} to ${endDate}` : new Date().toISOString().slice(0, 10)),
            summary: {
                completed_orders: completedOrders,
                voided_orders: (totals === null || totals === void 0 ? void 0 : totals.voided_orders) || 0,
                total_revenue: totalRevenue,
                total_tax: (totals === null || totals === void 0 ? void 0 : totals.total_tax) || 0,
                total_discount: (totals === null || totals === void 0 ? void 0 : totals.total_discount) || 0,
                total_voided_amount: (totals === null || totals === void 0 ? void 0 : totals.total_voided_amount) || 0,
                avg_order_value: avgOrderValue,
                total_items_sold: totalItemsSold,
                cash_revenue: cashTotal,
                card_revenue: cardTotal,
                transfer_revenue: transferTotal
            },
            payment_methods: payments,
            category_sales: categorySales,
            product_sales: productSales,
            hourly_sales: hourlySales
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}));
exports.default = router;
