# EduBoard Professional Deployment Guide

This document provides the final checklist to move from **Local Development** to **100% Production Ready**.

## 1. Firebase Configuration
- [ ] **Firestore Rules**: Deploy the included `firestore.rules` file via Firebase CLI (`firebase deploy --only firestore:rules`).
- [ ] **Service Account**: For the Backend (`apps/api`), go to Firebase Project Settings > Service Accounts and download a JSON key. Place it in `apps/api/serviceAccountKey.json`.
- [ ] **Authentication**: Ensure Email/Password and Google Login are enabled in the Firebase Console.

## 2. Environment Variables
- [ ] **Frontend (`apps/web/.env`)**: Change `NEXT_PUBLIC_API_URL` to your production domain (e.g., `https://api.eduboard.app/api`).
- [ ] **Backend (`apps/api/.env`)**: Update `ALLOWED_ORIGINS` to include your production frontend URL.

## 3. Real-time Scaling
- [ ] **Redis**: For high-traffic production, install a Redis instance and configure the `src/config/redis.js` to prevent Socket.io desync across multiple servers.

## 4. Hardware Support
- [ ] **HTTPS**: Both Frontend and Backend **MUST** run on HTTPS in production. The `MediaPipe` camera access and `Tesseract.js` OCR will be blocked by browsers on non-secure (HTTP) domains.

## 5. Build Command
```bash
# In the root folder
npm run install:all
npm run build
npm run start
```

Your application is now technically and architecturally ready for commercial use.
