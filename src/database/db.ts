import path from 'path';

export interface DatabaseWrapper {
  all<T = any>(sql: string, params?: any[] | any): Promise<T[]>;
  get<T = any>(sql: string, params?: any[] | any): Promise<T | undefined>;
  run(sql: string, params?: any[] | any): Promise<{ lastID?: number; changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export type Database = DatabaseWrapper;

let dbInstance: DatabaseWrapper | null = null;

// In-memory data store for the mock
const state = {
  products: [] as any[],
  transactions: [] as any[],
  transactionItems: [] as any[],
  inventoryLogs: [] as any[],
  settings: new Map<string, string>(),
  lastProductId: 0,
  lastTransactionId: 0,
};

export async function getDb(): Promise<DatabaseWrapper> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = {
    async all<T = any>(sql: string, params?: any[] | any): Promise<T[]> {
      const p = (Array.isArray(params) ? params : [params]).filter(x => x !== undefined);
      
      if (sql.includes('GROUP BY payment_method')) {
        const methods = ['CASH', 'QRPH', 'CARD', 'TRANSFER', 'UNPAID'];
        const res = [];
        for (const m of methods) {
           const orders = state.transactions.filter(t => (t.status === 'COMPLETED' || t.status === 'PENDING') && t.payment_method === m);
           if (orders.length > 0) {
              res.push({
                payment_method: m,
                order_count: orders.length,
                total_amount: orders.reduce((acc, t) => acc + (t.total || 0), 0)
              });
           }
        }
        return res as T[];
      }

      if (sql.includes('GROUP BY ti.product_id')) {
        const validTransIds = state.transactions.filter(t => t.status === 'COMPLETED' || t.status === 'PENDING').map(t => t.id);
        const items = state.transactionItems.filter(ti => validTransIds.includes(ti.transaction_id));
        const grouped: any = {};
        for (const it of items) {
           if (!grouped[it.product_id]) grouped[it.product_id] = { product_id: it.product_id, product_name: it.product_name, category: it.category, quantity_sold: 0, revenue_generated: 0 };
           grouped[it.product_id].quantity_sold += it.quantity;
           grouped[it.product_id].revenue_generated += it.item_total;
        }
        return Object.values(grouped).sort((a: any, b: any) => b.revenue_generated - a.revenue_generated) as T[];
      }

      if (sql.includes('GROUP BY ti.category')) {
        const validTransIds = state.transactions.filter(t => t.status === 'COMPLETED' || t.status === 'PENDING').map(t => t.id);
        const items = state.transactionItems.filter(ti => validTransIds.includes(ti.transaction_id));
        const grouped: any = {};
        for (const it of items) {
           if (!grouped[it.category]) grouped[it.category] = { category: it.category, quantity_sold: 0, revenue_generated: 0 };
           grouped[it.category].quantity_sold += it.quantity;
           grouped[it.category].revenue_generated += it.item_total;
        }
        return Object.values(grouped).sort((a: any, b: any) => b.revenue_generated - a.revenue_generated) as T[];
      }

      if (sql.includes('GROUP BY hour')) {
        const validTrans = state.transactions.filter(t => t.status === 'COMPLETED' || t.status === 'PENDING');
        const grouped: any = {};
        for (const t of validTrans) {
           const d = new Date(t.created_at || Date.now());
           const hr = d.getHours().toString().padStart(2, '0') + ':00';
           if (!grouped[hr]) grouped[hr] = { hour: hr, orders_count: 0, revenue: 0 };
           grouped[hr].orders_count++;
           grouped[hr].revenue += (t.total || 0);
        }
        return Object.values(grouped).sort((a: any, b: any) => a.hour.localeCompare(b.hour)) as T[];
      }

      if (sql.includes('SELECT DISTINCT category FROM products')) {
        let res = [...state.products];
        if (sql.includes('is_active = 1')) res = res.filter(x => x.is_active);
        const categories = Array.from(new Set(res.map(x => x.category))).sort();
        return categories.map(c => ({ category: c })) as T[];
      }
      if (sql.includes('FROM products')) {
        let res = [...state.products];
        if (sql.includes('is_active = 1')) res = res.filter(x => x.is_active);
        return res as T[];
      }
      if (sql.includes('FROM transactions')) {
        let res = [...state.transactions];
        if (sql.includes('status = ?')) {
          // Find the status parameter (it's the first one before limit/offset)
          const statusParam = p.find(x => typeof x === 'string' && (x === 'PENDING' || x === 'COMPLETED' || x === 'VOIDED'));
          if (statusParam) {
            res = res.filter(x => x.status === statusParam);
          }
        }
        return res as T[];
      }
      if (sql.includes('FROM transaction_items')) {
        let res = [...state.transactionItems];
        if (sql.includes('transaction_id = ?') && p.length > 0) {
          res = res.filter(x => x.transaction_id == p[0]);
        }
        return res as T[];
      }
      if (sql.includes('FROM inventory_logs')) {
        return state.inventoryLogs as T[];
      }
      if (sql.includes('FROM settings')) {
        return Array.from(state.settings.entries()).map(([k, v]) => ({ key: k, value: v })) as T[];
      }
      return [] as T[];
    },

    async get<T = any>(sql: string, params?: any[] | any): Promise<T | undefined> {
      const p = Array.isArray(params) ? params : [params];
      
      if (sql.includes("COUNT(CASE WHEN status = 'COMPLETED'")) {
        const completed_orders = state.transactions.filter(t => t.status === 'COMPLETED').length;
        const pending_orders = state.transactions.filter(t => t.status === 'PENDING').length;
        const voided_orders = state.transactions.filter(t => t.status === 'VOIDED').length;
        const total_subtotal = state.transactions.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.subtotal || 0), 0);
        const total_tax = state.transactions.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.tax || 0), 0);
        const total_discount = state.transactions.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.discount || 0), 0);
        const total_revenue = state.transactions.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.total || 0), 0);
        const pending_revenue = state.transactions.filter(t => t.status === 'PENDING').reduce((acc, t) => acc + (t.total || 0), 0);
        const total_voided_amount = state.transactions.filter(t => t.status === 'VOIDED').reduce((acc, t) => acc + (t.total || 0), 0);

        return {
          completed_orders, pending_orders, voided_orders,
          total_subtotal, total_tax, total_discount,
          total_revenue, pending_revenue, total_voided_amount
        } as T;
      }

      if (sql.includes('SELECT COUNT(*)')) {
        return { count: state.products.length } as any;
      }
      if (sql.includes('FROM products WHERE id')) {
        return state.products.find(x => x.id == p[0]) as T | undefined;
      }
      if (sql.includes('FROM transactions WHERE id')) {
        return state.transactions.find(x => x.id == p[0]) as T | undefined;
      }
      if (sql.includes('FROM settings WHERE key')) {
        let key = p[0];
        if (key === undefined) {
           const match = sql.match(/WHERE key = '([^']+)'/);
           if (match) key = match[1];
        }
        if (key) {
           const val = state.settings.get(key);
           return val ? { key, value: val } as any : undefined;
        }
        return undefined;
      }
      return undefined;
    },

    async run(sql: string, params?: any[] | any): Promise<{ lastID?: number; changes: number }> {
      const p = Array.isArray(params) ? params : [params];
      
      if (sql.includes('INSERT OR IGNORE INTO settings')) {
        if (!state.settings.has(p[0])) {
          state.settings.set(p[0], p[1]);
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      
      if (sql.includes('INSERT INTO products')) {
        state.lastProductId++;
        const pObj = {
          id: state.lastProductId,
          name: p[0], category: p[1], price: p[2], stock: p[3], 
          low_stock_threshold: p[4], icon: p[5], description: p[6],
          is_active: p[7] !== undefined ? p[7] : 1
        };
        state.products.push(pObj);
        return { lastID: state.lastProductId, changes: 1 };
      }
      
      if (sql.includes('DELETE FROM products')) {
        const id = p[0];
        const idx = state.products.findIndex(x => x.id == id);
        if (idx !== -1) {
          state.products.splice(idx, 1);
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      if (sql.includes('INSERT INTO transactions')) {
        state.lastTransactionId++;
        const tObj = {
          id: state.lastTransactionId,
          receipt_number: p[0],
          subtotal: p[1],
          tax: p[2],
          discount: p[3],
          total: p[4],
          payment_method: p[5],
          amount_tendered: p[6],
          change_due: p[7],
          status: p[8],
          cashier_note: p[9],
          created_at: new Date().toISOString()
        };
        state.transactions.unshift(tObj); // put newest first
        return { lastID: state.lastTransactionId, changes: 1 };
      }

      if (sql.includes('INSERT INTO inventory_logs')) {
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

      if (sql.includes('INSERT INTO transaction_items')) {
        const tiObj = {
          id: state.transactionItems.length + 1,
          transaction_id: p[0],
          product_id: p[1],
          product_name: p[2],
          category: p[3],
          unit_price: p[4],
          quantity: p[5],
          item_total: p[6]
        };
        state.transactionItems.push(tiObj);
        return { changes: 1 };
      }

      if (sql.includes('UPDATE transactions')) {
        const id = p[p.length - 1];
        const trans = state.transactions.find(x => x.id == id);
        if (trans) {
          if (sql.includes('SET status = \'COMPLETED\'')) {
             trans.status = 'COMPLETED';
             trans.payment_method = p[0];
             trans.amount_tendered = p[1];
             trans.change_due = p[2];
             trans.cashier_note = p[3];
          } else if (sql.includes('SET status = \'VOIDED\'')) {
             trans.status = 'VOIDED';
             trans.void_reason = p[0];
          }
          return { changes: 1 };
        }
        return { changes: 0 };
      }

      if (sql.includes('UPDATE products')) {
        const id = p[p.length - 1];
        const prod = state.products.find(x => x.id == id);
        if (prod) {
          if (sql.includes('SET name = ?')) {
             prod.name = p[0];
             prod.category = p[1];
             prod.price = p[2];
             prod.low_stock_threshold = p[3];
             prod.icon = p[4];
             prod.description = p[5];
             prod.is_active = p[6];
          } else if (sql.includes('SET stock = stock + ?')) {
             prod.stock = prod.stock + p[0];
          } else if (sql.includes('SET stock = ?')) {
             prod.stock = p[0];
          } else if (sql.includes('SET is_active = 0')) {
             prod.is_active = 0;
          }
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      
      if (sql.includes('UPDATE settings')) {
        let key = p[1];
        if (key === undefined) {
           const match = sql.match(/WHERE key = '([^']+)'/);
           if (match) key = match[1];
        }
        if (key) {
           state.settings.set(key, String(p[0]));
        }
        return { changes: 1 };
      }

      if (sql.includes('INSERT INTO settings') || sql.includes('INSERT OR IGNORE INTO settings')) {
        state.settings.set(p[0], String(p[1]));
        return { changes: 1 };
      }

      return { changes: 0 };
    },

    async exec(sql: string): Promise<void> {
      // Mock exec
    },

    async close(): Promise<void> {
      dbInstance = null;
    }
  };

  return dbInstance;
}

export async function initDatabase(): Promise<Database> {
  const db = await getDb();
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['business_name', 'Smokin\' BBQ & Brews']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['currency_symbol', '$']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['admin_pin', '1234']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['tax_rate', '0']);
  return db;
}

export async function seedInitialProducts() {
  const db = await getDb();
  const countRow = await db.get('SELECT COUNT(*) as count FROM products');
  if (countRow && (countRow as any).count > 0) {
    return;
  }

  const sampleProducts = [
    // BBQ Category
    { name: 'Smoked Pulled Pork Sandwich', category: 'BBQ', price: 9.50, stock: 25, low_stock_threshold: 5, icon: '🥪', description: 'Slow-smoked pork shoulder with house BBQ sauce & slaw' },
    { name: 'Beef Brisket Plate', category: 'BBQ', price: 14.00, stock: 15, low_stock_threshold: 4, icon: '🥩', description: '12-hour oak smoked sliced Texas brisket' },
    { name: 'BBQ Ribs (Half Rack)', category: 'BBQ', price: 13.50, stock: 12, low_stock_threshold: 3, icon: '🍖', description: 'St. Louis cut glazed with honey-chipotle BBQ sauce' },
    { name: 'Smoked Chicken Wings (6pc)', category: 'BBQ', price: 8.50, stock: 20, low_stock_threshold: 5, icon: '🍗', description: 'Crispy smoked wings tossed in choice of sauce' },
    { name: 'Smoked Sausage Link', category: 'BBQ', price: 6.00, stock: 18, low_stock_threshold: 5, icon: '🌭', description: 'Jalapeño cheddar beef sausage link' },
    { name: 'BBQ Loaded Fries', category: 'BBQ', price: 8.00, stock: 15, low_stock_threshold: 4, icon: '🍟', description: 'Crispy fries topped with pulled pork, cheese & BBQ drizzle' },

    // Sides Category
    { name: 'Mac & Cheese', category: 'Sides', price: 4.00, stock: 20, low_stock_threshold: 5, icon: '🧀', description: 'Creamy 3-cheese baked elbow pasta' },
    { name: 'Coleslaw', category: 'Sides', price: 3.00, stock: 20, low_stock_threshold: 5, icon: '🥗', description: 'Fresh tangy vinegar slaw' },
    { name: 'Baked BBQ Beans', category: 'Sides', price: 3.50, stock: 15, low_stock_threshold: 4, icon: '🫘', description: 'Sweet & savory beans with burnt ends' },
    { name: 'Cornbread Muffin', category: 'Sides', price: 2.50, stock: 30, low_stock_threshold: 8, icon: '🌽', description: 'Honey butter skillet cornbread' },

    // Beverages Category
    { name: 'Craft Draft Beer (Pint)', category: 'Drinks', price: 6.00, stock: 40, low_stock_threshold: 10, icon: '🍺', description: 'Local chilled draft IPA / Lager' },
    { name: 'Domestic Canned Beer', category: 'Drinks', price: 4.50, stock: 35, low_stock_threshold: 10, icon: '🍻', description: 'Ice cold refreshing can' },
    { name: 'Sweet Iced Tea', category: 'Drinks', price: 2.50, stock: 30, low_stock_threshold: 8, icon: '🧋', description: 'Southern brewed sweet black tea' },
    { name: 'Fresh Lemonade', category: 'Drinks', price: 3.00, stock: 25, low_stock_threshold: 6, icon: '🍋', description: 'Freshly squeezed country lemonade' },
    { name: 'Soda Can (Cola/Sprite/Dr.Pepper)', category: 'Drinks', price: 2.00, stock: 50, low_stock_threshold: 12, icon: '🥤', description: 'Chilled 12oz soda can' },
    { name: 'Bottled Spring Water', category: 'Drinks', price: 1.50, stock: 45, low_stock_threshold: 10, icon: '💧', description: '16.9oz pure spring water' }
  ];

  for (const prod of sampleProducts) {
    await db.run(
      'INSERT INTO products (name, category, price, stock, low_stock_threshold, icon, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', 
      [prod.name, prod.category, prod.price, prod.stock, prod.low_stock_threshold, prod.icon, prod.description]
    );
  }
}
