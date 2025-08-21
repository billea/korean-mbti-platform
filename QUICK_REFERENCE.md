# Quick Reference - Korean MBTI Platform

## 🚀 Start Development Server
```bash
cd "C:\Users\durha\Project\Testing website_refactored\app"
rm -rf .next node_modules/.cache && npm run dev
# Server: http://localhost:300X (port varies)
```

## 🧪 Testing Checklist
- [ ] Homepage purple gradient design loads correctly
- [ ] Language selector (EN/DE/FR/ES/IT/PT/JP/KR/CN) works 
- [ ] Korean language switch shows Korean text (not translation keys)
- [ ] "Start Your Journey" button navigates to tests page
- [ ] Tests page shows purple gradient (not white background)
- [ ] MBTI test card clickable and navigates correctly
- [ ] All 60 MBTI questions display in Korean
- [ ] Scoring algorithm produces meaningful results

## 🔧 Common Fixes

**Server Crashes**: 
```bash
# Kill and restart with cache cleanup
rm -rf .next node_modules/.cache && npm run dev
```

**Translation Keys Showing**:
- Check `/public/translations/ko.json` for missing keys
- Verify `data-translate` attributes match translation structure
- Ensure category names use hyphens (not underscores)

**Design Inconsistency**:
- Apply `bg-gradient-to-br from-indigo-400 via-purple-500 to-purple-600`
- Use `bg-white/20 backdrop-blur-sm` for glassmorphism cards
- Add consistent navigation header

## 📁 Key Files
```
/src/app/[locale]/page.tsx                    # Homepage
/src/app/[locale]/tests/page.tsx             # Tests listing  
/src/lib/test-definitions.ts                 # 60-question MBTI
/public/translations/ko.json                 # Korean translations
/src/components/providers/translation-provider.tsx  # Translation system
```

## 🎯 Current Status
✅ Korean translations working  
✅ Purple gradient design consistent  
✅ 60-question MBTI test complete  
✅ Server stability improved  
⏳ Need to test complete workflow  
⏳ Individual test pages may need design updates