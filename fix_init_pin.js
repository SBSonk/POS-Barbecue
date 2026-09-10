const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(/showCashierView\(\) \{[\s\S]*?if \(window\.Admin \&\& !window\.Admin\.isAuthenticated\) \{[\s\S]*?setTimeout\(\(\) => \{ Admin\.openPinModal\('initial'\); \}, 50\);[\s\S]*?\}[\s\S]*?const mcb = document\.getElementById\('mobile-cart-bar'\);/, `showCashierView() {
    const mcb = document.getElementById('mobile-cart-bar');`);

code = code.replace(/Admin\.init\(\);/, `Admin.init();
    if (!Admin.isAuthenticated) {
      setTimeout(() => { Admin.openPinModal('initial'); }, 50);
    }`);

fs.writeFileSync('public/js/app.js', code);
