const fs = require('fs');

// 1. Move Admin.init() to the top of App.init() to avoid network delays
let appCode = fs.readFileSync('public/js/app.js', 'utf8');
appCode = appCode.replace(/\s*Admin\.init\(\);/g, '');
appCode = appCode.replace(/async init\(\) \{/, "async init() {\n    Admin.init();");
fs.writeFileSync('public/js/app.js', appCode);

// 2. Remove the "Cancel" button from the initial Passcode screen so they are forced to log in
let htmlCode = fs.readFileSync('public/index.html', 'utf8');
htmlCode = htmlCode.replace(/<button class="btn btn-secondary" onclick="Admin\.closePinModal\(\)"[^>]*>Cancel<\/button>/, '');
fs.writeFileSync('public/index.html', htmlCode);
