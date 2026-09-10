// Pending Orders & Kitchen Queue Controller
const Pending = {
  orders: [],
  currentFilter: 'ALL',
  searchQuery: '',
  pollTimer: null,

  init() {
    this.bindEvents();
    this.loadPendingOrders();
    // Auto-poll every 12 seconds for real-time queue updates
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.loadPendingOrders(true), 12000);
  },

  bindEvents() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-pending-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadPendingOrders();
        App.showToast('Pending orders refreshed', 'info');
      });
    }

    // Search input
    const searchInput = document.getElementById('pending-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderPendingOrders();
      });
    }

    // Filter tabs
    const filterTabs = document.querySelectorAll('.pending-tab-btn');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        filterTabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentFilter = e.currentTarget.getAttribute('data-filter') || 'ALL';
        this.renderPendingOrders();
      });
    });
  },

  async loadPendingOrders(silent = false) {
    try {
      const res = await API.getTransactions({ status: 'PENDING' });
      if (res.success) {
        this.orders = res.transactions || [];
        this.updateBadge();
        this.renderPendingOrders();
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to load pending orders:', err);
        App.showToast('Could not load pending orders', 'danger');
      }
    }
  },

  updateBadge() {
    const count = this.orders.length;
    const badge = document.getElementById('pending-nav-badge');
    const pill = document.getElementById('pending-count-pill');

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (pill) {
      pill.textContent = `${count} Pending ${count === 1 ? 'Order' : 'Orders'}`;
    }
  },

  getRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp.replace(' ', 'T'));
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 min ago';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  renderPendingOrders() {
    const grid = document.getElementById('pending-orders-grid');
    if (!grid) return;

    let list = this.orders;

    // Filter by category: Food or Drinks
    if (this.currentFilter === 'FOOD') {
      list = list.filter(order => order.items && order.items.some(i => i.category !== 'Drinks'));
    } else if (this.currentFilter === 'DRINKS') {
      list = list.filter(order => order.items && order.items.some(i => i.category === 'Drinks'));
    }

    // Filter by search query
    if (this.searchQuery) {
      list = list.filter(order => {
        const matchesReceipt = order.receipt_number.toLowerCase().includes(this.searchQuery);
        const matchesNote = order.cashier_note && order.cashier_note.toLowerCase().includes(this.searchQuery);
        const matchesItems = order.items && order.items.some(i => i.product_name.toLowerCase().includes(this.searchQuery));
        return matchesReceipt || matchesNote || matchesItems;
      });
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="pending-empty-state">
          <div style="font-size: 3.2rem; margin-bottom: 12px;">🎉</div>
          <h3>All Caught Up!</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 6px;">
            ${this.orders.length === 0 ? 'No pending orders waiting right now.' : 'No orders match your filter/search.'}
          </p>
          <button class="btn btn-primary" onclick="App.showCashierView()" style="margin-top: 16px; padding: 10px 20px;">
            🛒 Take New Order
          </button>
        </div>
      `;
      return;
    }

    const currency = Cashier.currency || '₱';

    grid.innerHTML = list.map(order => {
      const isUrgent = (() => {
        const date = new Date(order.created_at.replace(' ', 'T'));
        const diffMin = (new Date().getTime() - date.getTime()) / (1000 * 60);
        return diffMin >= 15;
      })();

      const payBadge = order.payment_method === 'QRPH'
        ? `<span class="pending-badge-qrph">🇵🇭 QRPH Paid</span>`
        : `<span class="pending-badge-cash">💵 Cash Paid</span>`;

      const timeText = this.getRelativeTime(order.created_at);

      const itemsHtml = (order.items || []).map(item => `
        <div class="pending-item-row">
          <span class="pending-item-qty">${item.quantity}×</span>
          <span class="pending-item-name">${item.product_name}</span>
          <span class="pending-item-price">${currency}${item.item_total.toFixed(2)}</span>
        </div>
      `).join('');

      return `
        <div class="pending-order-card ${isUrgent ? 'urgent' : ''}" id="pending-card-${order.id}">
          <div class="pending-card-header">
            <div>
              <div class="pending-order-num">#${order.receipt_number}</div>
              <div class="pending-time-pill ${isUrgent ? 'urgent' : ''}">🕒 ${timeText}</div>
            </div>
            <div style="text-align: right;">
              ${payBadge}
              <div class="pending-total-amount">${currency}${order.total.toFixed(2)}</div>
            </div>
          </div>

          ${order.cashier_note ? `
            <div class="pending-order-note">
              <span>🏷️ Note:</span> <strong>${order.cashier_note}</strong>
            </div>
          ` : ''}

          <div class="pending-card-items">
            ${itemsHtml}
          </div>

          <div class="pending-card-actions">
            <button class="btn btn-secondary" style="padding: 10px 12px; font-size: 0.9rem;" onclick="Pending.viewReceipt(${order.id})" title="View / Print Receipt">
              🧾 Slip
            </button>
            <button class="btn btn-secondary" style="padding: 10px 12px; font-size: 0.9rem; color: #e03131;" onclick="Pending.voidOrder(${order.id})" title="Cancel Order">
              ✕ Cancel
            </button>
            <button class="btn btn-success pending-complete-btn" onclick="Pending.payAndComplete(${order.id})">
              <span>✅</span> Pay & Complete
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  payAndComplete(id) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return;
    
    if (typeof Cashier !== 'undefined' && Cashier.openPaymentModalForPending) {
      Cashier.openPaymentModalForPending(id, order.total);
    } else {
      App.showToast('Payment system not ready', 'danger');
    }
  },

  async viewReceipt(id) {
    try {
      const res = await API.getTransactions({ limit: 100 });
      const order = (res.transactions || []).find(t => t.id === id);
      if (order) {
        Cashier.showReceiptModal(order);
      }
    } catch (err) {
      App.showToast('Could not load order slip', 'danger');
    }
  },

  async voidOrder(id) {
    const reason = prompt('Reason for voiding / canceling this pending order:', 'Customer canceled before serving');
    if (reason === null) return; // Cancelled prompt

    try {
      const res = await API.voidTransaction(id, reason || 'Pending order canceled');
      if (res.success) {
        App.showToast('Order canceled and inventory restored', 'info');
        await this.loadPendingOrders();
        Cashier.loadProducts();
      } else {
        App.showToast(res.error || 'Failed to void order', 'danger');
      }
    } catch (err) {
      App.showToast('Network error while canceling order', 'danger');
    }
  }
};
