const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(/Admin\.openPinModal\(\);/, `Admin.openPinModal('admin');`);

code = code.replace(/modal\.classList\.add\('hidden'\);/g, `if (modal.id === 'pin-modal' && (!window.Admin || !window.Admin.isAuthenticated)) return;
          modal.classList.add('hidden');`);

code = code.replace(/showCashierView\(\) \{/, `showCashierView() {
    // Only open PIN modal on initial load if not authenticated
    if (window.Admin && !window.Admin.isAuthenticated) {
      setTimeout(() => { Admin.openPinModal('initial'); }, 50);
    }
`);

fs.writeFileSync('public/js/app.js', code);
