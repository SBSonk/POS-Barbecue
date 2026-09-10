const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/    \} catch \(err\) \{\n      errorEl\.textContent = 'Server connection error';\n      this\.pinEntered = '';\n      this\.updatePinDisplay\(\);\n    \}\n  \} catch \(err\) \{\n      errorEl\.textContent = 'Server connection error';\n      this\.pinEntered = '';\n      this\.updatePinDisplay\(\);\n    \}/g, 
`    } catch (err) {
      errorEl.textContent = 'Server connection error';
      this.pinEntered = '';
      this.updatePinDisplay();
    }`);

fs.writeFileSync('public/js/admin.js', code);
