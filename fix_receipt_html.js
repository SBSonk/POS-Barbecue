const fs = require('fs');
let js = fs.readFileSync('public/js/cashier.js', 'utf8');
// Fix hardcoded color styling inside cashier.js receipt html
js = js.replace(/color: var\(--text-muted\);/g, 'color: #6c757d;');
js = js.replace(/<p style="font-size: 0\.8rem; color: #495057;">/g, '<p style="font-size: 0.8rem; color: #495057;">');
fs.writeFileSync('public/js/cashier.js', js);
