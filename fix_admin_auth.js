const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/openPinModal\(\) \{/, `openPinModal(target = 'admin') {
    this.pendingTarget = target;`);

code = code.replace(/App\.showAdminView\(\);/g, `if (this.pendingTarget === 'admin') App.showAdminView();`);

// Wait, replacing ALL instances of App.showAdminView() in Admin might break things.
