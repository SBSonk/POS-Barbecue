const fs = require('fs');
let js = fs.readFileSync('public/js/cashier.js', 'utf8');

js = js.replace(/color: #495057;/g, 'color: #495057;'); // wait, 495057 is dark gray, which is good for white background.
// var(--text-muted) should be changed to #6c757d (gray) so it's readable on white background
js = js.replace(/color: var\(--text-muted\);/g, 'color: #6c757d;'); 

fs.writeFileSync('public/js/cashier.js', js);
