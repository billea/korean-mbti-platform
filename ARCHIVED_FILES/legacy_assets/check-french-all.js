const fs = require('fs');
const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));

function findQuestions(obj, path = '') {
  const questions = [];
  for (const key in obj) {
    if (key.includes('Questions') || key.includes('questions')) {
      questions.push({
        path: path + '.' + key,
        length: Array.isArray(obj[key]) ? obj[key].length : 'Not array'
      });
    }
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      questions.push(...findQuestions(obj[key], path + '.' + key));
    }
  }
  return questions;
}

console.log('🇫🇷 ALL QUESTION TYPES IN FRENCH:');
console.log('================================');
findQuestions(data).forEach(q => console.log(`✅ ${q.path} - Length: ${q.length}`));

// Also check if there are any "love" or "language" related keys
console.log('\n🔍 SEARCHING FOR LOVE LANGUAGE RELATED KEYS:');
console.log('==========================================');

function searchForLoveLanguage(obj, path = '') {
  for (const key in obj) {
    if (key.toLowerCase().includes('love') || key.toLowerCase().includes('language')) {
      console.log(`Found: ${path}.${key}`);
      if (typeof obj[key] === 'object') {
        console.log(`  Type: object, Keys: ${Object.keys(obj[key]).slice(0,5).join(', ')}${Object.keys(obj[key]).length > 5 ? '...' : ''}`);
      } else {
        console.log(`  Value: ${typeof obj[key] === 'string' ? obj[key].substring(0,50) : obj[key]}`);
      }
    }
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      searchForLoveLanguage(obj[key], path + '.' + key);
    }
  }
}

searchForLoveLanguage(data);