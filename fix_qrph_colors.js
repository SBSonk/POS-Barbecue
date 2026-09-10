const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/\.qrph-logo-badge \{\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 1rem;\n  font-weight: 800;\n  color: #0f172a;\n\}/, `.qrph-logo-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
}`);

css = css.replace(/\.qrph-subtag \{\n  font-size: 0\.75rem;\n  font-weight: 600;\n  background: #e2e8f0;\n  padding: 2px 6px;\n  border-radius: 4px;\n  color: #475569;\n\}/, `.qrph-subtag {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}`);

css = css.replace(/\.qrph-active-pill \{\n  background: #dcfce7;\n  color: #166534;\n  font-size: 0\.75rem;\n  font-weight: 700;\n  padding: 2px 8px;\n  border-radius: 12px;\n\}/, `.qrph-active-pill {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}`);

css = css.replace(/\.qrph-instruction \{\n  font-size: 0\.82rem;\n  color: #475569;\n  line-height: 1\.35;\n  margin-bottom: 12px;\n\}/, `.qrph-instruction {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.35;
  margin-bottom: 12px;
}`);

css = css.replace(/\.qrph-qr-visual \{\n  background: #fff;\n  border: 1px solid #e2e8f0;\n  border-radius: 8px;\n  padding: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n\}/, `.qrph-qr-visual {
  background: var(--bg-app);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}`);

css = css.replace(/\.qrph-qr-graphic \{\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  background: #f1f5f9;\n  padding: 8px 14px;\n  border-radius: 8px;\n\}/, `.qrph-qr-graphic {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 8px 14px;
  border-radius: 8px;
}`);

css = css.replace(/\.qrph-scan-hint \{\n  font-size: 0\.7rem;\n  font-weight: 700;\n  color: #475569;\n  margin-top: 4px;\n\}/, `.qrph-scan-hint {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-top: 4px;
}`);

css = css.replace(/\.qrph-due-label \{\n  font-size: 0\.75rem;\n  font-weight: 700;\n  color: #64748b;\n  text-transform: uppercase;\n\}/, `.qrph-due-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}`);

fs.writeFileSync('public/css/styles.css', css);
