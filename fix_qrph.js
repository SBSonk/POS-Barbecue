const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/background: #f8fafc;/g, 'background: var(--bg-app);');
css = css.replace(/border: 1px solid #cbd5e1;/g, 'border: 1px solid var(--border-color);');

css = css.replace(/color: #0f172a;/g, 'color: var(--text-main);');

css = css.replace(/background: #e2e8f0;/g, 'background: var(--bg-card);');
css = css.replace(/color: #475569;/g, 'color: var(--text-muted);');

css = css.replace(/border: 1px solid #e2e8f0;/g, 'border: 1px solid var(--border-color);');
css = css.replace(/background: #f1f5f9;/g, 'background: var(--bg-card);');

css = css.replace(/color: #64748b;/g, 'color: var(--text-muted);');

// receipt paper
css = css.replace(/\.receipt-paper \{[\s\S]*?\}/, `.receipt-paper {
  background: #fff !important;
  padding: 20px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  border: 1px dashed #adb5bd !important;
  border-radius: 4px;
  color: #000 !important;
}`);

// btn text
css = css.replace(/\.btn-primary \{\n  background: var\(--primary\);\n  color: var\(--text-main\);\n\}/, `.btn-primary {
  background: var(--primary);
  color: #fff !important;
}`);

css = css.replace(/\.btn-success \{\n  background: var\(--success\);\n  color: var\(--text-main\);\n\}/, `.btn-success {
  background: var(--success);
  color: #fff !important;
}`);

css = css.replace(/\.btn-danger \{\n  background: var\(--danger\);\n  color: var\(--text-main\);\n\}/, `.btn-danger {
  background: var(--danger);
  color: #fff !important;
}`);

fs.writeFileSync('public/css/styles.css', css);
