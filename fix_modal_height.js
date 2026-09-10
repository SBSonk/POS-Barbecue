const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

css = css.replace(/max-height: 90vh;/g, 'max-height: 90dvh;');

fs.writeFileSync('public/css/styles.css', css);
