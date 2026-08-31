# EduBoard Mobile - Android Web Wrapper Application 📱🎓

Native Android module located at `apps/mobile/android` that wraps the EduBoard Next.js web application into a full-screen, hardware-accelerated WebView client.

---

## 🎯 Features & Architecture Overview

- **Full-Screen Hardware Acceleration**: Built with `WebView.LAYER_TYPE_HARDWARE` for smooth 60FPS canvas rendering (DrawSpace canvas, MediaPipe Gestures).
- **Web Media Permissions**: `WebChromeClient.onPermissionRequest` automatically grants Web Camera and Microphone permissions to MediaPipe Gestures & Voice Board without broken web prompts.
- **File Upload Support**: `WebChromeClient.onShowFileChooser` enables document and photo uploads via native system file pickers.
- **Google OAuth Support**: Custom User-Agent (`replace("; wv", "")`) bypasses Google's disallowed user-agent OAuth block.
- **In-App Navigation**: Integrated with `OnBackPressedDispatcher` for fluid in-app web browsing.
- **Connection Fallback & Local IP Switching**: Configured for local development (`http://192.168.x.x:3000`) with an interactive IP address dialog on connection failure.
- **Firebase Configuration**: Integrated with project `eduboard-6fdcc` (`com.eduboard.mobile`).

---

## 🚀 How to Run in Android Studio or via CLI

### 1. Start the Next.js Web App
```bash
npm run dev
# Running on http://localhost:3000 (or http://<YOUR_LOCAL_IP>:3000)
```

### 2. Build via Gradle Wrapper (CLI)
Ensure `JAVA_HOME` points to JDK 17+ (e.g., Android Studio bundled JDK):
```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```
The compiled APK will be located at:
`app/build/outputs/apk/debug/app-debug.apk`

### 3. Open in Android Studio
1. Open Android Studio.
2. Select **Open**.
3. Choose `apps/mobile/android`.
4. Run on an Android Emulator or connected physical device.
