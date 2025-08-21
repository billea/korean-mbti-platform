# Deployment Workflow - Korean MBTI Platform

## Key Instructions for All Work on This Project

### **CRITICAL DEPLOYMENT PROCESS**

**Always deploy changes to Netlify via GitHub for testing on live server:**

1. **Development Process:**
   - Make changes locally in `C:\Users\durha\Project\Testing website_refactored\app`
   - Test locally on `http://localhost:3002` if needed
   - **PRIMARY TESTING**: Deploy to live Netlify server via GitHub

2. **Deployment Steps:**
   ```bash
   cd "C:\Users\durha\Project\Testing website_refactored\app"
   
   # Check status
   git status
   
   # Add relevant changed files
   git add [specific files]
   
   # Commit with descriptive message
   git commit -m "Description of changes
   
   🤖 Generated with Claude Code
   
   Co-Authored-By: Claude <noreply@anthropic.com>"
   
   # Push to GitHub (auto-deploys to Netlify)
   git push origin main
   ```

3. **Testing Location:**
   - **Primary**: https://korean-mbti-platform.netlify.app/
   - **Repository**: https://github.com/billea/korean-mbti-platform

### **Project Structure**
- **Working Directory**: `C:\Users\durha\Project\Testing website_refactored\app`
- **Main App**: Next.js 15 with TypeScript
- **Translations**: `public/translations/ko.json` and `en.json`
- **Test Definitions**: `src/lib/test-definitions.ts`
- **Components**: `src/app/[locale]/tests/[testId]/page.tsx`

### **Key Files to Always Include in Commits**
- `src/lib/test-definitions.ts` - Test logic and questions
- `public/translations/ko.json` - Korean translations
- `public/translations/en.json` - English translations  
- `src/app/[locale]/tests/[testId]/page.tsx` - Test page component
- `src/lib/firestore.ts` - Database functions

### **Testing Protocol**
1. **Local Development**: `npm run dev` on port 3002
2. **Live Testing**: Always push to GitHub → auto-deploy to Netlify
3. **Primary Test URL**: https://korean-mbti-platform.netlify.app/ko/tests/feedback-360

### **Current Major Features**
- **360-degree feedback system** with category selection
- **Academic-grade 20-question framework** 
- **Korean/English bilingual support**
- **Dynamic question system** based on relationship categories
- **Progressive results system** (pending implementation)

### **Troubleshooting Deployment Issues**

**If changes don't appear on live site after deployment:**

1. **Force Rebuild**: Add a comment to trigger new commit
   ```bash
   # Edit any file to add a comment
   git add [file]
   git commit -m "Force rebuild - [reason]"
   git push origin main
   ```

2. **Monitor Deployment**: Use monitoring script
   ```bash
   node monitor-deployment.js
   ```

3. **Check Netlify Status**: Verify build logs at Netlify dashboard
   - Build time: Usually 2-3 minutes
   - Common issues: Caching, build errors, dependency issues

4. **Cache Issues**: If persistent, check:
   - Browser cache (hard refresh: Ctrl+Shift+R)
   - CDN cache at Netlify
   - Service worker cache

---

**⚠️ REMEMBER: Always deploy via GitHub to test changes on the live Netlify server!**