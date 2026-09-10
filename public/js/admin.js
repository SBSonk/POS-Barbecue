// Admin Dashboard Logic
const Admin = {
  isAuthenticated: false,
  pinEntered: '',
  currentTab: 'products',
  products: [],
  categories: [],
  settings: {},
  productSort: 'category',
  restockCategory: 'ALL',
  restockSort: 'category',
  restockSearch: '',
  allRestockProducts: [],

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // PIN keypad buttons
    const keys = document.querySelectorAll('.pin-key');
    keys.forEach(k => {
      k.addEventListener('click', (e) => {
        const val = e.currentTarget.getAttribute('data-val');
        this.handlePinKey(val);
      });
    });

    // Admin Tabs
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Product Form Submit
    const productForm = document.getElementById('product-modal-form');
    if (productForm) {
      productForm.addEventListener('submit', (e) => this.handleSaveProduct(e));
    }

    // Settings Form Submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // PIN Change Form Submit
    const pinForm = document.getElementById('pin-change-form');
    if (pinForm) {
      pinForm.addEventListener('submit', (e) => this.handleChangePin(e));
    }
  },

  openPinModal() {
    if (this.isAuthenticated) {
      App.showAdminView();
      return;
    }

    this.pinEntered = '';
    this.updatePinDisplay();
    document.getElementById('pin-error-msg').textContent = '';
    document.getElementById('pin-modal').classList.remove('hidden');
  },

  closePinModal() {
    document.getElementById('pin-modal').classList.add('hidden');
    this.pinEntered = '';
  },

  handlePinKey(val) {
    if (val === 'clear') {
      this.pinEntered = '';
    } else if (val === 'back') {
      this.pinEntered = this.pinEntered.slice(0, -1);
    } else if (val !== null && this.pinEntered.length < 8) {
      this.pinEntered += val;
    }

    this.updatePinDisplay();

    // Auto verify when 4 digits reached
    if (this.pinEntered.length === 4) {
      this.verifyPin();
    }
  },

  updatePinDisplay() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < this.pinEntered.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  },

  async verifyPin() {
    const errorEl = document.getElementById('pin-error-msg');
    try {
      const res = await API.verifyPIN(this.pinEntered);
      if (res.success && res.authorized) {
        this.isAuthenticated = true;
        this.closePinModal();
        App.showAdminView();
        App.showToast('Admin access granted', 'success');
      } else {
        errorEl.textContent = 'Incorrect PIN. Default is 1234';
        this.pinEntered = '';
        this.updatePinDisplay();
      }
    } catch (err) {
      errorEl.textContent = 'Server connection error';
      this.pinEntered = '';
      this.updatePinDisplay();
    }
  },

  async switchTab(tab) {
    this.currentTab = tab;
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    switch (tab) {
      case 'products':
        await this.renderProductsTab();
        break;
      case 'inventory':
        await this.renderInventoryTab();
        break;
      case 'transactions':
        await this.renderTransactionsTab();
        break;
      case 'reports':
        await this.renderReportsTab();
        break;
      case 'settings':
        await this.renderSettingsTab();
        break;
    }
  },

  // -------------------------------------------------------------
  // TAB 1: PRODUCT MANAGEMENT
  // -------------------------------------------------------------
  handleProductSort(sortKey) {
    this.productSort = sortKey;
    this.renderProductsTab(false);
  },

  getSortedProducts() {
    let list = [...this.products];
    if (this.productSort === 'category') {
      list.sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (this.productSort === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (this.productSort === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.productSort === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.productSort === 'stock_asc') {
      list.sort((a, b) => a.stock - b.stock);
    } else if (this.productSort === 'stock_desc') {
      list.sort((a, b) => b.stock - a.stock);
    }
    return list;
  },

  async renderProductsTab(fetchData = true) {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    if (fetchData) {
      content.innerHTML = `<div style="text-align:center; padding: 40px;">Loading products...</div>`;
      try {
        const [prodRes, setRes] = await Promise.all([
          API.getProducts({ activeOnly: false }),
          API.getSettings()
        ]);
        this.products = prodRes.products || [];
        this.currency = setRes.settings?.currency_symbol || '$';
      } catch (err) {
        content.innerHTML = `<div style="color: red; padding: 20px;">Failed to load products: ${err.message}</div>`;
        return;
      }
    }

    const sortedProducts = this.getSortedProducts();

    content.innerHTML = `
      <div class="admin-card">
        <div class="admin-card-header" style="flex-wrap: wrap; gap: 12px;">
          <div style="flex: 1; min-width: 250px;">
            <div class="admin-card-title">🍗 Product & Menu Management</div>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Add, edit items, adjust prices, or configure low stock alert limits.</p>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <select style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9rem;" onchange="Admin.handleProductSort(this.value)">
              <option value="category" ${this.productSort === 'category' ? 'selected' : ''}>Sort: Category</option>
              <option value="name_asc" ${this.productSort === 'name_asc' ? 'selected' : ''}>Sort: Name (A-Z)</option>
              <option value="price_asc" ${this.productSort === 'price_asc' ? 'selected' : ''}>Sort: Price (Low to High)</option>
              <option value="price_desc" ${this.productSort === 'price_desc' ? 'selected' : ''}>Sort: Price (High to Low)</option>
              <option value="stock_asc" ${this.productSort === 'stock_asc' ? 'selected' : ''}>Sort: Stock (Low to High)</option>
              <option value="stock_desc" ${this.productSort === 'stock_desc' ? 'selected' : ''}>Sort: Stock (High to Low)</option>
            </select>
            <button class="btn btn-primary" onclick="Admin.openProductModal()">+ Add New Product</button>
          </div>
        </div>

        <div class="admin-products-grid">
          ${sortedProducts.map(p => `
              <div class="admin-product-card" style="${!p.is_active ? 'opacity: 0.7;' : ''}">
                <div class="admin-product-card-header">
                  <div class="admin-product-card-title">
                    <span class="admin-product-card-title-icon">${p.icon || '🍖'}</span>
                    <div>
                      <strong>${p.name}</strong>
                      ${p.description ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${p.description}</div>` : ''}
                    </div>
                  </div>
                  <span style="background: rgba(128, 128, 128, 0.15); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${p.category}</span>
                </div>
                
                <div class="admin-product-card-body">
                  <div class="admin-product-card-stat">
                    <span class="admin-product-card-stat-label">Price</span>
                    <span style="font-weight: 700; color: var(--primary);">${this.currency}${p.price.toFixed(2)}</span>
                  </div>
                  <div class="admin-product-card-stat">
                    <span class="admin-product-card-stat-label">Stock</span>
                    <span class="product-stock-badge ${p.stock <= 0 ? 'stock-out' : (p.stock <= p.low_stock_threshold ? 'stock-low' : 'stock-ok')}">
                      ${p.stock} in stock
                    </span>
                  </div>
                  <div class="admin-product-card-stat">
                    <span class="admin-product-card-stat-label">Alert Limit</span>
                    <span>${p.low_stock_threshold}</span>
                  </div>
                  <div class="admin-product-card-stat">
                    <span class="admin-product-card-stat-label">Status</span>
                    <span style="color: ${p.is_active ? '#2b8a3e' : '#c92a2a'}; font-weight: 600;">
                      ${p.is_active ? '● Active' : '○ Disabled'}
                    </span>
                  </div>
                </div>

                <div class="admin-product-card-actions">
                  <button class="btn btn-secondary" style="flex: 1; padding: 8px;" onclick="Admin.openProductModal(${p.id})">✏️ Edit</button>
                  ${p.is_active ? `
                    <button class="btn btn-danger" style="flex: 1; padding: 8px;" onclick="Admin.toggleProductStatus(${p.id})">Disable</button>
                  ` : `
                    <button class="btn btn-success" style="flex: 1; padding: 8px;" onclick="Admin.reactivateProduct(${p.id})">Enable</button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
  },

  openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-modal-form');
    const deleteBtn = document.getElementById('product-delete-btn');

    form.reset();
    document.getElementById('product-id-input').value = '';
    deleteBtn.classList.add('hidden');
    deleteBtn.dataset.confirm = 'false';
    deleteBtn.innerHTML = '🗑️ Delete';

    if (productId) {
      title.textContent = 'Edit Product';
      deleteBtn.classList.remove('hidden');
      const prod = this.products.find(p => p.id === productId);
      if (prod) {
        document.getElementById('product-id-input').value = prod.id;
        document.getElementById('product-name-input').value = prod.name;
        document.getElementById('product-category-input').value = prod.category;
        document.getElementById('product-price-input').value = prod.price;
        document.getElementById('product-stock-input').value = prod.stock;
        document.getElementById('product-low-stock-input').value = prod.low_stock_threshold;
        document.getElementById('product-icon-input').value = prod.icon || '🍖';
        document.getElementById('product-desc-input').value = prod.description || '';
      }
    } else {
      title.textContent = 'Add New BBQ / Drink Product';
      document.getElementById('product-stock-input').value = '20';
      document.getElementById('product-low-stock-input').value = '5';
      document.getElementById('product-icon-input').value = '🍖';
    }

    modal.classList.remove('hidden');
  },

  closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
  },

  async handleSaveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id-input').value;
    const name = document.getElementById('product-name-input').value.trim();
    const category = document.getElementById('product-category-input').value.trim();
    const price = parseFloat(document.getElementById('product-price-input').value);
    const stock = parseInt(document.getElementById('product-stock-input').value, 10);
    const low_stock_threshold = parseInt(document.getElementById('product-low-stock-input').value, 10);
    const icon = document.getElementById('product-icon-input').value.trim() || '🍖';
    const description = document.getElementById('product-desc-input').value.trim();

    if (!name || isNaN(price) || !category) {
      App.showToast('Please fill in Name, Category, and Price', 'warning');
      return;
    }

    const payload = { name, category, price, stock, low_stock_threshold, icon, description };

    try {
      if (id) {
        // Update
        const res = await API.updateProduct(id, payload);
        if (res.success) {
          // If stock was edited manually, update stock endpoint as well
          if (!isNaN(stock)) {
            await API.updateStock(id, { new_stock: stock, reason: 'ADMIN_EDIT', notes: 'Updated in edit modal' });
          }
          App.showToast('Product updated successfully', 'success');
        }
      } else {
        // Create
        const res = await API.createProduct(payload);
        if (res.success) {
          App.showToast('Product created successfully', 'success');
        }
      }

      this.closeProductModal();
      await this.renderProductsTab();
      Cashier.loadProducts(); // Update cashier catalog
    } catch (err) {
      App.showToast('Error saving product', 'danger');
    }
  },

  async toggleProductStatus(id) {
    if (true) {
      try {
        await API.deleteProduct(id);
        App.showToast('Product deactivated', 'success');
        await this.renderProductsTab();
        Cashier.loadProducts();
      } catch (err) {
        App.showToast('Failed to disable product', 'danger');
      }
    }
  },

  async deleteProductPermanently() {
    const id = document.getElementById('product-id-input').value;
    if (!id) return;
    
    const prod = this.products.find(p => p.id == id);
    if (!prod) return;

    const btn = document.getElementById('product-delete-btn');
    if (btn.dataset.confirm !== 'true') {
      btn.dataset.confirm = 'true';
      btn.innerHTML = '⚠️ Confirm Delete';
      setTimeout(() => {
        if (btn) {
          btn.dataset.confirm = 'false';
          btn.innerHTML = '🗑️ Delete';
        }
      }, 3000);
      return;
    }

    try {
      const res = await API.hardDeleteProduct(id);
      if (res.success) {
        App.showToast('Product permanently deleted', 'success');
        this.closeProductModal();
        await this.renderProductsTab();
        if (typeof Cashier !== 'undefined' && Cashier.loadProducts) {
          Cashier.loadProducts();
        }
      } else {
        App.showToast(res.error || 'Failed to delete product', 'danger');
      }
    } catch (err) {
      App.showToast('Error deleting product', 'danger');
    }
  },

  async reactivateProduct(id) {
    try {
      await API.updateProduct(id, { is_active: 1 });
      App.showToast('Product enabled', 'success');
      await this.renderProductsTab();
      Cashier.loadProducts();
    } catch (err) {
      App.showToast('Failed to enable product', 'danger');
    }
  },

  // -------------------------------------------------------------
  // TAB 2: INVENTORY & QUICK RESTOCK
  // -------------------------------------------------------------
  async renderInventoryTab() {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    content.innerHTML = `<div style="text-align:center; padding: 40px;">Loading inventory...</div>`;

    try {
      const [prodRes, lowRes, logsRes] = await Promise.all([
        API.getProducts({ activeOnly: true }),
        API.getLowStock(),
        API.getInventoryLogs({ limit: 25 })
      ]);

      this.allRestockProducts = prodRes.products || [];
      const lowItems = lowRes.items || [];
      const logs = logsRes.logs || [];

      // Extract unique categories
      const distinctCats = [...new Set(this.allRestockProducts.map(p => p.category).filter(Boolean))];

      content.innerHTML = `
        ${lowItems.length > 0 ? `
          <div class="admin-card" style="border-left: 4px solid #f59f00; background: var(--warning-bg);">
            <div class="admin-card-title" style="color: #e67700; display: flex; align-items: center; gap: 8px;">
              ⚠️ Low Stock Warnings (${lowItems.length} items need attention)
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
              ${lowItems.map(item => `
                <div style="background: var(--bg-card); border: 1px solid #ffd43b; border-radius: 8px; padding: 8px 12px; font-size: 0.9rem;">
                  <strong>${item.icon || '🍖'} ${item.name}:</strong> 
                  <span style="color: ${item.stock <= 0 ? 'red' : 'orange'}; font-weight: bold;">
                    ${item.stock <= 0 ? 'OUT OF STOCK' : `${item.stock} left (Limit: ${item.low_stock_threshold})`}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="admin-card">
          <div class="admin-card-header" style="flex-wrap: wrap; gap: 12px;">
            <div>
              <div class="admin-card-title">📦 Quick Inventory Restock</div>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Filter by Category, Drinks, Food, or search to fast-increment and adjust stock.</p>
            </div>

            <!-- Sorting & Search Controls -->
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" id="restock-search-input" placeholder="🔍 Search item..." 
                     value="${this.restockSearch}"
                     style="padding: 7px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem;"
                     oninput="Admin.handleRestockSearch(this.value)" />

              <select id="restock-sort-select" style="padding: 7px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem; font-weight: 600;" onchange="Admin.handleRestockSort(this.value)">
                <option value="category" ${this.restockSort === 'category' ? 'selected' : ''}>Sort: Category (Food / Drinks)</option>
                <option value="name_asc" ${this.restockSort === 'name_asc' ? 'selected' : ''}>Sort: Name (A-Z)</option>
                <option value="stock_asc" ${this.restockSort === 'stock_asc' ? 'selected' : ''}>Sort: Stock (Lowest First)</option>
                <option value="stock_desc" ${this.restockSort === 'stock_desc' ? 'selected' : ''}>Sort: Stock (Highest First)</option>
              </select>
            </div>
          </div>

          <!-- Category Filter Tabs / Pills -->
          <div class="restock-category-pills" id="restock-cat-pills" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            <button type="button" class="category-pill ${this.restockCategory === 'ALL' ? 'active' : ''}" onclick="Admin.handleRestockFilter('ALL', event)">All Items</button>
            <button type="button" class="category-pill ${this.restockCategory === 'FOOD' ? 'active' : ''}" onclick="Admin.handleRestockFilter('FOOD', event)">🍖 Food & BBQ</button>
            <button type="button" class="category-pill ${this.restockCategory === 'DRINKS' ? 'active' : ''}" onclick="Admin.handleRestockFilter('DRINKS', event)">🍹 Drinks & Beverages</button>
            ${distinctCats.filter(c => c !== 'Drinks' && c !== 'Beverages' && c !== 'BBQ' && c !== 'Food').map(c => `
              <button type="button" class="category-pill ${this.restockCategory === c ? 'active' : ''}" onclick="Admin.handleRestockFilter('${c}', event)">${c}</button>
            `).join('')}
          </div>

          <div style="overflow-x: auto;" id="restock-table-container">
            ${this.renderRestockTableHtml()}
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">📋 Stock Movement History (Audit Logs)</div>
          <div style="overflow-x: auto; margin-top: 10px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Resulting</th>
                  <th>Reason</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">${l.created_at}</td>
                    <td><strong>${l.product_name}</strong></td>
                    <td style="font-weight: bold; color: ${l.change_amount > 0 ? '#2b8a3e' : '#c92a2a'};">
                      ${l.change_amount > 0 ? `+${l.change_amount}` : l.change_amount}
                    </td>
                    <td>${l.resulting_stock}</td>
                    <td><span style="font-size: 0.75rem; background: rgba(128, 128, 128, 0.1); padding: 2px 6px; border-radius: 4px; font-weight: 600;">${l.reason}</span></td>
                    <td style="font-size: 0.8rem; color: #495057;">${l.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: red; padding: 20px;">Failed to load inventory: ${err.message}</div>`;
    }
  },

  getFilteredAndSortedRestockProducts() {
    let list = [...this.allRestockProducts];

    // Filter by Category
    if (this.restockCategory === 'FOOD') {
      list = list.filter(p => p.category !== 'Drinks' && p.category !== 'Beverages');
    } else if (this.restockCategory === 'DRINKS') {
      list = list.filter(p => p.category === 'Drinks' || p.category === 'Beverages');
    } else if (this.restockCategory !== 'ALL') {
      list = list.filter(p => p.category === this.restockCategory);
    }

    // Filter by Search Query
    if (this.restockSearch) {
      const q = this.restockSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Sort
    if (this.restockSort === 'category') {
      list.sort((a, b) => {
        const catCompare = (a.category || '').localeCompare(b.category || '');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (this.restockSort === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (this.restockSort === 'stock_asc') {
      list.sort((a, b) => a.stock - b.stock);
    } else if (this.restockSort === 'stock_desc') {
      list.sort((a, b) => b.stock - a.stock);
    }

    return list;
  },

  renderRestockTableHtml() {
    const products = this.getFilteredAndSortedRestockProducts();
    if (products.length === 0) {
      return `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No products found matching category "${this.restockCategory}"</p>
        </div>
      `;
    }

    return `
      <div class="admin-products-grid">
        ${products.map(p => `
          <div class="admin-product-card" style="${!p.is_active ? 'opacity: 0.7;' : ''}">
            <div class="admin-product-card-header">
              <div class="admin-product-card-title">
                <span class="admin-product-card-title-icon">${p.icon || '🍖'}</span>
                <div>
                  <strong>${p.name}</strong>
                </div>
              </div>
              <span style="background: transparent; border: 1px solid currentColor; color: ${p.category === 'Drinks' || p.category === 'Beverages' ? '#1971c2' : '#d9480f'}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
                ${p.category}
              </span>
            </div>
            
            <div class="admin-product-card-body">
              <div class="admin-product-card-stat">
                <span class="admin-product-card-stat-label">Current Stock</span>
                <span class="product-stock-badge ${p.stock <= 0 ? 'stock-out' : (p.stock <= p.low_stock_threshold ? 'stock-low' : 'stock-ok')}">
                  ${p.stock} units
                </span>
              </div>
              <div class="admin-product-card-stat" style="grid-column: span 2;">
                <span class="admin-product-card-stat-label" style="margin-bottom: 6px;">Quick Restock (+Qty)</span>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-secondary" style="flex:1; padding: 6px; font-weight: bold;" onclick="Admin.quickAddStock(${p.id}, 5)">+5</button>
                  <button class="btn btn-secondary" style="flex:1; padding: 6px; font-weight: bold;" onclick="Admin.quickAddStock(${p.id}, 10)">+10</button>
                  <button class="btn btn-secondary" style="flex:1; padding: 6px; font-weight: bold;" onclick="Admin.quickAddStock(${p.id}, 25)">+25</button>
                </div>
              </div>
            </div>

            <div class="admin-product-card-actions">
               <div style="display: flex; gap: 6px; align-items: center; width: 100%;">
                 <input type="number" min="0" value="${p.stock}" id="exact-stock-${p.id}" style="flex: 1; min-width: 60px; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 4px;" />
                 <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="Admin.saveExactStock(${p.id})">Set Exact</button>
               </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  handleRestockFilter(category, evt) {
    this.restockCategory = category;
    const pills = document.querySelectorAll('#restock-cat-pills .category-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('active');
    }
    const container = document.getElementById('restock-table-container');
    if (container) container.innerHTML = this.renderRestockTableHtml();
  },

  handleRestockSort(sortKey) {
    this.restockSort = sortKey;
    const container = document.getElementById('restock-table-container');
    if (container) container.innerHTML = this.renderRestockTableHtml();
  },

  handleRestockSearch(query) {
    this.restockSearch = query.trim();
    const container = document.getElementById('restock-table-container');
    if (container) container.innerHTML = this.renderRestockTableHtml();
  },

  async quickAddStock(productId, amount) {
    try {
      const res = await API.updateStock(productId, {
        change_amount: amount,
        reason: 'RESTOCK',
        notes: `Quick restock +${amount}`
      });
      if (res.success) {
        App.showToast(`Added +${amount} to stock`, 'success');
        await this.renderInventoryTab();
        Cashier.loadProducts();
      }
    } catch (err) {
      App.showToast('Failed to update stock', 'danger');
    }
  },

  async saveExactStock(productId) {
    const input = document.getElementById(`exact-stock-${productId}`);
    if (!input) return;

    const newStock = parseInt(input.value, 10);
    if (isNaN(newStock) || newStock < 0) {
      App.showToast('Please enter a valid stock number', 'warning');
      return;
    }

    try {
      const res = await API.updateStock(productId, {
        new_stock: newStock,
        reason: 'MANUAL_ADJUSTMENT',
        notes: 'Manual stock set by Admin'
      });
      if (res.success) {
        App.showToast('Stock updated successfully', 'success');
        await this.renderInventoryTab();
        Cashier.loadProducts();
      }
    } catch (err) {
      App.showToast('Failed to update stock', 'danger');
    }
  },

  // -------------------------------------------------------------
  // TAB 3: TRANSACTION HISTORY & VOID CHECKOUTS
  // -------------------------------------------------------------
  async renderTransactionsTab(dateFilter = '', statusFilter = 'ALL') {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    content.innerHTML = `<div style="text-align:center; padding: 40px;">Loading transactions...</div>`;

    try {
      const params = { limit: 100 };
      if (dateFilter) params.date = dateFilter;
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;

      const [transRes, setRes] = await Promise.all([
        API.getTransactions(params),
        API.getSettings()
      ]);

      const transactions = transRes.transactions || [];
      const currency = setRes.settings?.currency_symbol || '$';

      content.innerHTML = `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <div class="admin-card-title">🧾 Orders, Pending Queue & Voiding</div>
              <p style="color: var(--text-muted); font-size: 0.85rem;">View all orders, mark pending orders completed, or undo accidental checkouts.</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="date" id="trans-date-filter" value="${dateFilter}" style="padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px;" onchange="Admin.filterTransactions()" />
              <select id="trans-status-filter" style="padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 6px; font-weight: 600;" onchange="Admin.filterTransactions()">
                <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>🕒 Pending Only</option>
                <option value="COMPLETED" ${statusFilter === 'COMPLETED' ? 'selected' : ''}>✅ Completed Only</option>
                <option value="VOIDED" ${statusFilter === 'VOIDED' ? 'selected' : ''}>❌ Voided Only</option>
              </select>
            </div>
          </div>

          ${transactions.length === 0 ? `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
              <p>No transactions found for the selected filter.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${transactions.map(t => {
                const isVoided = t.status === 'VOIDED';
                const isPending = t.status === 'PENDING';
                const itemsList = (t.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ');

                let statusBadge = `<span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: bold; background: var(--success-bg); color: #2b8a3e;">● COMPLETED</span>`;
                if (isPending) {
                  statusBadge = `<span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: bold; background: var(--warning-bg); color: #f59f00;">🕒 PENDING</span>`;
                } else if (isVoided) {
                  statusBadge = `<span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 12px; font-weight: bold; background: var(--danger-bg); color: #c92a2a;">✕ VOIDED</span>`;
                }

                const payBadge = t.payment_method === 'QRPH'
                  ? `<span style="font-size: 0.8rem; background: #e6fcf5; color: #0ca678; font-weight: 700; padding: 2px 6px; border-radius: 4px;">🇵🇭 QRPH</span>`
                  : `<span style="font-size: 0.8rem; background: rgba(128, 128, 128, 0.1); padding: 2px 6px; border-radius: 4px;">💵 ${t.payment_method}</span>`;

                return `
                  <div style="border: 1px solid ${isVoided ? '#ffa8a8' : (isPending ? '#ffe066' : 'var(--border-color)')}; background: ${isVoided ? 'var(--danger-bg)' : (isPending ? 'var(--warning-bg)' : 'var(--bg-card)')}; border-radius: 12px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <strong style="font-size: 1.05rem;">Receipt #${t.receipt_number}</strong>
                        ${statusBadge}
                        ${payBadge}
                      </div>
                      <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                        🕒 ${t.created_at} ${t.cashier_note ? ` • Note: <em>"${t.cashier_note}"</em>` : ''}
                      </div>
                      <div style="font-size: 0.88rem; color: #495057; margin-top: 6px;">
                        <strong>Items:</strong> ${itemsList}
                      </div>
                      ${isVoided ? `
                        <div style="font-size: 0.8rem; color: #c92a2a; margin-top: 4px;">
                          ❌ Voided at ${t.voided_at} (Reason: ${t.void_reason || 'Manual Void'})
                        </div>
                      ` : ''}
                    </div>

                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="text-align: right;">
                        <div style="font-size: 1.3rem; font-weight: 800; color: ${isVoided ? '#adb5bd; text-decoration: line-through;' : '#212529'};">
                          ${currency}${t.total.toFixed(2)}
                        </div>
                        ${t.payment_method === 'CASH' && !isVoided ? `
                          <div style="font-size: 0.75rem; color: var(--text-muted);">Change: ${currency}${(t.change_due || 0).toFixed(2)}</div>
                        ` : ''}
                      </div>

                      <div style="display: flex; gap: 6px;">
                        ${isPending ? `
                          <button class="btn btn-primary" style="padding: 8px 12px; font-size: 0.85rem;" onclick="Admin.completeOrderFromAdmin(${t.id}, '${t.receipt_number}')">
                            ✅ Complete
                          </button>
                        ` : ''}

                        ${!isVoided ? `
                          <button class="btn btn-danger" style="padding: 8px 12px; font-size: 0.85rem;" onclick="Admin.promptVoidTransaction(${t.id}, '${t.receipt_number}', ${t.total}, this)">
                            ↩️ Void
                          </button>
                        ` : `
                          <span style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Stock restored</span>
                        `}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: red; padding: 20px;">Failed to load transactions: ${err.message}</div>`;
    }
  },

  async completeOrderFromAdmin(id, receiptNumber) {
    try {
      const res = await API.completeTransaction(id);
      if (res.success) {
        App.showToast(`Order #${receiptNumber} marked as completed!`, 'success');
        this.filterTransactions();
        if (typeof Pending !== 'undefined' && Pending.loadPendingOrders) {
          Pending.loadPendingOrders();
        }
      } else {
        App.showToast(res.error || 'Failed to complete order', 'danger');
      }
    } catch (err) {
      App.showToast('Error completing order', 'danger');
    }
  },

  filterTransactions() {
    const dateInput = document.getElementById('trans-date-filter');
    const statusSelect = document.getElementById('trans-status-filter');
    this.renderTransactionsTab(dateInput ? dateInput.value : '', statusSelect ? statusSelect.value : 'ALL');
  },

  async promptVoidTransaction(id, receiptNumber, total, btnElement) {
    if (btnElement && btnElement.dataset.confirm !== 'true') {
      btnElement.dataset.confirm = 'true';
      const originalHtml = btnElement.innerHTML;
      btnElement.innerHTML = 'Sure?';
      setTimeout(() => {
        if (btnElement) {
          btnElement.dataset.confirm = 'false';
          btnElement.innerHTML = originalHtml;
        }
      }, 3000);
      return;
    }

    try {
      const res = await API.voidTransaction(id, 'Customer cancelled / Accidental entry');
      if (res.success) {
        App.showToast(`Receipt #${receiptNumber} voided & stock restored!`, 'success');
        this.filterTransactions();
        Cashier.loadProducts(); // Update stock in cashier grid
      } else {
        App.showToast(res.error || 'Failed to void transaction', 'danger');
      }
    } catch (err) {
      App.showToast('Network error while voiding', 'danger');
    }
  },

  // -------------------------------------------------------------
  // TAB 4: END OF DAY (EOD) CASH & SALES SUMMARY
  // -------------------------------------------------------------
  async renderReportsTab(selectedDate = '') {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    content.innerHTML = `<div style="text-align:center; padding: 40px;">Generating End-of-Day report...</div>`;

    try {
      const targetDate = selectedDate || new Date().toISOString().slice(0, 10);
      const [reportRes, setRes] = await Promise.all([
        API.getEODReport({ date: targetDate }),
        API.getSettings()
      ]);

      if (!reportRes.success) {
        content.innerHTML = `<div style="color: red; padding: 20px;">Failed to load report: ${reportRes.error}</div>`;
        return;
      }

      const s = reportRes.summary;
      const currency = setRes.settings?.currency_symbol || '$';
      const storeName = setRes.settings?.business_name || 'Smokin\' BBQ & Brews';

      content.innerHTML = `
        <div class="admin-card">
          <div class="admin-card-header">
            <div>
              <div class="admin-card-title">📊 End-of-Day (EOD) Cash & Sales Report</div>
              <p style="color: var(--text-muted); font-size: 0.85rem;">Daily sales revenue, cash drawer reconciliation, item breakdown, and peak hours.</p>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <input type="date" id="eod-date-picker" value="${targetDate}" style="padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; font-weight: 600;" onchange="Admin.renderReportsTab(this.value)" />
              <button class="btn btn-secondary" onclick="window.print()">🖨️ Print Report</button>
            </div>
          </div>

          <!-- Printable Area for EOD Report -->
          <div class="printable-area">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="font-size: 1.5rem; margin-bottom: 4px;">🍖 ${storeName}</h2>
              <h3 style="font-size: 1.1rem; color: #495057;">End of Day Summary • ${targetDate}</h3>
            </div>

            <!-- Metric Cards -->
            <div class="metrics-grid">
              <div class="metric-card highlight">
                <div class="metric-card-label">Total Completed Revenue</div>
                <div class="metric-card-value">${currency}${s.total_revenue.toFixed(2)}</div>
              </div>

              <div class="metric-card" style="border-left: 4px solid #2b8a3e;">
                <div class="metric-card-label">💵 Cash Collected</div>
                <div class="metric-card-value" style="color: #2b8a3e;">${currency}${s.cash_revenue.toFixed(2)}</div>
              </div>

              <div class="metric-card" style="border-left: 4px solid #0ca678;">
                <div class="metric-card-label">🇵🇭 QRPH Payments</div>
                <div class="metric-card-value" style="color: #0ca678;">${currency}${(s.qrph_revenue || 0).toFixed(2)}</div>
              </div>

              <div class="metric-card" style="border-left: 4px solid #f59f00;">
                <div class="metric-card-label">🕒 Pending In Queue</div>
                <div class="metric-card-value" style="color: #f59f00;">${s.pending_orders || 0} <span style="font-size: 0.85rem; font-weight: normal;">(${currency}${(s.pending_revenue || 0).toFixed(2)})</span></div>
              </div>

              <div class="metric-card">
                <div class="metric-card-label">Orders Completed</div>
                <div class="metric-card-value">${s.completed_orders} <span style="font-size: 0.9rem; font-weight: normal; color: var(--text-muted);">(${s.total_items_sold} items)</span></div>
              </div>

              <div class="metric-card" style="border-left: 4px solid #c92a2a;">
                <div class="metric-card-label">Voided Orders</div>
                <div class="metric-card-value" style="color: #c92a2a;">${s.voided_orders} <span style="font-size: 0.85rem; font-weight: normal;">(${currency}${s.total_voided_amount.toFixed(2)})</span></div>
              </div>
            </div>

            <!-- Product Breakdown Table -->
            <div style="margin-top: 24px;">
              <h4 style="font-size: 1.1rem; margin-bottom: 12px;">🍗 Product Sales Breakdown</h4>
              ${(reportRes.product_sales || []).length === 0 ? `
                <p style="color: var(--text-muted); font-style: italic;">No sales recorded on this date.</p>
              ` : `
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity Sold</th>
                      <th>Total Sales</th>
                      <th>% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportRes.product_sales.map(ps => {
                      const pct = s.total_revenue > 0 ? ((ps.revenue_generated / s.total_revenue) * 100).toFixed(1) : '0.0';
                      return `
                        <tr>
                          <td><strong>${ps.product_name}</strong></td>
                          <td><span style="background: rgba(128, 128, 128, 0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${ps.category}</span></td>
                          <td style="font-weight: bold;">${ps.quantity_sold}</td>
                          <td style="font-weight: bold; color: var(--primary);">${currency}${ps.revenue_generated.toFixed(2)}</td>
                          <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                              <span>${pct}%</span>
                              <div style="flex: 1; max-width: 80px; height: 6px; background: rgba(128, 128, 128, 0.15); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${pct}%; height: 100%; background: #d9480f;"></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              `}
            </div>

            <!-- Category Sales Table -->
            <div style="margin-top: 24px;">
              <h4 style="font-size: 1.1rem; margin-bottom: 12px;">📊 Category Revenue</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                ${(reportRes.category_sales || []).map(cs => `
                  <div style="background: var(--bg-app); border: 1px solid #dee2e6; border-radius: 8px; padding: 12px;">
                    <div style="font-weight: bold; font-size: 1rem;">${cs.category}</div>
                    <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary); margin: 4px 0;">${currency}${cs.revenue_generated.toFixed(2)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${cs.quantity_sold} items sold</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="color: red; padding: 20px;">Failed to generate EOD report: ${err.message}</div>`;
    }
  },

  // -------------------------------------------------------------
  // TAB 5: SETTINGS & PIN MANAGEMENT
  // -------------------------------------------------------------
  async renderSettingsTab() {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    try {
      const [setRes, infoRes] = await Promise.all([
        API.getSettings(),
        API.getInfo()
      ]);

      const s = setRes.settings || {};
      const ips = infoRes.local_ips || [];
      const port = infoRes.port || 3000;

      content.innerHTML = `
        <div class="admin-card">
          <div class="admin-card-title">🏪 Store & Business Settings</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Customize your store name, currency symbol, and tax rate.</p>

          <form id="settings-form" style="max-width: 480px;">
            <div class="form-group">
              <label class="form-label">Business Name</label>
              <input type="text" id="setting-name" class="form-input" value="${s.business_name || 'Smokin\' BBQ & Brews'}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Currency Symbol</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button type="button" class="btn btn-secondary" style="padding: 5px 12px; font-size: 0.85rem; font-weight: 700;" onclick="document.getElementById('setting-currency').value = '₱'">
                  ₱ (Philippine Peso)
                </button>
                <button type="button" class="btn btn-secondary" style="padding: 5px 12px; font-size: 0.85rem; font-weight: 700;" onclick="document.getElementById('setting-currency').value = '$'">
                  $ (USD)
                </button>
                <button type="button" class="btn btn-secondary" style="padding: 5px 12px; font-size: 0.85rem; font-weight: 700;" onclick="document.getElementById('setting-currency').value = 'PHP'">
                  PHP
                </button>
              </div>
              <input type="text" id="setting-currency" class="form-input" value="${s.currency_symbol || '₱'}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Tax Rate (%) (0 for no tax)</label>
              <input type="number" step="0.1" min="0" id="setting-tax" class="form-input" value="${s.tax_rate || '0'}" />
            </div>

            <button type="submit" class="btn btn-primary">Save Settings</button>
          </form>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">🎨 Appearance Settings</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Customize how the application looks on this device (changes apply immediately).</p>
          
          <div style="display: flex; gap: 30px; flex-wrap: wrap;">
            <div>
              <label class="form-label">Theme Mode</label>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn btn-secondary" onclick="App.setTheme('light')" style="padding: 10px 16px; font-weight: bold;">☀️ Light</button>
                <button type="button" class="btn btn-secondary" onclick="App.setTheme('dark')" style="padding: 10px 16px; font-weight: bold;">🌙 Dark</button>
              </div>
            </div>
            <div>
              <label class="form-label">Accent Color</label>
              <div style="display: flex; gap: 10px;">
                <button type="button" title="BBQ Orange" style="background: #d9480f; border: 2px solid #ced4da; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.1s;" onclick="App.setAccent('#d9480f', '#b63806')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
                <button type="button" title="Tomato Red" style="background: #e03131; border: 2px solid #ced4da; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.1s;" onclick="App.setAccent('#e03131', '#c92a2a')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
                <button type="button" title="Fresh Green" style="background: #2f9e44; border: 2px solid #ced4da; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.1s;" onclick="App.setAccent('#2f9e44', '#2b8a3e')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
                <button type="button" title="Ocean Blue" style="background: #1971c2; border: 2px solid #ced4da; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.1s;" onclick="App.setAccent('#1971c2', '#1864ab')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
                <button type="button" title="Grape Purple" style="background: #9c36b5; border: 2px solid #ced4da; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: transform 0.1s;" onclick="App.setAccent('#9c36b5', '#862e9c')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">🔒 Change Admin PIN</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">Update the PIN used to unlock this Admin Dashboard.</p>

          <form id="pin-change-form" style="max-width: 480px;">
            <div class="form-group">
              <label class="form-label">Current PIN (Default is 1234)</label>
              <input type="password" id="current-pin-input" class="form-input" placeholder="Current PIN" required />
            </div>

            <div class="form-group">
              <label class="form-label">New 4-Digit PIN</label>
              <input type="password" id="new-pin-input" class="form-input" placeholder="New PIN" maxlength="8" required />
            </div>

            <button type="submit" class="btn btn-danger">Update PIN</button>
          </form>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">📶 Local Network Mobile Connection Info</div>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">Type any of these URLs into your mobile device's browser (Safari/Chrome):</p>
          
          <div style="background: rgba(128, 128, 128, 0.1); padding: 14px; border-radius: 8px; font-family: monospace; font-size: 1rem;">
            ${ips.length > 0 ? ips.map(ip => `
              <div style="margin: 4px 0;">📲 <strong>http://${ip}:${port}</strong></div>
            `).join('') : `
              <div>📲 http://&lt;YOUR_LAPTOP_IP&gt;:${port}</div>
            `}
          </div>
        </div>
      `;

      // Rebind forms
      document.getElementById('settings-form').addEventListener('submit', (e) => this.handleSaveSettings(e));
      document.getElementById('pin-change-form').addEventListener('submit', (e) => this.handleChangePin(e));
    } catch (err) {
      content.innerHTML = `<div style="color: red; padding: 20px;">Failed to load settings: ${err.message}</div>`;
    }
  },

  async handleSaveSettings(e) {
    e.preventDefault();
    const business_name = document.getElementById('setting-name').value.trim();
    const currency_symbol = document.getElementById('setting-currency').value.trim();
    const tax_rate = document.getElementById('setting-tax').value.trim();

    try {
      const res = await API.updateSettings({ business_name, currency_symbol, tax_rate });
      if (res.success) {
        App.showToast('Store settings saved successfully', 'success');
        document.getElementById('brand-title').textContent = business_name;
        Cashier.currency = currency_symbol;
        Cashier.taxRate = parseFloat(tax_rate || '0') / 100;
        Cashier.updateCurrencyLabels();
        Cashier.loadProducts();
        if (typeof Pending !== 'undefined' && Pending.loadPendingOrders) {
          Pending.loadPendingOrders();
        }
      }
    } catch (err) {
      App.showToast('Failed to save settings', 'danger');
    }
  },

  async handleChangePin(e) {
    e.preventDefault();
    const current_pin = document.getElementById('current-pin-input').value.trim();
    const new_pin = document.getElementById('new-pin-input').value.trim();

    if (!new_pin || new_pin.length < 4) {
      App.showToast('New PIN must be at least 4 digits', 'warning');
      return;
    }

    try {
      const res = await API.updatePIN(current_pin, new_pin);
      if (res.success) {
        App.showToast('Admin PIN changed successfully!', 'success');
        document.getElementById('current-pin-input').value = '';
        document.getElementById('new-pin-input').value = '';
      } else {
        App.showToast(res.error || 'Failed to change PIN', 'danger');
      }
    } catch (err) {
      App.showToast('Error changing PIN', 'danger');
    }
  }
};
