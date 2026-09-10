// Inject console logs
const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

if (!code.includes("console.log('[DEBUG] App.init() started');")) {
  code = code.replace(/async init\(\) \{/, `async init() {
    console.log('[DEBUG] App.init() started');
`);
  code = code.replace(/Admin\.init\(\);/, `console.log('[DEBUG] Calling Admin.init()');
    Admin.init();`);
  code = code.replace(/setTimeout\(\(\) => \{ Admin\.openPinModal\('initial'\); \}, 50\);/, `console.log('[DEBUG] Setting timeout for openPinModal');
      setTimeout(() => { 
        console.log('[DEBUG] Executing openPinModal');
        Admin.openPinModal('initial'); 
      }, 50);`);
  fs.writeFileSync('public/js/app.js', code);
}

let adminCode = fs.readFileSync('public/js/admin.js', 'utf8');
if (!adminCode.includes("console.log('[DEBUG] Admin.openPinModal called');")) {
  adminCode = adminCode.replace(/openPinModal\(target = 'admin'\) \{/, `openPinModal(target = 'admin') {
    console.log('[DEBUG] Admin.openPinModal called with target=', target);`);
  adminCode = adminCode.replace(/document\.getElementById\('pin-modal'\)\.classList\.remove\('hidden'\);/, `console.log('[DEBUG] Removing hidden class from pin-modal');
    document.getElementById('pin-modal').classList.remove('hidden');`);
  fs.writeFileSync('public/js/admin.js', adminCode);
}
