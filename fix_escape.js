const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(/\(!window\.Admin \|\| !window\.Admin\.isAuthenticated\)/g, `(typeof Admin === 'undefined' || !Admin.isAuthenticated)`);

fs.writeFileSync('public/js/app.js', code);
