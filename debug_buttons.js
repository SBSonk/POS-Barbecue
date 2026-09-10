const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/this\.handlePinKey\(val\);/, `console.log('Pin key clicked:', val); this.handlePinKey(val);`);

fs.writeFileSync('public/js/admin.js', code);
