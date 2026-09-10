const fs = require('fs');
let code = fs.readFileSync('src/database/db.ts', 'utf8');

const replacement = `      if (sql.includes('INSERT INTO transaction_items')) {`;

const logsLogic = `      if (sql.includes('INSERT INTO inventory_logs')) {
        let reason = '';
        let reference_id = null;
        let notes = '';
        
        if (sql.includes('RESTOCK')) {
          reason = 'RESTOCK';
          notes = p[4] || '';
        } else if (sql.includes('INITIAL_STOCK')) {
          reason = 'INITIAL_STOCK';
          notes = 'Initial stock on creation';
        } else if (sql.includes('SALE')) {
          reason = 'SALE';
          reference_id = p[4];
          notes = p[5] || '';
        } else if (sql.includes('VOID_RESTORE')) {
          reason = 'VOID_RESTORE';
          reference_id = p[4];
          notes = p[5] || '';
        } else {
          reason = p[4] || '';
          notes = p[5] || '';
        }

        const dt = new Date();
        const dateStr = dt.toISOString().split('T')[0] + ' ' + dt.toTimeString().split(' ')[0];

        const logObj = {
          id: state.inventoryLogs.length + 1,
          product_id: p[0],
          product_name: p[1],
          change_amount: p[2],
          resulting_stock: p[3],
          reason,
          reference_id,
          notes,
          created_at: dateStr
        };
        state.inventoryLogs.unshift(logObj);
        return { changes: 1 };
      }

      if (sql.includes('INSERT INTO transaction_items')) {`;

code = code.replace(replacement, logsLogic);
fs.writeFileSync('src/database/db.ts', code);
