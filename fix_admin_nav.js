const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(/Admin\.openPinModal\('admin'\);/, `App.showAdminView();`);
code = code.replace(/\/\/ Switch to Admin View \(requires PIN check\)/, `// Switch to Admin View`);

fs.writeFileSync('public/js/app.js', code);
