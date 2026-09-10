const fs = require('fs');
let code = fs.readFileSync('public/js/admin.js', 'utf8');

code = code.replace(/color: \$\{l\.change_amount > 0 \? '#2b8a3e' : '#c92a2a'\}/g, 
  "color: ${l.change_amount > 0 ? 'var(--success)' : 'var(--danger)'}");

code = code.replace(/<td style="font-size: 0\.8rem; color: #495057;">/g, 
  '<td style="font-size: 0.8rem; color: var(--text-muted);">');

fs.writeFileSync('public/js/admin.js', code);
