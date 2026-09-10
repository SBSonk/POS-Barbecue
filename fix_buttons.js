const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

// The script run just before the interruption had successfully updated the styles for qrph box, qrph header, and receipt paper, and was fixing buttons

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

// fix the mobile checkout btn text
css = css.replace(/\.checkout-btn \{\n  width: 100%;\n  padding: 16px;\n  background: var\(--success\);\n  color: var\(--text-main\);/, `.checkout-btn {
  width: 100%;
  padding: 16px;
  background: var(--success);
  color: #fff !important;`);

css = css.replace(/\.mobile-checkout-action \{\n  background: var\(--success\);\n  color: var\(--text-main\);/, `.mobile-checkout-action {
  background: var(--success);
  color: #fff !important;`);

// fix the qrph due val again to be primary color explicitly
css = css.replace(/\.qrph-due-val \{\n  font-size: 1.6rem;\n  font-weight: 800;\n  color: var\(--text-main\);/, `.qrph-due-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--primary);`);

fs.writeFileSync('public/css/styles.css', css);
