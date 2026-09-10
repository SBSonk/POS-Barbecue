const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/openPinModal\(\) \{[\s\S]*?this\.updatePinDisplay\(\);\s*document\.getElementById\('pin-error-msg'\)\.textContent = '';\s*document\.getElementById\('pin-modal'\)\.classList\.remove\('hidden'\);\s*\}/, `openPinModal(target = 'admin') {
    this.pendingTarget = target;
    if (this.isAuthenticated) {
      if (target === 'admin') App.showAdminView();
      return;
    }
    this.pinEntered = '';
    this.updatePinDisplay();
    document.getElementById('pin-error-msg').textContent = '';
    document.getElementById('pin-modal').classList.remove('hidden');
  }`);

code = code.replace(/async verifyPin\(\) \{[\s\S]*?this\.pinEntered = '';\s*this\.updatePinDisplay\(\);\s*\}\s*\}/, `async verifyPin() {
    const errorEl = document.getElementById('pin-error-msg');
    try {
      const res = await API.verifyPIN(this.pinEntered);
      if (res.success && res.authorized) {
        this.isAuthenticated = true;
        this.closePinModal();
        if (this.pendingTarget === 'admin') {
          App.showAdminView();
          App.showToast('Admin access granted', 'success');
        } else {
          App.showToast('Access granted', 'success');
        }
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
  }`);

fs.writeFileSync('public/js/admin.js', code);
