const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/const keys = document\.querySelectorAll\('\.pin-key'\);\s*keys\.forEach\(k => \{\s*k\.addEventListener\('click', \(e\) => \{\s*const val = e\.currentTarget\.getAttribute\('data-val'\);\s*console\.log\('Pin key clicked:', val\); this\.handlePinKey\(val\);\s*\}\);\s*\}\);/, `// Keys bound via inline onclick in HTML`);

fs.writeFileSync('public/js/admin.js', code);
