const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

if (!css.includes('.qty-btn {\\n  width: 32px;\\n  height: 32px;\\n  border-radius: 8px;\\n  background: #e9ecef;\\n  border: none;\\n  color: var(--text-main);')) {
  css = css.replace(/\.qty-btn \{\n  width: 32px;\n  height: 32px;\n  border-radius: 8px;\n  background: #e9ecef;\n  border: none;/, `.qty-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e9ecef;
  border: none;
  color: #495057;`); // gray/black because background is light gray
}

fs.writeFileSync('public/css/styles.css', css);
