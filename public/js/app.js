// Main App Orchestrator & View Switcher
const App = {
  async init() {
    this.loadAppearance();
    this.bindGlobalEvents();
    await this.loadServerInfo();
    await Cashier.init();
    if (typeof Pending !== 'undefined') {
      Pending.init();
    }
    Admin.init();
  },

  loadAppearance() {
    const theme = localStorage.getItem('pos_theme') || 'light';
    const accent = localStorage.getItem('pos_accent_color') || '#d9480f';
    const accentDark = localStorage.getItem('pos_accent_dark') || '#b63806';
    
    this.setTheme(theme, false);
    this.setAccent(accent, accentDark, false);
  },

  setTheme(theme, save = true) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (save) localStorage.setItem('pos_theme', theme);
  },

  setAccent(primary, primaryDark, save = true) {
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--primary-dark', primaryDark);
    if (save) {
      localStorage.setItem('pos_accent_color', primary);
      localStorage.setItem('pos_accent_dark', primaryDark);
    }
  },

  bindGlobalEvents() {
    // Switch to Cashier View
    const posNavBtn = document.getElementById('nav-pos-btn');
    if (posNavBtn) {
      posNavBtn.addEventListener('click', () => this.showCashierView());
    }

    // Switch to Pending Orders View
    const pendingNavBtn = document.getElementById('nav-pending-btn');
    if (pendingNavBtn) {
      pendingNavBtn.addEventListener('click', () => this.showPendingView());
    }

    // Switch to Admin View (requires PIN check)
    const adminNavBtn = document.getElementById('nav-admin-btn');
    if (adminNavBtn) {
      adminNavBtn.addEventListener('click', () => {
        Admin.openPinModal();
      });
    }

    // Close Modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Close Modals & Cart Drawer on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Cashier.closeCartDrawer();
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
          modal.classList.add('hidden');
        });
      }
    });
  },

  async loadServerInfo() {
    try {
      const res = await API.getInfo();
      if (res.success) {
        const brandTitle = document.getElementById('brand-title');
        if (brandTitle) brandTitle.textContent = res.business_name;

        const ipBadge = document.getElementById('server-ip-badge');
        if (ipBadge && res.local_ips && res.local_ips.length > 0) {
          ipBadge.innerHTML = `<span class="dot"></span> ${res.local_ips[0]}:${res.port}`;
        }
      }
    } catch (err) {
      console.warn('Could not fetch server info:', err);
    }
  },

  showCashierView() {
    document.getElementById('pos-layout').style.display = 'flex';
    document.getElementById('pending-layout').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'none';

    document.getElementById('nav-pos-btn').classList.add('active');
    document.getElementById('nav-pending-btn').classList.remove('active');
    document.getElementById('nav-admin-btn').classList.remove('active');

    // Ensure cart drawer is closed so main catalog menu is visible
    Cashier.closeCartDrawer();

    // Refresh cashier inventory when returning
    Cashier.loadProducts();
  },

  showPendingView() {
    Cashier.closeCartDrawer();
    document.getElementById('pos-layout').style.display = 'none';
    document.getElementById('pending-layout').style.display = 'block';
    document.getElementById('admin-layout').style.display = 'none';

    document.getElementById('nav-pos-btn').classList.remove('active');
    document.getElementById('nav-pending-btn').classList.add('active');
    document.getElementById('nav-admin-btn').classList.remove('active');

    if (typeof Pending !== 'undefined') {
      Pending.loadPendingOrders();
    }
  },

  showAdminView() {
    Cashier.closeCartDrawer();
    document.getElementById('pos-layout').style.display = 'none';
    document.getElementById('pending-layout').style.display = 'none';
    document.getElementById('admin-layout').style.display = 'flex';

    document.getElementById('nav-pos-btn').classList.remove('active');
    document.getElementById('nav-pending-btn').classList.remove('active');
    document.getElementById('nav-admin-btn').classList.add('active');

    Admin.switchTab('products');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
