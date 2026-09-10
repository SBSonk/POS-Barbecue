const fs = require('fs');
let appCode = fs.readFileSync('public/js/app.js', 'utf8');
appCode = appCode.replace(/console\.log\('\[DEBUG\].*?'\);?\n?/g, '');
appCode = appCode.replace(/setTimeout\(\(\) => \{\s*Admin\.openPinModal\('initial'\);\s*\}, 50\);/g, '');
fs.writeFileSync('public/js/app.js', appCode);

let adminCode = fs.readFileSync('public/js/admin.js', 'utf8');
adminCode = adminCode.replace(/console\.log\('\[DEBUG\].*?', target\);?\n?/g, '');
adminCode = adminCode.replace(/console\.log\('\[DEBUG\].*?'\);?\n?/g, '');
fs.writeFileSync('public/js/admin.js', adminCode);
