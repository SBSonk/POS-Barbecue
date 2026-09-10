const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(/showCashierView\(\) \{/, `showCashierView() {
    const mcb = document.getElementById('mobile-cart-bar');
    if (mcb) mcb.style.display = '';
`);

code = code.replace(/showPendingView\(\) \{/, `showPendingView() {
    const mcb = document.getElementById('mobile-cart-bar');
    if (mcb) mcb.style.display = 'none';
`);

code = code.replace(/showAdminView\(\) \{/, `showAdminView() {
    const mcb = document.getElementById('mobile-cart-bar');
    if (mcb) mcb.style.display = 'none';
`);

fs.writeFileSync('public/js/app.js', code);
