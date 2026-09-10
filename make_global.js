const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

if (!code.includes('window.Admin = Admin;')) {
  code += `\nwindow.Admin = Admin;\n`;
  fs.writeFileSync('public/js/admin.js', code);
}
