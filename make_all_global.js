const fs = require('fs');

function makeGlobal(file, varName) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes(`window.${varName} = ${varName};`)) {
    code += `\nwindow.${varName} = ${varName};\n`;
    fs.writeFileSync(file, code);
  }
}

makeGlobal('public/js/app.js', 'App');
makeGlobal('public/js/cashier.js', 'Cashier');
makeGlobal('public/js/pending.js', 'Pending');
makeGlobal('public/js/api.js', 'API');
