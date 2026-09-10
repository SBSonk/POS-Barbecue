// Cashier Logic & Cart Controller
const Cashier = {
  products: [],
  categories: [],
  currentCategory: 'All',
  searchQuery: '',
  cart: {}, // { [productId]: { product, quantity } }
  currency: '$',
  taxRate: 0,
  paymentMethod: 'CASH',
  amountTendered: 0,

  payingPendingId: null,
  payingPendingTotal: 0,

  async init() {
    this.bindEvents();
    await this.loadProducts();
    this.renderCart();
  },

  bindEvents() {
    // Search input
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProducts();
      });
    }

    // Clear cart button
    const clearBtn = document.getElementById('clear-cart-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (Object.keys(this.cart).length > 0) {
          if (clearBtn.dataset.confirm !== 'true') {
            clearBtn.dataset.confirm = 'true';
            const originalText = clearBtn.innerHTML;
            clearBtn.innerHTML = 'Sure?';
            clearBtn.style.color = 'var(--danger)';
            setTimeout(() => {
              clearBtn.dataset.confirm = 'false';
              clearBtn.innerHTML = originalText;
              clearBtn.style.color = '';
            }, 3000);
          } else {
            this.clearCart();
            clearBtn.dataset.confirm = 'false';
            clearBtn.innerHTML = 'Clear';
            clearBtn.style.color = '';
          }
        }
      });
    }

    // Checkout button (open queue modal)
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.openQueueModal());
    }

    // Mobile bar click (open mobile cart drawer)
    const mobileCartBar = document.getElementById('mobile-cart-bar');
    if (mobileCartBar) {
      mobileCartBar.addEventListener('click', () => this.openCartDrawer());
    }

    // Top Cart Back to Menu button
    const cartBackBtn = document.getElementById('cart-back-btn');
    if (cartBackBtn) {
      cartBackBtn.addEventListener('click', () => this.closeCartDrawer());
    }

    // Mobile close cart drawer button (X)
    const closeCartDrawerBtn = document.getElementById('close-cart-drawer-btn');
    if (closeCartDrawerBtn) {
      closeCartDrawerBtn.addEventListener('click', () => this.closeCartDrawer());
    }

    // Footer Continue Shopping / Back to Menu button
    const cartContinueBtn = document.getElementById('cart-continue-btn');
    if (cartContinueBtn) {
      cartContinueBtn.addEventListener('click', () => this.closeCartDrawer());
    }

    // Tendered Cash Input
    const tenderedInput = document.getElementById('tendered-cash-input');
    if (tenderedInput) {
      tenderedInput.addEventListener('input', (e) => {
        this.amountTendered = parseFloat(e.target.value) || 0;
        this.updatePaymentChange();
      });
    }

    // Confirm Payment Final Button
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    if (confirmPaymentBtn) {
      confirmPaymentBtn.addEventListener('click', () => this.processCheckout());
    }
  },

  async loadProducts() {
    try {
      const [prodRes, catRes, setRes] = await Promise.all([
        API.getProducts({ activeOnly: true }),
        API.getCategories(),
        API.getSettings()
      ]);

      if (prodRes.success) {
        this.products = prodRes.products;
      }
      if (catRes.success) {
        this.categories = ['All', ...catRes.categories];
      }
      if (setRes.success && setRes.settings) {
        this.currency = setRes.settings.currency_symbol || '$';
        this.taxRate = parseFloat(setRes.settings.tax_rate || '0') / 100;
      }

      this.updateCurrencyLabels();
      this.renderCategories();
      this.renderProducts();
    } catch (err) {
      console.error('Failed to load products:', err);
      App.showToast('Failed to load products from server', 'danger');
    }
  },

  updateCurrencyLabels() {
    // Update dynamic currency labels across the app
    const tenderedLabel = document.getElementById('tendered-cash-label');
    if (tenderedLabel) {
      tenderedLabel.textContent = `Cash Tendered (${this.currency}):`;
    }

    const priceLabel = document.getElementById('product-price-label');
    if (priceLabel) {
      priceLabel.textContent = `Price (${this.currency}) *`;
    }

    const changeDue = document.getElementById('change-due-val');
    if (changeDue && changeDue.textContent.startsWith('$') && this.currency !== '$') {
      changeDue.textContent = `${this.currency}0.00`;
    }
  },

  renderCategories() {
    const container = document.getElementById('category-nav');
    if (!container) return;

    container.innerHTML = this.categories.map(cat => `
      <button class="category-pill ${cat === this.currentCategory ? 'active' : ''}" 
              onclick="Cashier.selectCategory('${cat}')">
        ${cat}
      </button>
    `).join('');
  },

  selectCategory(category) {
    this.currentCategory = category;
    this.renderCategories();
    this.renderProducts();
  },

  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = this.products;

    if (this.currentCategory !== 'All') {
      filtered = filtered.filter(p => p.category === this.currentCategory);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(this.searchQuery) || 
        (p.description && p.description.toLowerCase().includes(this.searchQuery))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🔍</div>
          <p>No items found matching your filter</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(product => {
      const isOut = product.stock <= 0;
      const isLow = product.stock > 0 && product.stock <= product.low_stock_threshold;
      
      let stockBadge = '';
      if (isOut) {
        stockBadge = `<span class="product-stock-badge stock-out">Out of Stock</span>`;
      } else if (isLow) {
        stockBadge = `<span class="product-stock-badge stock-low">⚠️ Only ${product.stock} Left</span>`;
      } else {
        stockBadge = `<span class="product-stock-badge stock-ok">${product.stock} in stock</span>`;
      }

      const disabledClass = isOut ? 'out-of-stock' : '';

      return `
        <div class="product-card ${disabledClass}" 
             onclick="${isOut ? '' : `Cashier.addToCart(${product.id})`}">
          <div class="product-icon">${product.icon || '🍖'}</div>
          <div class="product-name" title="${product.name}">${product.name}</div>
          <div class="product-price">${this.currency}${product.price.toFixed(2)}</div>
          ${stockBadge}
        </div>
      `;
    }).join('');
  },

  addToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    const currentQty = this.cart[productId] ? this.cart[productId].quantity : 0;
    
    // Check if adding exceeds current stock
    if (currentQty + 1 > product.stock) {
      App.showToast(`Cannot add more than ${product.stock} available stock of ${product.name}`, 'warning');
      return;
    }

    if (this.cart[productId]) {
      this.cart[productId].quantity += 1;
    } else {
      this.cart[productId] = {
        product,
        quantity: 1
      };
    }

    this.renderCart();
  },

  updateQuantity(productId, delta) {
    if (!this.cart[productId]) return;

    const item = this.cart[productId];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      delete this.cart[productId];
    } else if (newQty > item.product.stock) {
      App.showToast(`Max stock reached (${item.product.stock})`, 'warning');
      return;
    } else {
      item.quantity = newQty;
    }

    this.renderCart();
  },

  removeFromCart(productId) {
    delete this.cart[productId];
    this.renderCart();
  },

  clearCart() {
    this.cart = {};
    this.renderCart();
  },

  getTotals() {
    let subtotal = 0;
    let totalItemsCount = 0;

    for (const id in this.cart) {
      const item = this.cart[id];
      subtotal += item.product.price * item.quantity;
      totalItemsCount += item.quantity;
    }

    const tax = subtotal * this.taxRate;
    const total = subtotal + tax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      count: totalItemsCount
    };
  },

  openCartDrawer() {
    const cartPanel = document.getElementById('pos-cart-panel');
    if (cartPanel) {
      cartPanel.classList.add('mobile-open');
    }
  },

  closeCartDrawer() {
    const cartPanel = document.getElementById('pos-cart-panel');
    if (cartPanel) {
      cartPanel.classList.remove('mobile-open');
    }
  },

  renderCart() {
    const list = document.getElementById('cart-items-list');
    const badge = document.getElementById('cart-badge');
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const mobileCartBar = document.getElementById('mobile-cart-bar');
    const mobileCount = document.getElementById('mobile-cart-count');
    const mobileTotal = document.getElementById('mobile-cart-total');

    const totals = this.getTotals();
    const cartKeys = Object.keys(this.cart);

    if (badge) badge.textContent = `${totals.count} items`;
    if (subtotalEl) subtotalEl.textContent = `${this.currency}${totals.subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `${this.currency}${totals.tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${this.currency}${totals.total.toFixed(2)}`;

    if (checkoutBtn) {
      checkoutBtn.disabled = cartKeys.length === 0;
      checkoutBtn.innerHTML = `<span>🕒</span> Send to Kitchen (${this.currency}${totals.total.toFixed(2)})`;
    }

    // Update Mobile bottom bar
    if (mobileCartBar && mobileCount && mobileTotal) {
      if (totals.count > 0) {
        mobileCartBar.classList.add('has-items');
        mobileCount.textContent = `${totals.count} Items`;
        mobileTotal.textContent = `${this.currency}${totals.total.toFixed(2)}`;
      } else {
        mobileCartBar.classList.remove('has-items');
      }
    }

    if (!list) return;

    if (cartKeys.length === 0) {
      list.innerHTML = `
        <div class="empty-cart-msg">
          <div class="icon">🛒</div>
          <p style="font-weight: 600; font-size: 1.05rem;">Your cart is empty</p>
          <p style="font-size: 0.85rem; color: #6c757d;">Tap any product card to start an order</p>
          <button class="empty-cart-back-btn" id="empty-cart-back-btn" onclick="Cashier.closeCartDrawer()" type="button">
            <span>←</span> Back to Main Menu
          </button>
        </div>
      `;
      return;
    }

    list.innerHTML = cartKeys.map(id => {
      const item = this.cart[id];
      const lineTotal = (item.product.price * item.quantity).toFixed(2);

      return `
        <div class="cart-item-row">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.product.icon || '🍖'} ${item.product.name}</div>
            <div class="cart-item-price">${this.currency}${item.product.price.toFixed(2)} each</div>
          </div>
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="Cashier.updateQuantity(${id}, -1)">−</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="Cashier.updateQuantity(${id}, 1)">+</button>
          </div>
          <div class="cart-item-total">${this.currency}${lineTotal}</div>
        </div>
      `;
    }).join('');
  },

  openQueueModal() {
    const totals = this.getTotals();
    if (totals.count === 0) return;
    
    const noteInput = document.getElementById('queue-order-note');
    if (noteInput) noteInput.value = '';
    
    document.getElementById('queue-modal').classList.remove('hidden');
  },

  openPaymentModalForPending(pendingId, totalAmount) {
    this.payingPendingId = pendingId;
    this.payingPendingTotal = totalAmount;
    
    this.paymentMethod = 'CASH';
    this.amountTendered = totalAmount;

    this.updateCurrencyLabels();

    document.getElementById('payment-modal-total').textContent = `${this.currency}${totalAmount.toFixed(2)}`;
    const qrphAmount = document.getElementById('qrph-modal-amount');
    if (qrphAmount) {
      qrphAmount.textContent = `${this.currency}${totalAmount.toFixed(2)}`;
    }

    const qrphRef = document.getElementById('qrph-ref-input');
    if (qrphRef) qrphRef.value = '';
    
    // Render preset cash buttons
    this.renderCashPresets(totalAmount);
    this.selectPaymentMethod('CASH');

    const tenderedInput = document.getElementById('tendered-cash-input');
    if (tenderedInput) {
      tenderedInput.value = totalAmount.toFixed(2);
    }
    this.updatePaymentChange();

    document.getElementById('payment-modal').classList.remove('hidden');
  },

  selectPaymentMethod(method) {
    this.paymentMethod = method;
    const cards = document.querySelectorAll('.payment-method-card');
    cards.forEach(c => {
      if (c.getAttribute('data-method') === method) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    const cashSection = document.getElementById('cash-payment-section');
    const qrphSection = document.getElementById('qrph-payment-section');
    if (cashSection) {
      cashSection.style.display = method === 'CASH' ? 'block' : 'none';
    }
    if (qrphSection) {
      qrphSection.style.display = method === 'QRPH' ? 'block' : 'none';
    }

    if (method === 'QRPH') {
      const amount = this.payingPendingId ? this.payingPendingTotal : this.getTotals().total;
      this.amountTendered = amount;
      const qrphAmount = document.getElementById('qrph-modal-amount');
      if (qrphAmount) {
        qrphAmount.textContent = `${this.currency}${amount.toFixed(2)}`;
      }
    }
  },

  renderCashPresets(total) {
    const container = document.getElementById('quick-cash-presets');
    if (!container) return;

    // Presets: Exact and common bill denominations
    const presets = [total];
    const commonBills = [20, 50, 100, 200, 500, 1000];

    for (const bill of commonBills) {
      if (bill >= total && !presets.includes(bill)) {
        presets.push(bill);
      }
    }

    // Next round multiples if total is above standard bill thresholds
    if (total > 50) {
      const next50 = Math.ceil(total / 50) * 50;
      if (next50 > total && !presets.includes(next50)) presets.push(next50);
      const next100 = Math.ceil(total / 100) * 100;
      if (next100 > total && !presets.includes(next100)) presets.push(next100);
      const next500 = Math.ceil(total / 500) * 500;
      if (next500 > total && !presets.includes(next500)) presets.push(next500);
    }

    const uniquePresets = [...new Set(presets)].sort((a, b) => a - b).slice(0, 5);

    container.innerHTML = uniquePresets.map(amount => `
      <button type="button" class="cash-preset-btn" onclick="Cashier.setTenderedAmount(${amount})">
        ${amount === total ? 'Exact' : `${this.currency}${amount.toLocaleString()}`}
      </button>
    `).join('');
  },

  setTenderedAmount(amount) {
    this.amountTendered = amount;
    const input = document.getElementById('tendered-cash-input');
    if (input) input.value = amount.toFixed(2);
    this.updatePaymentChange();
  },

  updatePaymentChange() {
    const amountDue = this.payingPendingId ? this.payingPendingTotal : this.getTotals().total;
    const change = Math.max(0, this.amountTendered - amountDue);
    const changeEl = document.getElementById('change-due-val');
    if (changeEl) {
      changeEl.textContent = `${this.currency}${change.toFixed(2)}`;
    }
  },

  async processQueueOrder() {
    const totals = this.getTotals();
    if (totals.count === 0) return;

    const items = Object.keys(this.cart).map(id => ({
      product_id: parseInt(id, 10),
      quantity: this.cart[id].quantity
    }));

    const noteInput = document.getElementById('queue-order-note');
    const cashierNote = noteInput ? noteInput.value.trim() : '';

    const payload = {
      items,
      payment_method: 'UNPAID', // Payment happens later
      amount_tendered: 0,
      cashier_note: cashierNote,
      status: 'PENDING'
    };

    const confirmBtn = document.getElementById('confirm-queue-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      const res = await API.checkout(payload);

      if (res.success && res.transaction) {
        // Close queue modal & drawer
        document.getElementById('queue-modal').classList.add('hidden');
        const cartPanel = document.getElementById('pos-cart-panel');
        if (cartPanel) cartPanel.classList.remove('mobile-open');

        // Clear note & cart
        if (noteInput) noteInput.value = '';
        this.clearCart();

        // Refresh products to show updated stock
        await this.loadProducts();

        // Refresh pending orders queue
        if (typeof Pending !== 'undefined' && Pending.loadPendingOrders) {
          Pending.loadPendingOrders();
        }

        App.showToast(`Order #${res.transaction.receipt_number} queued to Kitchen!`, 'success');
      } else {
        App.showToast(res.error || 'Queueing failed', 'danger');
      }
    } catch (err) {
      console.error('Queue error:', err);
      App.showToast('Network error during checkout', 'danger');
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  },

  async processPayment() {
    if (!this.payingPendingId) return;

    let noteAppend = '';
    if (this.paymentMethod === 'QRPH') {
      const qrphRef = document.getElementById('qrph-ref-input');
      const refVal = qrphRef ? qrphRef.value.trim() : '';
      if (refVal) {
        noteAppend = ` | QRPH Ref: ${refVal}`;
      }
    }

    const amountDue = this.payingPendingTotal;
    const amountTendered = this.paymentMethod === 'CASH' ? this.amountTendered : amountDue;
    const changeDue = Math.max(0, amountTendered - amountDue);

    const payload = {
      payment_method: this.paymentMethod,
      amount_tendered: amountTendered,
      change_due: changeDue,
      note_append: noteAppend
    };

    const confirmBtn = document.getElementById('confirm-payment-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      const res = await API.payPendingTransaction(this.payingPendingId, payload);
      if (res.success && res.transaction) {
        document.getElementById('payment-modal').classList.add('hidden');
        
        const qrphRef = document.getElementById('qrph-ref-input');
        if (qrphRef) qrphRef.value = '';

        if (typeof Pending !== 'undefined' && Pending.loadPendingOrders) {
          Pending.loadPendingOrders();
        }

        this.showReceiptModal(res.transaction);
        App.showToast('Payment successful and order completed!', 'success');
      } else {
        App.showToast(res.error || 'Payment failed', 'danger');
      }
    } catch (err) {
      console.error('Payment error:', err);
      App.showToast('Network error during payment', 'danger');
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
      this.payingPendingId = null;
      this.payingPendingTotal = 0;
    }
  },

  showReceiptModal(transaction) {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;

    const isPending = transaction.status === 'PENDING';
    const isVoided = transaction.status === 'VOIDED';

    let statusBadge = `<span style="background: #e6fcf5; color: #0ca678; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">● COMPLETED</span>`;
    if (isPending) {
      statusBadge = `<span style="background: var(--warning-bg); color: #f59f00; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">🕒 PENDING ORDER</span>`;
    } else if (isVoided) {
      statusBadge = `<span style="background: #ffe3e3; color: #e03131; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">✕ VOIDED</span>`;
    }

    const payMethodDisplay = transaction.payment_method === 'QRPH' 
      ? '🇵🇭 QRPH (Philippines)' 
      : (transaction.payment_method === 'CASH' ? '💵 Cash' : transaction.payment_method);

    const receiptContent = document.getElementById('receipt-content');
    if (receiptContent) {
      const itemsListHtml = transaction.items.map(i => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${i.quantity}x ${i.product_name}</span>
          <span>${this.currency}${i.item_total.toFixed(2)}</span>
        </div>
      `).join('');

      receiptContent.innerHTML = `
        <div class="receipt-paper">
          <div class="receipt-header">
            <h2 style="font-size: 1.2rem; margin-bottom: 4px;">🍖 SMOKIN' BBQ & BREWS 🍺</h2>
            <p style="font-size: 0.8rem; color: #495057;">Receipt #${transaction.receipt_number}</p>
            <div style="margin: 4px 0;">${statusBadge}</div>
            <p style="font-size: 0.75rem; color: #6c757d;">${new Date().toLocaleString()}</p>
          </div>
          <div class="receipt-divider"></div>
          <div style="margin: 10px 0;">
            ${itemsListHtml}
          </div>
          <div class="receipt-divider"></div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem; margin: 8px 0;">
            <span>TOTAL:</span>
            <span>${this.currency}${transaction.total.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
            <span>Payment Method:</span>
            <span>${payMethodDisplay}</span>
          </div>
          ${transaction.payment_method === 'CASH' ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span>Amount Tendered:</span>
              <span>${this.currency}${(transaction.amount_tendered || transaction.total).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: #2b8a3e; margin-top: 4px;">
              <span>CHANGE DUE:</span>
              <span>${this.currency}${(transaction.change_due || 0).toFixed(2)}</span>
            </div>
          ` : ''}
          ${transaction.cashier_note ? `
            <div class="receipt-divider"></div>
            <div style="font-size: 0.8rem; font-style: italic;">Note: ${transaction.cashier_note}</div>
          ` : ''}
          <div class="receipt-divider"></div>
          <p style="text-align: center; font-size: 0.8rem; margin-top: 8px;">Thank you for your business! 🔥</p>
        </div>
      `;
    }

    modal.classList.remove('hidden');
  }
};

window.Cashier = Cashier;
