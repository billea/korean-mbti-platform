const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));
  console.log('🇫🇷 FRENCH TRANSLATION ANALYSIS:');
  console.log('================================');
  
  const tests = {
    'mbtiQuestions': { expected: 16, name: 'MBTI' },
    'eqQuestions': { expected: 16, name: 'EQ' },
    'bigFiveQuestions': { expected: 10, name: 'Big Five' },
    'iqQuestions': { expected: 30, name: 'IQ' }
  };
  
  Object.entries(tests).forEach(([testKey, testInfo]) => {
    const questions = data[testKey];
    if (questions && Array.isArray(questions)) {
      const count = questions.length;
      const status = count >= testInfo.expected ? '✅' : '⚠️';
      console.log(`${status} ${testInfo.name}: ${count}/${testInfo.expected} questions`);
      
      if (testKey === 'eqQuestions' && questions.length > 0) {
        const dimensions = new Set();
        let validStructure = true;
        questions.forEach((q, i) => {
          if (!q.text || !Array.isArray(q.options) || q.options.length !== 5 || !q.dimension || !Array.isArray(q.scores)) {
            console.log(`  ❌ Question ${i+1} has structural issues`);
            validStructure = false;
          } else {
            dimensions.add(q.dimension);
          }
        });
        console.log(`  📊 EQ Dimensions covered: ${Array.from(dimensions).join(', ')}`);
        console.log(`  🏗️ Structure valid: ${validStructure ? 'Yes' : 'No'}`);
      }
    } else {
      console.log(`❌ ${testInfo.name}: MISSING OR INVALID`);
    }
  });
} catch (error) {
  console.log('❌ ERROR:', error.message);
}