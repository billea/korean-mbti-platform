const fs = require('fs');
const data = JSON.parse(fs.readFileSync('translations/en.json', 'utf8'));

function findLoveLanguage(obj, path = '') {
  for (const key in obj) {
    if (key.toLowerCase().includes('love')) {
      console.log('Found love-related:', path + '.' + key);
      if (Array.isArray(obj[key]) && obj[key].length > 0 && obj[key][0].text) {
        console.log('  Sample question:', obj[key][0].text);
        console.log('  Total questions:', obj[key].length);
        console.log('  Structure check:', obj[key][0]);
      }
    }
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      findLoveLanguage(obj[key], path + '.' + key);
    }
  }
}

findLoveLanguage(data);