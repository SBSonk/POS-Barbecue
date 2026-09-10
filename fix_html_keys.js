const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(/<button type="button" class="pin-key" data-val="(.*?)">(.*?)<\/button>/g, `<button type="button" class="pin-key" data-val="$1" onclick="Admin.handlePinKey('$1')">$2</button>`);
html = html.replace(/<button type="button" class="pin-key key-action" data-val="(.*?)">(.*?)<\/button>/g, `<button type="button" class="pin-key key-action" data-val="$1" onclick="Admin.handlePinKey('$1')">$2</button>`);

fs.writeFileSync('public/index.html', html);
