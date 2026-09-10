const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/\.qrph-subtag \{\n  font-size: 0\.75rem;\n  font-weight: 600;\n  background: var\(--bg-card\);\n  padding: 2px 6px;\n  border-radius: 4px;\n  color: var\(--text-muted\);/, `.qrph-subtag {
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  color: #475569;`);
  
css = css.replace(/\.qrph-qr-visual \{\n  background: var\(--bg-card\);\n  border: 1px solid var\(--border-color\);\n  border-radius: 8px;\n  padding: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n\}/, `.qrph-qr-visual {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}`);

css = css.replace(/\.qrph-qr-graphic \{\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: var\(--bg-card\);\n  padding: 8px 14px;\n  border-radius: 8px;\n\}/, `.qrph-qr-graphic {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  padding: 8px 14px;
  border-radius: 8px;
}`);

css = css.replace(/\.qrph-due-label \{\n  font-size: 0\.75rem;\n  font-weight: 700;\n  color: var\(--text-muted\);\n  text-transform: uppercase;\n\}/, `.qrph-due-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}`);

css = css.replace(/\.qrph-scan-hint \{\n  font-size: 0\.7rem;\n  font-weight: 700;\n  color: var\(--text-muted\);\n  margin-top: 4px;\n\}/, `.qrph-scan-hint {
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  margin-top: 4px;
}`);

fs.writeFileSync('public/css/styles.css', css);
