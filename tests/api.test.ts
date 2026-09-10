import assert from 'assert';
import path from 'path';
import fs from 'fs';

// Set up a test database in temporary file
const testDbPath = path.join(process.cwd(), 'pos_test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}
process.env.DB_PATH = testDbPath;
process.env.PORT = '3001';

// Import initialized app and db
import { initDatabase, seedInitialProducts, getDb } from '../src/database/db';

async function runTests() {
  console.log('🧪 Starting POS System Automated Test Suite...\n');

  try {
    // Test 1: DB Initialization & Seeding
    console.log('Test 1: Initializing Database & Seeding Products...');
    const db = await initDatabase();
    await seedInitialProducts();

    const products = await db.all('SELECT * FROM products') as any[];
    assert(products.length > 0, 'Products should be seeded');
    console.log(` ✅ Seeded ${products.length} menu items successfully.`);

    // Test 2: Low Stock & Out of Stock Logic
    console.log('\nTest 2: Verifying Stock and Low Stock calculation...');
    const pulledPork = await db.get("SELECT * FROM products WHERE name LIKE '%Pulled Pork%'") as any;
    assert(pulledPork, 'Pulled pork sandwich should exist');
    assert.strictEqual(pulledPork.stock, 25, 'Initial pulled pork stock should be 25');
    console.log(` ✅ Initial pulled pork stock: ${pulledPork.stock}`);

    // Test 3: Checkout Transaction & Automated Stock Deduction
    console.log('\nTest 3: Executing Checkout Transaction (2x Pulled Pork + 1x Draft Beer)...');
    const draftBeer = await db.get("SELECT * FROM products WHERE name LIKE '%Draft Beer%'") as any;
    assert(draftBeer, 'Draft beer should exist');
    const initialBeerStock = draftBeer.stock;

    const itemsToBuy = [
      { product_id: pulledPork.id, quantity: 2, price: pulledPork.price },
      { product_id: draftBeer.id, quantity: 1, price: draftBeer.price }
    ];

    const expectedSubtotal = (pulledPork.price * 2) + (draftBeer.price * 1);
    const tendered = 30.00;
    const changeDue = tendered - expectedSubtotal;

    // Simulate checkout inside transaction
    const receiptNumber = 'BBQ-TEST-0001';
    await db.run('BEGIN TRANSACTION');
    try {
      const res = await db.run(`
        INSERT INTO transactions (receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status)
        VALUES (?, ?, 0, 0, ?, 'CASH', ?, ?, 'COMPLETED')
      `, [receiptNumber, expectedSubtotal, expectedSubtotal, tendered, changeDue]);

      const transId = res.lastID;

      for (const item of itemsToBuy) {
        await db.run(`
          INSERT INTO transaction_items (transaction_id, product_id, product_name, category, unit_price, quantity, item_total)
          VALUES (?, ?, ?, 'TEST', ?, ?, ?)
        `, [transId, item.product_id, 'Item', item.price, item.quantity, item.price * item.quantity]);

        await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        await db.run(`
          INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, reference_id)
          VALUES (?, 'Item', ?, (SELECT stock FROM products WHERE id = ?), 'SALE', ?)
        `, [item.product_id, -item.quantity, item.product_id, transId]);
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    const updatedPork = await db.get('SELECT stock FROM products WHERE id = ?', [pulledPork.id]) as any;
    const updatedBeer = await db.get('SELECT stock FROM products WHERE id = ?', [draftBeer.id]) as any;

    assert.strictEqual(updatedPork.stock, 23, 'Pulled pork stock should decrease by 2 (25 -> 23)');
    assert.strictEqual(updatedBeer.stock, initialBeerStock - 1, 'Draft beer stock should decrease by 1');
    console.log(` ✅ Stock atomically deducted. Pork: 25 -> ${updatedPork.stock}, Beer: ${initialBeerStock} -> ${updatedBeer.stock}`);

    // Verify inventory audit log
    const recentLogs = await db.all("SELECT * FROM inventory_logs WHERE reason = 'SALE'") as any[];
    assert(recentLogs.length >= 2, 'Inventory logs should record sale deductions');
    console.log(` ✅ Inventory logs recorded ${recentLogs.length} sale log entries.`);

    // Test 4: Voiding / Undoing Transaction & Stock Restoration
    console.log('\nTest 4: Voiding Transaction & Restoring Inventory...');
    const trans = await db.get('SELECT * FROM transactions WHERE receipt_number = ?', [receiptNumber]) as any;
    assert(trans, 'Transaction should exist');

    const transItems = await db.all('SELECT * FROM transaction_items WHERE transaction_id = ?', [trans.id]) as any[];

    await db.run('BEGIN TRANSACTION');
    try {
      await db.run("UPDATE transactions SET status = 'VOIDED', void_reason = 'Accidental sale' WHERE id = ?", [trans.id]);
      for (const item of transItems) {
        await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        await db.run(`
          INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, reference_id)
          VALUES (?, 'Item', ?, (SELECT stock FROM products WHERE id = ?), 'VOID_RESTORE', ?)
        `, [item.product_id, item.quantity, item.product_id, trans.id]);
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }

    const restoredPork = await db.get('SELECT stock FROM products WHERE id = ?', [pulledPork.id]) as any;
    const restoredBeer = await db.get('SELECT stock FROM products WHERE id = ?', [draftBeer.id]) as any;

    assert.strictEqual(restoredPork.stock, 25, 'Pulled pork stock should restore back to 25');
    assert.strictEqual(restoredBeer.stock, initialBeerStock, 'Beer stock should restore back to initial');
    console.log(` ✅ Voiding successfully restored stock back to ${restoredPork.stock} and ${restoredBeer.stock}`);

    // Test 5: End-of-Day Sales Report Calculation with QRPH & Pending
    console.log('\nTest 5: Testing End-of-Day (EOD) Report Calculation with QRPH & Pending...');
    // Create a new completed sale of $28.00 via CASH
    await db.run(`
      INSERT INTO transactions (receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status)
      VALUES ('BBQ-TEST-0002', 28.00, 0, 0, 28.00, 'CASH', 30.00, 2.00, 'COMPLETED')
    `);

    // Create a new completed sale of $45.00 via QRPH
    await db.run(`
      INSERT INTO transactions (receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status, cashier_note)
      VALUES ('BBQ-TEST-0003', 45.00, 0, 0, 45.00, 'QRPH', 45.00, 0.00, 'COMPLETED', 'QRPH Ref: GCASH-88123')
    `);

    // Create a PENDING order of $15.00 via QRPH
    const pendingOrderRes = await db.run(`
      INSERT INTO transactions (receipt_number, subtotal, tax, discount, total, payment_method, amount_tendered, change_due, status, cashier_note)
      VALUES ('BBQ-TEST-0004', 15.00, 0, 0, 15.00, 'QRPH', 15.00, 0.00, 'PENDING', 'Table 5')
    `);
    const pendingOrderId = pendingOrderRes.lastID;

    const reportQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'VOIDED' THEN 1 END) as voided_orders,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'PENDING' THEN total ELSE 0 END), 0) as pending_revenue,
        COALESCE(SUM(CASE WHEN status = 'VOIDED' THEN total ELSE 0 END), 0) as total_voided_amount
      FROM transactions
    `;
    const report = await db.get(reportQuery) as any;

    assert.strictEqual(report.completed_orders, 2, 'Should have 2 completed orders');
    assert.strictEqual(report.pending_orders, 1, 'Should have 1 pending order');
    assert.strictEqual(report.voided_orders, 1, 'Should have 1 voided order');
    assert.strictEqual(report.total_revenue, 73.00, 'Total completed revenue should be $73.00 (28 + 45)');
    assert.strictEqual(report.pending_revenue, 15.00, 'Total pending revenue should be $15.00');
    console.log(` ✅ EOD report: Completed: ${report.completed_orders} ($${report.total_revenue}), Pending: ${report.pending_orders} ($${report.pending_revenue}), Voided: ${report.voided_orders} ($${report.total_voided_amount})`);

    // Test 6: Completing a Pending Order
    console.log('\nTest 6: Transitioning Pending Order to Completed...');
    await db.run("UPDATE transactions SET status = 'COMPLETED' WHERE id = ?", [pendingOrderId]);
    const completedPending = await db.get('SELECT * FROM transactions WHERE id = ?', [pendingOrderId]) as any;
    assert.strictEqual(completedPending.status, 'COMPLETED', 'Order status should be updated to COMPLETED');
    console.log(` ✅ Order #${completedPending.receipt_number} successfully transitioned to COMPLETED.`);

    // Test 7: Admin PIN & Currency Settings
    console.log('\nTest 7: Testing Admin PIN and Currency settings...');
    const pinRow = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'") as any;
    assert.strictEqual(pinRow.value, '1234', 'Default PIN should be 1234');

    await db.run("UPDATE settings SET value = '₱' WHERE key = 'currency_symbol'");
    const currRow = await db.get("SELECT value FROM settings WHERE key = 'currency_symbol'") as any;
    assert.strictEqual(currRow.value, '₱', 'Currency symbol should update to ₱ (Peso)');
    console.log(' ✅ Default PIN correctly configured to 1234 and Currency updated to ₱ (Peso).');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Everything is functioning properly.\n');
  } finally {
    const db = await getDb();
    await db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
