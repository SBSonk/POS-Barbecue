# 🍖 Smokin' BBQ & Brews — Local POS System

A lightweight, zero-cloud, mobile-first Point of Sale (POS) system specifically built for small food and beverage operations (BBQ joints, food trucks, pop-up stalls, and drink bars).

The server runs completely offline/locally on a spare laptop acting as the central hub and database, while staff access the touch-friendly cashier and admin dashboard from their smartphones or tablets over the local Wi-Fi network.

---

## 🛠️ Recommended Tech Stack

| Layer | Technology | Why It Was Chosen |
|---|---|---|
| **Runtime & Server** | **Node.js + Express (TypeScript)** | Extremely lightweight, fast startup, zero runtime memory bloat, native HTTP server support. |
| **Database** | **SQLite (`sqlite3` + `sqlite`)** | Single-file database (`pos.db`), zero daemon/server installation needed, full ACID transactions (vital for stock deduction and voiding consistency), instant backups by simply copying `pos.db`. |
| **Frontend** | **Vanilla HTML5 / CSS3 / JavaScript (ES6+ SPA)** | Zero client build overhead, served directly by Express static middleware, blazing fast on mobile browsers, ultra touch-optimized with large tap targets. |
| **Network & Discovery** | **Node.js `os.networkInterfaces()`** | Automatically detects the laptop's LAN IP address on startup and displays it in the terminal and in the UI header for staff. |

---

## 📁 Folder Structure

```text
POS-Barbecue/
├── src/
│   ├── database/
│   │   └── db.ts             # SQLite connection, tables migration & seed data
│   ├── routes/
│   │   ├── products.ts       # Products catalog & stock adjustment CRUD
│   │   ├── transactions.ts   # Atomic checkout, order history & void/undo logic
│   │   ├── reports.ts        # End-of-Day (EOD) sales & cash reconciliation
│   │   ├── inventory.ts      # Low stock alerts & bulk restock wizard
│   │   ├── settings.ts       # Store name, currency, tax & PIN security
│   │   └── info.ts           # Server port & LAN IP auto-detection
│   ├── utils/
│   │   └── network.ts        # IPv4 local network interface resolver
│   └── index.ts              # Express entrypoint & static asset server
├── public/
│   ├── index.html            # Single-page touch UI (Cashier & Admin views)
│   ├── css/
│   │   └── styles.css        # Responsive mobile-first CSS with large touch targets
│   └── js/
│       ├── api.js            # Frontend REST API client
│       ├── cashier.js        # Cashier grid, cart stepper & checkout logic
│       ├── admin.js          # PIN lock, menu manager, restock, void & EOD reports
│       └── app.js            # App orchestrator, view toggling & toast alerts
├── tests/
│   ├── api.test.ts           # Automated test suite (stock deduction, void, EOD)
│   └── http.test.ts          # End-to-end HTTP server verification
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database Schema

### 1. `products`
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique product identifier |
| `name` | `TEXT NOT NULL` | Product name (e.g., "Beef Brisket Plate") |
| `category` | `TEXT NOT NULL` | Grouping (e.g., "BBQ", "Drinks", "Sides") |
| `price` | `REAL NOT NULL` | Item unit price (e.g., `14.00`) |
| `stock` | `INTEGER NOT NULL DEFAULT 0` | Current available inventory count |
| `low_stock_threshold` | `INTEGER NOT NULL DEFAULT 5` | Alert trigger limit (e.g., `<= 5`) |
| `icon` | `TEXT DEFAULT '🍖'` | Emoji or visual icon displayed on card |
| `description` | `TEXT` | Ingredient/portion notes |
| `is_active` | `INTEGER NOT NULL DEFAULT 1` | `1` = Active on Cashier, `0` = Archived |
| `created_at` / `updated_at` | `TEXT` | Local timestamps |

### 2. `transactions`
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique internal transaction ID |
| `receipt_number` | `TEXT NOT NULL UNIQUE` | Human-readable receipt code (`BBQ-YYYYMMDD-XXXX`) |
| `subtotal` | `REAL NOT NULL` | Order total before tax & discount |
| `tax` | `REAL NOT NULL DEFAULT 0` | Calculated tax amount |
| `discount` | `REAL NOT NULL DEFAULT 0` | Discount applied |
| `total` | `REAL NOT NULL` | Final amount charged |
| `payment_method` | `TEXT NOT NULL DEFAULT 'CASH'` | `CASH`, `CARD`, or `TRANSFER` |
| `amount_tendered` | `REAL` | Cash handed over by customer |
| `change_due` | `REAL DEFAULT 0` | Change given back |
| `status` | `TEXT NOT NULL DEFAULT 'COMPLETED'`| `COMPLETED` or `VOIDED` |
| `void_reason` | `TEXT` | Why the transaction was undone |
| `voided_at` | `TEXT` | When the void occurred |
| `cashier_note` | `TEXT` | Table number, customer name, or custom note |
| `created_at` | `TEXT` | Timestamp of sale |

### 3. `transaction_items`
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Line item identifier |
| `transaction_id` | `INTEGER REFERENCES transactions(id)` | Parent transaction |
| `product_id` | `INTEGER REFERENCES products(id)` | Product purchased |
| `product_name` | `TEXT NOT NULL` | Name snapshot at time of purchase |
| `category` | `TEXT NOT NULL` | Category snapshot |
| `unit_price` | `REAL NOT NULL` | Price snapshot at time of purchase |
| `quantity` | `INTEGER NOT NULL` | Quantity purchased |
| `item_total` | `REAL NOT NULL` | `unit_price * quantity` |

### 4. `inventory_logs` (Audit Trail)
| Column | Type | Description |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Log entry ID |
| `product_id` | `INTEGER REFERENCES products(id)` | Product affected |
| `product_name` | `TEXT NOT NULL` | Product name snapshot |
| `change_amount` | `INTEGER NOT NULL` | Delta (e.g. `-2` for sale, `+2` for void restore, `+25` for restock) |
| `resulting_stock` | `INTEGER NOT NULL` | Stock count after this action |
| `reason` | `TEXT NOT NULL` | `SALE`, `VOID_RESTORE`, `RESTOCK`, `MANUAL_ADJUSTMENT`, `INITIAL_STOCK` |
| `reference_id` | `INTEGER` | Related transaction ID |
| `notes` | `TEXT` | Details / receipt reference |
| `created_at` | `TEXT` | Timestamp |

### 5. `settings`
| Column | Type | Description |
|---|---|---|
| `key` | `TEXT PRIMARY KEY` | Setting identifier (`business_name`, `currency_symbol`, `admin_pin`, `tax_rate`) |
| `value` | `TEXT NOT NULL` | Setting value |

---

## 🚀 How to Run the Server on the Spare Laptop

### 1. Prerequisites
- Install **Node.js** (v18, v20, or v22) on the spare laptop from [nodejs.org](https://nodejs.org/).

### 2. Install Dependencies & Build
Open PowerShell or Command Prompt in the project directory:
```powershell
npm install
npm run build
```

### 3. Start the POS Server
```powershell
npm start
```
You will see output similar to:
```text
============================================================
       🍖 SMOKIN' BBQ & BREWS POS SYSTEM 🍺
============================================================
 ✅ Server successfully running on PORT 3000!

 📱 HOW TO ACCESS FROM DEVICES ON SAME WI-FI NETWORK:
    💻 Laptop Browser:  http://localhost:3000
    📲 Mobile / Tablet: http://192.168.1.150:3000

 🔒 Default Admin PIN: 1234
============================================================
```

---

## 📱 How to Access from Smartphones / Tablets

### Step 1: Connect to the Same Local Wi-Fi
Ensure the spare laptop and the mobile phones / tablets are connected to the **same Wi-Fi router** (or a Wi-Fi hotspot hosted by the laptop/phone).

### Step 2: Allow Port 3000 Through Windows Firewall (One-Time Setup)
If mobile devices cannot connect immediately, allow port 3000 in Windows Firewall on the laptop:
1. Open PowerShell **as Administrator** on the laptop.
2. Run:
```powershell
New-NetFirewallRule -DisplayName "BBQ POS Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Step 3: Open the Web App on Mobile
1. Open Safari (iOS) or Chrome (Android) on your phone.
2. Type the address shown on the laptop screen (e.g., `http://192.168.1.150:3000`).
3. **Pro-Tip (Full Screen POS App):**
   - **iPhone (Safari):** Tap the Share button ➔ select **"Add to Home Screen"**.
   - **Android (Chrome):** Tap the 3 dots menu ➔ select **"Add to Home screen"** / **"Install App"**.
   - The POS will now open full-screen like a native app without browser URL bars!

---

## 💡 Core Feature Guide

### 1. Cashier Touch Interface
- **Category Filter Pills:** Switch between *All, BBQ, Sides, Drinks* with one tap.
- **Product Cards:** Large tap targets with emoji, item name, price, and real-time inventory count.
- **Visual Low Stock Warnings:**
  - `⚠️ Only X Left` (orange pulsing badge) when stock falls to or below the alert threshold.
  - `Out of Stock` (greyed out card) when stock reaches 0, preventing accidental overselling.
- **Cart Stepper:** Quickly add or decrement quantities (`-` / `+`), or clear the cart with one tap.

### 2. Simple Checkout & Instant Change Calculator
- Tap **"Pay $XX.XX"** on the cart to bring up the payment modal.
- Select payment mode: **Cash (default)**, **Card (POS terminal)**, or **Transfer**.
- For cash payments:
  - Tap quick tender preset buttons (**Exact**, **$10**, **$20**, **$50**, **$100**).
  - The system automatically calculates and highlights the **Change Due** in large green numbers.
- Tap **"Confirm Payment"**:
  - The transaction is recorded.
  - Inventory is atomically subtracted in SQLite.
  - An inventory log entry is created.
  - A clean digital receipt appears with a **"Print"** and **"New Order"** button.

### 3. PIN-Protected Admin Dashboard (Default PIN: `1234`)
- Tap the **Admin** button in the top right.
- Enter the 4-digit PIN on the touch numeric keypad.
- Non-technical owners can easily:
  - **Menu & Products:** Add new food/drink items, change prices, update alert thresholds, or deactivate seasonal items.
  - **Quick Restock:** Tap `+5`, `+10`, `+25` buttons next to any ingredient or drink to quickly update inventory upon delivery.
  - **Orders & Undo/Void:** View transaction history. If a staff member enters an accidental order or a customer cancels, tap **"Undo / Void"**; the system marks the order as voided and **automatically restores all items back to stock**.
  - **End of Day (EOD) Summary:** View total daily revenue, cash in drawer, card revenue, order counts, product sales rankings, category breakdown, and hourly peak rush distribution. Tap **"Print Report"** to print or save a daily PDF.
  - **Settings:** Update the restaurant name, currency symbol, tax rate, or change the Admin PIN.

---

## 🧪 Running Automated Tests

Run the test suite to verify database transactions, stock deduction, void restoration, and EOD calculations:
```powershell
npm test
```
Run the HTTP server integration test:
```powershell
npx tsx tests/http.test.ts
```
