import DatabaseSync from 'better-sqlite3';
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
let rawSyncDb: any | null = null;

function normalizeParams(params?: any[] | any): any[] {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

export async function getDb(): Promise<DatabaseWrapper> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'pos.db');

  rawSyncDb = new DatabaseSync(dbPath);

  // Enable foreign keys
  rawSyncDb.exec('PRAGMA foreign_keys = ON');

  dbInstance = {
    async all<T = any>(sql: string, params?: any[] | any): Promise<T[]> {
      if (!rawSyncDb) throw new Error('Database not initialized');
      const stmt = rawSyncDb.prepare(sql);
      const rows = stmt.all(...normalizeParams(params));
      return rows as T[];
    },

    async get<T = any>(sql: string, params?: any[] | any): Promise<T | undefined> {
      if (!rawSyncDb) throw new Error('Database not initialized');
      const stmt = rawSyncDb.prepare(sql);
      const row = stmt.get(...normalizeParams(params));
      return row as T | undefined;
    },

    async run(sql: string, params?: any[] | any): Promise<{ lastID?: number; changes: number }> {
      if (!rawSyncDb) throw new Error('Database not initialized');
      const stmt = rawSyncDb.prepare(sql);
      const result = stmt.run(...normalizeParams(params));
      return {
        lastID: result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : undefined,
        changes: Number(result.changes || 0),
      };
    },

    async exec(sql: string): Promise<void> {
      if (!rawSyncDb) throw new Error('Database not initialized');
      rawSyncDb.exec(sql);
    },

    async close(): Promise<void> {
      if (rawSyncDb) {
        rawSyncDb.close();
        rawSyncDb = null;
        dbInstance = null;
      }
    }
  };

  return dbInstance;
}

export async function initDatabase(): Promise<Database> {
  const db = await getDb();

  // 1. Products table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      icon TEXT DEFAULT '🍖',
      description TEXT DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    );
  `);

  // 2. Transactions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      amount_tendered REAL,
      change_due REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'VOIDED'
      void_reason TEXT,
      voided_at TEXT,
      cashier_note TEXT,
      created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    );
  `);

  // 3. Transaction Items table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      item_total REAL NOT NULL
    );
  `);

  // 4. Inventory Logs table (audit trail for stock tracking)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      change_amount INTEGER NOT NULL,
      resulting_stock INTEGER NOT NULL,
      reason TEXT NOT NULL, -- 'SALE', 'VOID_RESTORE', 'RESTOCK', 'MANUAL_ADJUSTMENT', 'INITIAL_STOCK'
      reference_id INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
    );
  `);

  // 5. Settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Initialize default settings if not exists
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['business_name', 'Smokin\' BBQ & Brews']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['currency_symbol', '$']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['admin_pin', '1234']);
  await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', ['tax_rate', '0']);

  return db;
}

export async function seedInitialProducts() {
  const db = await getDb();
  const countRow = await db.get('SELECT COUNT(*) as count FROM products');
  if (countRow && countRow.count > 0) {
    return; // Already seeded
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
    const res = await db.run(`
      INSERT INTO products (name, category, price, stock, low_stock_threshold, icon, description, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [prod.name, prod.category, prod.price, prod.stock, prod.low_stock_threshold, prod.icon, prod.description]);

    const prodId = res.lastID;
    if (prodId) {
      await db.run(`
        INSERT INTO inventory_logs (product_id, product_name, change_amount, resulting_stock, reason, notes)
        VALUES (?, ?, ?, ?, 'INITIAL_STOCK', 'Initial seed stock')
      `, [prodId, prod.name, prod.stock, prod.stock]);
    }
  }
}
