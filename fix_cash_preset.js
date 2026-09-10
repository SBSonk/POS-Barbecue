const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/\.cash-preset-btn \{\n  padding: 10px 4px;\n  background: rgba\(128, 128, 128, 0\.15\);\n  border: 1px solid var\(--border-color\);\n  border-radius: var\(--radius-sm\);\n  font-size: 0\.95rem;\n  font-weight: 700;\n  cursor: pointer;\n  text-align: center;\n\}/, `.cash-preset-btn {
  padding: 10px 4px;
  background: rgba(128, 128, 128, 0.15);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  color: var(--text-main);
}`);

fs.writeFileSync('public/css/styles.css', css);
