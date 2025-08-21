const fs = require('fs');
const data = JSON.parse(fs.readFileSync('translations/fr.json', 'utf8'));

console.log('🔍 CHECKING FRENCH TRANSLATION WARNINGS:');
console.log('=======================================');

const warningPaths = [
  'tests.meta.insights',
  'tests.meta.socialApp', 
  'tests.growth',
  'tests.meta.guidance',
  'tests.meta.improvement',
  'footer.faq',
  'footer.contact'
];

warningPaths.forEach(path => {
  const parts = path.split('.');
  let current = data;
  let found = true;
  
  for (const part of parts) {
    if (current && current[part] !== undefined) {
      current = current[part];
    } else {
      found = false;
      break;
    }
  }
  
  console.log(`${found ? '✅' : '❌'} ${path}: ${found ? current : 'MISSING'}`);
});

console.log('\n📋 ALTERNATIVE LOCATIONS FOUND:');
console.log('==============================');

// Check if these exist in alternative locations
const alternatives = [
  { path: 'meta.insights', value: data.tests?.['meta.insights'] },
  { path: 'meta.socialApp', value: data.tests?.['meta.socialApp'] },
  { path: 'tests.growth', value: data.tests?.growth },
  { path: 'footer.faq', value: data.footer?.faq },
  { path: 'footer.contact', value: data.footer?.contact }
];

alternatives.forEach(alt => {
  if (alt.value) {
    console.log(`✅ Found ${alt.path}: ${alt.value}`);
  }
});