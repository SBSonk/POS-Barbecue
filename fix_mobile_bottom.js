const fs = require('fs');
let css = fs.readFileSync('public/css/styles.css', 'utf8');

// Use 100dvh for better mobile safari support
css = css.replace(/height: 100vh;/g, 'height: 100dvh; /* standard */\n  min-height: 100vh; /* fallback */');

// In mobile media query, let's explicitly add padding to scrollable areas
// Look for .products-grid-scroll { padding-bottom: 60px; } inside media query
css = css.replace(/\.products-grid-scroll \{\n    padding-bottom: 60px; \/\* Space above mobile cart bar \*\/\n  \}/, `.products-grid-scroll {
    padding-bottom: 120px; /* Space above mobile cart bar and nav */
  }
  .pending-layout {
    padding-bottom: 85px !important;
  }
  .admin-layout {
    padding-bottom: 85px !important;
  }`);

fs.writeFileSync('public/css/styles.css', css);
