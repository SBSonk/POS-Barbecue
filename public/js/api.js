// API Client Wrapper
const API = {
  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/products?${query}`);
    return res.json();
  },

  async getCategories() {
    const res = await fetch('/api/products/categories');
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`/api/products/${id}`);
    return res.json();
  },

  async createProduct(data) {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateProduct(id, data) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateStock(id, data) {
    const res = await fetch(`/api/products/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Transactions
  async checkout(data) {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/transactions?${query}`);
    return res.json();
  },

  async completeTransaction(id, data = {}) {
    const res = await fetch(`/api/transactions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async payPendingTransaction(id, data) {
    return this.completeTransaction(id, data);
  },

  async updateTransactionStatus(id, status) {
    const res = await fetch(`/api/transactions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async voidTransaction(id, reason) {
    const res = await fetch(`/api/transactions/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  // Reports
  async getEODReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/reports/eod?${query}`);
    return res.json();
  },

  // Inventory
  async getLowStock() {
    const res = await fetch('/api/inventory/low-stock');
    return res.json();
  },

  async getInventoryLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/inventory/logs?${query}`);
    return res.json();
  },

  async batchRestock(updates, notes) {
    const res = await fetch('/api/inventory/quick-restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, notes })
    });
    return res.json();
  },

  // Settings & Auth
  async verifyPIN(pin) {
    const res = await fetch('/api/settings/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updatePIN(current_pin, new_pin) {
    const res = await fetch('/api/settings/pin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_pin, new_pin })
    });
    return res.json();
  },

  // Server Info
  async getInfo() {
    const res = await fetch('/api/info');
    return res.json();
  }
};
