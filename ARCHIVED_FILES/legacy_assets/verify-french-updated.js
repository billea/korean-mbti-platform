const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));
  console.log('🇫🇷 UPDATED FRENCH TRANSLATION VERIFICATION:');
  console.log('==========================================');
  
  const tests = {
    'mbtiQuestions': { expected: 16, name: 'MBTI' },
    'eqQuestions': { expected: 16, name: 'EQ' },
    'bigFiveQuestions': { expected: 10, name: 'Big Five' },
    'iqQuestions': { expected: 30, name: 'IQ' },
    'lovelanguageQuestions': { expected: 10, name: 'Love Language' }
  };
  
  let totalTests = 0;
  let passedTests = 0;
  
  Object.entries(tests).forEach(([testKey, testInfo]) => {
    totalTests++;
    let questions = data.results[testKey];
    if (questions && Array.isArray(questions)) {
      const count = questions.length;
      const status = count >= testInfo.expected ? '✅' : '⚠️';
      console.log(`${status} ${testInfo.name}: ${count}/${testInfo.expected} questions`);
      if (count >= testInfo.expected) passedTests++;
    } else {
      console.log(`❌ ${testInfo.name}: MISSING`);
    }
  });
  
  console.log(`\n📊 Summary: ${passedTests}/${totalTests} tests available`);
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS NOW AVAILABLE IN FRENCH! 🎉');
  }
} catch (error) {
  console.log('❌ ERROR:', error.message);
}