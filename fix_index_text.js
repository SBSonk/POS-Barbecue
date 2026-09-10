const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// I saw previously black text in "AMOUNT DUE" ? No it was text-muted

fs.writeFileSync('public/index.html', html);
