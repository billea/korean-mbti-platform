const fs = require('fs');

function findQuestions(obj, path = '') {
  const questions = [];
  for (const key in obj) {
    if (key.includes('Questions')) {
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

const enData = JSON.parse(fs.readFileSync('translations/en.json', 'utf8'));
const frData = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));

console.log('🇺🇸 ENGLISH questions:');
findQuestions(enData).forEach(q => console.log(`  ${q.path} - Length: ${q.length}`));

console.log('\n🇫🇷 FRENCH questions:');
findQuestions(frData).forEach(q => console.log(`  ${q.path} - Length: ${q.length}`));