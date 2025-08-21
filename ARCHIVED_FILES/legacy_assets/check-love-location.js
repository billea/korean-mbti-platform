const fs = require('fs');
const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));

console.log('🔍 CHECKING LOVE LANGUAGE LOCATION IN FRENCH:');
console.log('============================================');

// Check where we actually put lovelanguageQuestions
console.log('❓ Checking data.results.lovelanguageQuestions:');
if (data.results && data.results.lovelanguageQuestions) {
  console.log('✅ Found at results.lovelanguageQuestions:', data.results.lovelanguageQuestions.length, 'questions');
  console.log('📝 First question:', data.results.lovelanguageQuestions[0].text);
} else {
  console.log('❌ NOT found at results.lovelanguageQuestions');
}

console.log('\n❓ Checking other possible locations:');
const checkPaths = [
  'lovelanguageQuestions',
  'tests.lovelanguageQuestions', 
  'results.lovelanguage'
];

checkPaths.forEach(path => {
  const keys = path.split('.');
  let current = data;
  for (const key of keys) {
    if (current && current[key]) {
      current = current[key];
    } else {
      current = null;
      break;
    }
  }
  
  if (current && Array.isArray(current)) {
    console.log(`✅ Found at ${path}:`, current.length, 'questions');
  } else if (current) {
    console.log(`⚠️ Found at ${path} but not array:`, typeof current);  
  } else {
    console.log(`❌ NOT found at ${path}`);
  }
});