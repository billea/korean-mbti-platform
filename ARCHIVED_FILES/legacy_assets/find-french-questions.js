const fs = require('fs');
const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));

function findQuestions(obj, path = '') {
  for (const key in obj) {
    if (key.includes('Questions')) {
      console.log('Found questions at:', path + '.' + key, '- Length:', Array.isArray(obj[key]) ? obj[key].length : 'Not array');
    }
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      findQuestions(obj[key], path + '.' + key);
    }
  }
}

findQuestions(data);