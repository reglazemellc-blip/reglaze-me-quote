# Firebase Deployment Guide

## Prerequisites
- [Firebase CLI](https://firebase.google.com/docs/cli) installed: `npm install -g firebase-tools`
- Firebase project created in [Firebase Console](https://console.firebase.google.com/)
- Logged in to Firebase CLI: `firebase login`

## Setup Firebase Project

1. **Initialize Firebase in your project:**
   ```bash
   firebase init
   ```

2. **Select the following features:**
   - [x] Firestore: Configure security rules and indexes
   - [x] Storage: Configure security rules
   - [x] Hosting: Configure hosting for deployment

3. **Configuration:**
   - Use existing project: Select your Firebase project
   - Firestore rules file: `firestore.rules`
   - Storage rules file: `storage.rules`
   - Public directory: `dist` (for Vite build output)
   - Configure as single-page app: `Yes`
   - Set up automatic builds: `No` (optional)

## Deploy Security Rules

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules
```bash
firebase deploy --only storage:rules
```

### Deploy All Rules
```bash
firebase deploy --only firestore:rules,storage:rules
```

## Deploy Application

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Deploy Everything
```bash
npm run build
firebase deploy
```

## Security Rules Testing

Test your rules locally before deploying:

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Run your tests
npm test
```

## Important Notes

1. **Environment Variables:** 
   - Never commit `.env.local` to git
   - Update Firebase credentials after security incident
   - Use Firebase Console to manage API key restrictions

2. **Security Rules:**
   - Review and test rules before deploying
   - Ensure all collections are protected by authentication
   - Use tenant-based access control

3. **Monitoring:**
   - Enable Firebase Analytics
   - Set up error tracking (e.g., Sentry)
   - Monitor Firestore usage and billing

## Quick Reference

```bash
# Login to Firebase
firebase login

# List projects
firebase projects:list

# Select project
firebase use <project-id>

# Check deployment status
firebase deploy --dry-run

# View deployed rules
firebase firestore:rules:list
firebase storage:rules:list
```

## Troubleshooting

- **Permission denied errors:** Check Firestore rules and authentication
- **Build fails:** Ensure all environment variables are set in `.env.local`
- **Deployment fails:** Verify Firebase CLI is logged in and project is selected

## Resources

- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
