const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/\.app-header \{\n  background: #1e1e1e;\n  color: var\(--text-main\);/, `.app-header {
  background: #1e1e1e;
  color: #fff;`);

css = css.replace(/\.brand-title \{\n  font-size: 1\.2rem;\n  font-weight: 800;\n  color: var\(--text-main\);/, `.brand-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;`);

css = css.replace(/\.nav-btn \{\n  background: rgba\(255,255,255,0\.12\);\n  color: var\(--text-main\);/, `.nav-btn {
  background: rgba(255,255,255,0.12);
  color: #fff;`);

css = css.replace(/\.nav-btn.active \{\n  background: rgba\(255,255,255,0\.1\);\n  color: var\(--text-main\);\n  border: none;\n\}/, `.nav-btn.active {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: none;
}`);

// Check if we need to remove [data-theme="dark"] .app-header from overriding color to var(--text-main)
// Actually in dark mode var(--text-main) is white anyway, so it's fine. 
// But let's check .brand-title and .nav-btn if they have overrides in dark mode.

fs.writeFileSync('public/css/styles.css', css);
