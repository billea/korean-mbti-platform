const fs = require('fs');

const languages = ['en', 'ko', 'es', 'fr', 'zh', 'ja', 'de', 'it', 'pt'];

const testTypes = {
    'mbtiQuestions': { expected: 16, name: 'MBTI' },
    'eqQuestions': { expected: 16, name: 'EQ' },
    'bigFiveQuestions': { expected: 10, name: 'Big Five' },
    'iqQuestions': { expected: 30, name: 'IQ (Brain Challenge)' }
};

console.log('🌍 FINAL VERIFICATION: All Personality Tests Implementation\n');
console.log('=' .repeat(80));

let totalTests = 0;
let passedTests = 0;
let totalQuestions = 0;

languages.forEach(lang => {
    console.log(`\n🏴 ${lang.toUpperCase()} LANGUAGE:`);
    
    try {
        const data = JSON.parse(fs.readFileSync(`translations/${lang}.json`, 'utf8'));
        let langPassed = 0;
        let langTotal = 0;
        let langQuestions = 0;
        
        Object.entries(testTypes).forEach(([testKey, testInfo]) => {
            langTotal++;
            totalTests++;
            
            // Questions might be at root level or nested (typically under 'results')
            let questions = data[testKey];
            if (!questions) {
                // Check if they're in the 'results' object first (most common)
                if (data.results && data.results[testKey]) {
                    questions = data.results[testKey];
                } else {
                    // Check other nested objects
                    for (const key in data) {
                        if (data[key] && typeof data[key] === 'object' && data[key][testKey]) {
                            questions = data[key][testKey];
                            break;
                        }
                    }
                }
            }
            
            if (questions && Array.isArray(questions)) {
                const count = questions.length;
                langQuestions += count;
                totalQuestions += count;
                
                const status = count >= testInfo.expected ? '✅' : '⚠️';
                if (count >= testInfo.expected) {
                    langPassed++;
                    passedTests++;
                }
                
                console.log(`  ${status} ${testInfo.name}: ${count}/${testInfo.expected} questions`);
            } else {
                console.log(`  ❌ ${testInfo.name}: MISSING`);
            }
        });
        
        const completion = Math.round((langPassed / langTotal) * 100);
        console.log(`  📊 Language Status: ${langPassed}/${langTotal} tests (${completion}%) | ${langQuestions} total questions`);
        
    } catch (error) {
        console.log(`  ❌ ERROR: Failed to load translation file - ${error.message}`);
    }
});

console.log('\n' + '=' .repeat(80));
console.log('🎯 FINAL SUMMARY:');
console.log(`✅ Passed Tests: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
console.log(`📝 Total Questions: ${totalQuestions}`);
console.log(`🌍 Languages: ${languages.length}`);
console.log(`🧠 Test Types: ${Object.keys(testTypes).length}`);

if (passedTests === totalTests) {
    console.log('\n🎉 PERFECT IMPLEMENTATION! All tests are complete across all languages! 🎉');
} else {
    console.log(`\n⚠️  Missing: ${totalTests - passedTests} tests need attention`);
}
console.log('=' .repeat(80));