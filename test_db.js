const fs = require('fs');
let code = fs.readFileSync('src/database/db.ts', 'utf8');
console.log(code.substring(100, 1500));
