const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
// Fix AMOUNT DUE label to be more readable in dark mode
// Instead of hardcoding, rely on text-muted
fs.writeFileSync('public/index.html', html);
