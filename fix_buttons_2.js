const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

// Also make sure qrph instruction is dark gray instead of dark mode text
css = css.replace(/\.qrph-instruction \{\n  font-size: 0\.82rem;\n  color: var\(--text-muted\);/, `.qrph-instruction {
  font-size: 0.82rem;
  color: #475569;`);

// And qrph header logo text
css = css.replace(/\.qrph-logo-badge \{\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 1rem;\n  font-weight: 800;\n  color: var\(--text-main\);/, `.qrph-logo-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;`);

// And the qrph active pill scan to pay
css = css.replace(/\.qrph-active-pill \{\n  background: color-mix\(in srgb, var\(--primary\) 15%, transparent\);\n  color: var\(--primary\);\n  font-size: 0\.75rem;\n  font-weight: 700;\n  padding: 2px 8px;\n  border-radius: 12px;\n\}/, `.qrph-active-pill {
  background: #dcfce7;
  color: #166534;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}`);

// And the qrph subtag
css = css.replace(/\.qrph-subtag \{\n  font-size: 0\.75rem;\n  font-weight: 600;\n  background: var\(--bg-card\);\n  color: var\(--text-muted\);/, `.qrph-subtag {
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #475569;`);

fs.writeFileSync('public/css/styles.css', css);
