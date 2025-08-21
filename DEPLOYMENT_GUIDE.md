# Deployment Guide - Korean MBTI Platform

Complete guide for deploying the Korean MBTI Platform to Netlify via Git integration.

## Overview

The Korean MBTI Platform is deployed using **Netlify's Git integration** with automatic deployments from the GitHub repository. This setup provides:
- Automatic deployments on every push to main branch
- Build caching and optimization
- CDN distribution
- Environment variable management
- Custom domain support

## Repository Setup

### GitHub Repository
- **Repository**: `billea/korean-mbti-platform`
- **Main Branch**: `main`
- **Working Directory**: `app/` (contains the Next.js application)

### Local Development Structure
```
Testing website_refactored/
├── app/                          # Main Next.js application
│   ├── src/                     # Source code
│   ├── public/                  # Static assets
│   ├── package.json             # Dependencies
│   ├── next.config.js           # Next.js configuration
│   └── netlify.toml             # Netlify configuration
├── DEPLOYMENT_GUIDE.md          # This file
└── PROJECT_PROGRESS.md          # Project status
```

## Netlify Configuration

### Build Settings
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"
  
[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# SPA fallback for Next.js routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Environment Variables (Set in Netlify Dashboard)
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# EmailJS Configuration
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

## Deployment Process

### 1. Standard Deployment Workflow

```bash
# Navigate to app directory
cd app

# Make your changes to source code
# ... edit files ...

# Stage and commit changes
git add .
git commit -m "Your descriptive commit message

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to GitHub (triggers automatic Netlify deployment)
git push origin main
```

### 2. Deployment Timeline
- **Git Push**: Changes pushed to GitHub main branch
- **Netlify Trigger**: Automatic build triggered (usually within 10-30 seconds)
- **Build Process**: 2-4 minutes for full build and deployment
- **Live Update**: Site updates automatically upon successful build

### 3. Monitoring Deployment

#### Via Netlify Dashboard
1. Visit [Netlify Dashboard](https://app.netlify.com)
2. Select "korean-mbti-platform" site
3. Check "Deploys" tab for build status

#### Via Command Line
```bash
# Check latest commit
git log --oneline -1

# Verify build status (wait 60-120 seconds after push)
curl -I https://korean-mbti-platform.netlify.app
```

### 4. Verification Steps

After deployment, verify these key components:

```bash
# Test authentication flow
curl -I https://korean-mbti-platform.netlify.app/en/tests/couple-compatibility/

# Test different locales
curl -I https://korean-mbti-platform.netlify.app/ko/tests/couple-compatibility/

# Test main pages
curl -I https://korean-mbti-platform.netlify.app/en/
curl -I https://korean-mbti-platform.netlify.app/ko/
```

## Troubleshooting Common Issues

### Build Failures

#### TypeScript Errors
```bash
# Check TypeScript compilation locally
npm run build

# Fix common issues:
# - Missing type definitions
# - Import/export errors
# - Configuration issues
```

#### Missing Dependencies
```bash
# Ensure all dependencies are in package.json
npm install

# Check for peer dependencies
npm ls
```

#### Environment Variables
- Verify all required environment variables are set in Netlify dashboard
- Check variable names match exactly (case-sensitive)
- Ensure no quotes around values in Netlify UI

### Authentication Issues

#### Firebase Configuration
- Verify Firebase project settings
- Check domain authorization in Firebase console
- Ensure Netlify domain is added to authorized domains

#### EmailJS Configuration
- Verify EmailJS service is active
- Check template configuration
- Test email delivery manually

### Performance Issues

#### Build Optimization
```bash
# Analyze bundle size
npm run analyze

# Clear Netlify build cache if needed
# (Done via Netlify dashboard -> Site settings -> Build & deploy -> Clear cache)
```

## Site URLs

### Production
- **Primary**: https://korean-mbti-platform.netlify.app
- **English**: https://korean-mbti-platform.netlify.app/en/
- **Korean**: https://korean-mbti-platform.netlify.app/ko/

### Key Test URLs
- **Couple Compatibility**: `/en/tests/couple-compatibility/`
- **360 Feedback**: `/en/tests/feedback-360/`
- **MBTI Classic**: `/en/tests/mbti-classic/`

## Development Best Practices

### Commit Message Format
```
Brief description of changes

- Detailed change 1
- Detailed change 2
- Bug fixes or improvements

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Testing Before Deployment
```bash
# Local development server
npm run dev

# Production build test
npm run build
npm run start

# Type checking
npm run type-check

# Linting (if configured)
npm run lint
```

### Emergency Rollback
If deployment fails and site is broken:

```bash
# Option 1: Quick fix and redeploy
git add .
git commit -m "Hotfix: [issue description]"
git push origin main

# Option 2: Revert to previous working commit
git log --oneline -10  # Find last working commit
git revert [commit-hash]
git push origin main

# Option 3: Via Netlify Dashboard
# Go to Deploys → Click on last successful deploy → "Publish deploy"
```

## Monitoring and Maintenance

### Regular Checks
- Monitor Netlify build status weekly
- Check site performance monthly
- Update dependencies quarterly
- Backup environment variables annually

### Performance Monitoring
- Use Netlify Analytics for traffic insights
- Monitor Core Web Vitals
- Check error logs in Netlify dashboard
- Test authentication flows monthly

## Recent Updates

### Latest Deployment (August 2025)
- ✅ Fixed couple compatibility authentication workflow
- ✅ Implemented personality analysis improvements
- ✅ Added email authentication alongside Google OAuth
- ✅ Enhanced translation system for couple compatibility results
- ✅ Fixed "0% 🤔 Balanced" results issue with personalized insights

### Authentication Security
- Couple compatibility test requires login (same as 360 feedback)
- Client-side authentication checks prevent test access without login
- localStorage pattern ensures proper authentication flow
- Multiple validation layers prevent auth bypass

---

## Quick Reference Commands

```bash
# Deploy changes
cd app && git add . && git commit -m "Update: [description]" && git push

# Check deployment status
curl -I https://korean-mbti-platform.netlify.app

# Test authentication
curl -I https://korean-mbti-platform.netlify.app/en/tests/couple-compatibility/

# Monitor build
# Visit: https://app.netlify.com/sites/korean-mbti-platform/deploys
```

This deployment guide ensures consistent and reliable deployments across all future development sessions.