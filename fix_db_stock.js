const fs = require('fs');
let code = fs.readFileSync('src/database/db.ts', 'utf8');

code = code.replace(/\} else if \(sql\.includes\('SET stock = \?'\)\) \{/, 
  `} else if (sql.includes('SET stock = stock + ?')) {
             prod.stock = prod.stock + p[0];
          } else if (sql.includes('SET stock = ?')) {`);

fs.writeFileSync('src/database/db.ts', code);
