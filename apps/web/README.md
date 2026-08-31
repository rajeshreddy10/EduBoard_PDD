# EduBoard 🎓✨

> **Futuristic AI-powered smart classroom platform** with touchless gesture control, AI teaching tools, realtime collaboration, and cross-platform support.

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow_Lite-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 🌟 Overview

**EduBoard** is a revolutionary classroom platform that bridges human intuition with digital creation. Teachers and students interact with the board using **natural hand gestures**, **voice commands**, and **AI-powered tools** — no mouse, no keyboard, no touch screen required.

The platform replaces expensive hardware smart boards with a software-only solution that runs on any device: laptop, tablet, projector, or interactive display. It combines realtime hand tracking, computer vision, natural language processing, and collaborative editing into a single seamless experience.

**Who it's for:**
- 🧑‍🏫 **Teachers** — Deliver interactive lessons with gesture-controlled whiteboards, live quizzes, polls, and automatic lecture summarization
- 🎓 **Students** — Learn collaboratively with realtime multiplayer whiteboards, AI-generated notes, and AR/VR lab simulations
- 🏫 **School Administrators** — Manage classrooms, track analytics, monitor student engagement, and control subscriptions across the institution
- 💻 **Developers** — Extend the platform with a modular FastAPI backend, WebSocket realtime layer, and open gesture recognition pipeline

---

## 🎯 Key Features

### ✋ Gesture Control
| Feature | Description |
|---|---|
| **Touchless Interaction** | Control the entire board using hand gestures via webcam — no physical contact needed |
| **Hand Gesture Recognition** | Pinch to draw, five-fingers for broad strokes, index point for cursor, fist to erase |
| **Air Writing** | Write in the air with your index finger; text appears on screen in realtime |
| **Custom Gesture Mapping** | Remap any gesture to any action (draw, erase, pan, zoom, undo, redo, tool menu) |
| **Gesture Training** | Train the model to recognize your unique hand shapes and improve accuracy over time |
| **Multi-Platform** | Works on web, Android tablet, and Windows smart displays |

### 🤖 AI-Powered
| Feature | Description |
|---|---|
| **Lecture Summarization** | AI automatically summarizes recorded lectures into concise notes with key points and action items |
| **AI Note Generation** | Generate structured notes from whiteboard content, speech, and OCR text |
| **OCR Text Extraction** | Extract printed and handwritten text from any board content or uploaded images |
| **Handwriting Recognition** | Convert natural handwriting into digital text in realtime |
| **Equation Recognition** | Recognize and render mathematical expressions from hand-drawn equations |
| **Voice Commands** | Control the board with natural language ("clear board", "save", "change color to red") |
| **Spell Check & Auto-Correct** | Realtime NLP-based text correction for written content |
| **Smart Recommendations** | AI suggests relevant content, lesson plans, and teaching materials based on context |

### 🖊️ Smart Board
| Feature | Description |
|---|---|
| **Digital Whiteboard** | Full-featured infinite canvas whiteboard with pen, brush, highlighter, and eraser tools |
| **Infinite Canvas** | Zoom, pan, and scroll across an unlimited drawing area |
| **Shape Recognition** | Draw rough shapes; AI snaps them to perfect circles, rectangles, triangles, arrows, and stars |
| **Multi-Color Tools** | 10+ colors with adjustable stroke width, opacity, and tool type |
| **Text Tool** | Add, edit, and format text directly on the board with multiple fonts |
| **Undo/Redo** | Full undo/redo stack with history navigation |

### 🏫 Classroom
| Feature | Description |
|---|---|
| **Live Classroom** | Realtime streaming classroom with student join codes and teacher controls |
| **Attendance Tracking** | Automatic attendance via face recognition, QR code, or manual check-in |
| **Face Recognition** | Student identification and auto-attendance using webcam face detection |
| **Polls & Quizzes** | Create live polls (multiple choice, true/false, rating, open-text) and timed quizzes |
| **Lecture Recording** | Record full lectures with whiteboard replay, audio, and transcript |
| **Lecture Replay** | Play back recorded lectures stroke-by-stroke for student review |
| **Hand Raise** | Digital hand raise with student queue management |
| **Leaderboard** | Gamified engagement scoring with class leaderboard |

### 👥 Collaboration
| Feature | Description |
|---|---|
| **Multiplayer Whiteboard** | Multiple users draw simultaneously on the same board in realtime |
| **Shared Drawing** | Collaborate on shared canvases with per-user cursor visibility |
| **Team Dashboard** | Unified dashboard for group projects and team boards |
| **Real-time Sync** | WebSocket-powered instant sync of strokes, cursors, and board state |

### ☁️ Cloud
| Feature | Description |
|---|---|
| **File Sync** | Automatic cloud sync of boards, lectures, and files across devices |
| **Auto-Save** | Board content auto-saves every change to prevent data loss |
| **Cross-Device Access** | Start on a laptop, continue on a tablet — seamless transition |
| **File Management** | Upload, download, organize, and share files with folder structure |
| **Saved Lectures** | Browse and replay all past recorded lectures |

### 🥽 AR/VR
| Feature | Description |
|---|---|
| **AR Teaching Mode** | Augmented reality overlay for interactive 3D teaching |
| **3D Object Interaction** | Rotate, scale, and explore 3D models from science, math, anatomy, and engineering |
| **Virtual Science Lab** | Interactive virtual lab simulations for chemistry and physics experiments |

### 📊 Analytics
| Feature | Description |
|---|---|
| **Student Analytics** | Individual performance tracking, engagement scores, gesture accuracy |
| **Teacher Insights** | Teaching effectiveness metrics, classroom engagement trends |
| **Performance Reports** | Daily/weekly/monthly reports with trends, recommendations, and AI insights |
| **Classroom Analytics** | Attendance rates, poll participation, collaboration metrics |

---

## 📱 Screens (86+)

### Auth Screens (12)
| Screen | Route |
|---|---|
| Login | `/auth/login` |
| Signup | `/auth/signup` |
| Forgot Password | `/auth/forgot-password` |
| Reset Password | `/(auth)/reset-password` |
| Email Verification | `/auth/verify-email` |
| OTP Verification | `/(auth)/otp-verification` |
| Biometric Login | `/(auth)/biometric-login` |
| Role Selection | `/(auth)/role-selection` |
| Onboarding | `/(auth)/onboarding` |
| Student Dashboard | `/(dashboard)/student` |
| Teacher Dashboard | `/(dashboard)/teacher` |
| Admin Dashboard | `/(dashboard)/admin` |

### Home & Dashboard (8)
| Screen | Route |
|---|---|
| Main Dashboard | `/dashboard` |
| Dashboard Analytics | `/dashboard/analytics` |
| Boards Overview | `/dashboard/boards` |
| Shared Boards | `/dashboard/shared` |
| Quick Tools | `/dashboard/tools` |
| Account Settings | `/dashboard/settings` |
| Dashboard Layout | `/(dashboard)/layout` |
| Activity Feed | `/(dashboard)/activity` |

### Smart Board Module (20)
| Screen | Route |
|---|---|
| Whiteboard Canvas | `/smart-board/whiteboard` |
| Air Writing | `/smart-board/air-writing` |
| Gesture Mapping | `/smart-board/gesture-mapping` |
| Gesture Training | `/smart-board/gesture-training` |
| Handwriting Recognition | `/smart-board/handwriting` |
| OCR Tool | `/smart-board/ocr` |
| Equation Recognition | `/smart-board/equations` |
| Shape Recognition | `/smart-board/shapes` |
| Toolbar Settings | `/smart-board/toolbar` |
| Voice Commands | `/smart-board/voice-commands` |
| Camera Feed | `/smart-board/camera` |
| Calibration | `/smart-board/calibration` |
| Export Board | `/smart-board/export` |

### Classroom Features (10)
| Screen | Route |
|---|---|
| Live Classroom | `/classroom/live` |
| Join Classroom | `/classroom/join` |
| Attendance | `/classroom/attendance` |
| Face Attendance | `/classroom/face-attendance` |
| Classroom Chat | `/classroom/chat` |
| Student Interaction | `/classroom/interaction` |
| Leaderboard | `/classroom/leaderboard` |
| Lecture Recording | `/classroom/lecture-recording` |
| Lecture Replay | `/classroom/lecture-replay` |
| Polls & Quizzes | `/classroom/polls` |

### AI Features (5)
| Screen | Route |
|---|---|
| AI Insights | `/ai/insights` |
| AI Notes | `/ai/notes` |
| AI Recommendations | `/ai/recommendations` |
| AI Search | `/ai/search` |
| AI Summaries | `/ai/summary` |

### File & Cloud Management (5)
| Screen | Route |
|---|---|
| Cloud Files | `/cloud/files` |
| Downloads | `/cloud/downloads` |
| Saved Lectures | `/cloud/saved-lectures` |
| Cloud Sync | `/cloud/sync` |
| Upload Center | `/cloud/upload` |

### Collaboration (4)
| Screen | Route |
|---|---|
| Multiplayer Whiteboard | `/collaboration/multiplayer-whiteboard` |
| Shared Drawing | `/collaboration/shared-drawing` |
| Team Dashboard | `/collaboration/team-dashboard` |
| Invite Members | `/collaboration/invite` |

### Analytics (4)
| Screen | Route |
|---|---|
| Classroom Analytics | `/analytics/classroom` |
| Performance Analytics | `/analytics/performance` |
| Student Analytics | `/analytics/student` |
| Teacher Analytics | `/analytics/teacher` |

### Admin Panel (5)
| Screen | Route |
|---|---|
| User Management | `/admin/users` |
| School Management | `/admin/school` |
| Content Moderation | `/admin/moderation` |
| System Monitoring | `/admin/monitoring` |
| Subscription Oversight | `/admin/subscriptions` |

### Premium Features (4)
| Screen | Route |
|---|---|
| Plans & Pricing | `/premium/plans` |
| Payment Methods | `/premium/payment` |
| Enterprise Portal | `/premium/enterprise` |
| Feature Unlock | `/premium/unlock` |

### AR & Future Features (3)
| Screen | Route |
|---|---|
| AR Teaching | `/ar/teaching` |
| 3D Object Viewer | `/ar/3d-objects` |
| Virtual Lab | `/ar/virtual-lab` |

### Settings & Support (6)
| Screen | Route |
|---|---|
| Help Center | `/help/center` |
| About | `/help/about` |
| Devices | `/help/devices` |
| Feedback | `/help/feedback` |
| Privacy | `/help/privacy` |
| Security | `/help/security` |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Next.js 16 + React 19               │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────────┐    │   │
│  │  │ Gesture │ │ Smart    │ │ Classroom      │    │   │
│  │  │ Canvas  │ │ Board    │ │ Live           │    │   │
│  │  └─────────┘ └──────────┘ └────────────────┘    │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────────┐    │   │
│  │  │ AI      │ │ Analytics│ │ Collaboration  │    │   │
│  │  │ Tools   │ │ Dashboard│ │ Module         │    │   │
│  │  └─────────┘ └──────────┘ └────────────────┘    │   │
│  │         Tailwind CSS v4 · Zustand · Socket.IO     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬────────────────────────────────────┘
                      │ HTTP/WS
┌─────────────────────▼────────────────────────────────────┐
│                   API GATEWAY                             │
│       FastAPI · WebSocket · JWT Auth · Rate Limit        │
└──────┬──────────┬──────────┬──────────┬──────────────────┘
       │          │          │          │
┌──────▼──┐ ┌─────▼────┐ ┌──▼──────┐ ┌▼──────────────────┐
│ Gesture │ │   AI     │ │Realtime │ │  Data / Storage    │
│ Module  │ │ Pipeline │ │(Socket) │ │                    │
│         │ │         │ │         │ │ ┌──────┐┌──────┐  │
│MediaPipe│ │  OCR    │ │ Board   │ │ │Local ││Cloud │  │
│ OpenCV  │ │  STT    │ │ Collab  │ │ │Store ││Sync  │  │
│ TFLite  │ │  NLP    │ │Gesture  │ │ └──────┘└──────┘  │
│         │ │  LLM    │ │Classroom│ │ ┌──────┐┌──────┐  │
└─────────┘ └─────────┘ └─────────┘ │ │SQLite││S3    │  │
                                    │ │      ││CDN   │  │
                                    │ └──────┘└──────┘  │
                                    └────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **State Management** | Zustand + React Context |
| **Real-time** | Socket.IO Client + WebSocket |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Gesture Recognition** | MediaPipe Hands, OpenCV, TensorFlow Lite (`@tensorflow/tfjs`, `@tensorflow-models/handpose`) |
| **NLP** | Custom spell-check & text correction pipeline |
| **PWA** | `@ducanh2912/next-pwa` with service worker |
| **Styling** | Tailwind CSS v4 + Glassmorphism UI components |
| **Storage** | LocalStorage (offline-first) + cloud sync architecture |
| **Authentication** | JWT tokens + OAuth2 (Google, Microsoft) + biometric |
| **Deployment** | Docker, PWA, Android (PWABuilder), Windows (MS Store) |

---

## 📂 Project Structure

```
smartboard_pdd/
├── app/                          # Next.js 16 App Router pages
│   ├── (auth)/                   # Auth group routes
│   │   ├── biometric-login/
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── otp-verification/
│   │   ├── reset-password/
│   │   ├── role-selection/
│   │   └── signup/
│   ├── (dashboard)/              # Dashboard group routes
│   │   ├── activity/
│   │   ├── admin/
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── settings/
│   │   ├── student/
│   │   └── teacher/
│   ├── admin/                    # Admin panel
│   │   ├── moderation/
│   │   ├── monitoring/
│   │   ├── school/
│   │   ├── subscriptions/
│   │   └── users/
│   ├── ai/                       # AI features
│   │   ├── insights/
│   │   ├── notes/
│   │   ├── recommendations/
│   │   ├── search/
│   │   └── summary/
│   ├── analytics/                # Analytics dashboards
│   │   ├── classroom/
│   │   ├── performance/
│   │   ├── student/
│   │   └── teacher/
│   ├── ar/                       # AR/VR module
│   │   ├── 3d-objects/
│   │   ├── teaching/
│   │   └── virtual-lab/
│   ├── auth/                     # Auth pages
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify-email/
│   ├── classroom/                # Classroom features
│   │   ├── attendance/
│   │   ├── chat/
│   │   ├── face-attendance/
│   │   ├── interaction/
│   │   ├── join/
│   │   ├── leaderboard/
│   │   ├── lecture-recording/
│   │   ├── lecture-replay/
│   │   ├── live/
│   │   └── polls/
│   ├── cloud/                    # Cloud file management
│   │   ├── downloads/
│   │   ├── files/
│   │   ├── saved-lectures/
│   │   ├── sync/
│   │   └── upload/
│   ├── collaboration/            # Collaboration features
│   │   ├── invite/
│   │   ├── multiplayer-whiteboard/
│   │   ├── shared-drawing/
│   │   └── team-dashboard/
│   ├── dashboard/                # Main dashboard
│   │   ├── analytics/
│   │   ├── boards/
│   │   ├── settings/
│   │   ├── shared/
│   │   └── tools/
│   ├── help/                     # Help & support
│   │   ├── about/
│   │   ├── center/
│   │   ├── devices/
│   │   ├── feedback/
│   │   ├── privacy/
│   │   └── security/
│   ├── premium/                  # Premium features
│   │   ├── enterprise/
│   │   ├── payment/
│   │   ├── plans/
│   │   └── unlock/
│   ├── smart-board/              # Core smart board module
│   │   ├── air-writing/
│   │   ├── calibration/
│   │   ├── camera/
│   │   ├── equations/
│   │   ├── export/
│   │   ├── gesture-mapping/
│   │   ├── gesture-training/
│   │   ├── handwriting/
│   │   ├── ocr/
│   │   ├── shapes/
│   │   ├── toolbar/
│   │   ├── voice-commands/
│   │   └── whiteboard/
│   ├── globals.css
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Entry splash screen
├── backend/                      # Python FastAPI backend
│   ├── ai/                       # AI pipeline modules
│   │   ├── gesture/
│   │   ├── ocr/
│   │   ├── recommendations/
│   │   ├── speech/
│   │   └── summarizer/
│   ├── api/                      # REST API endpoints
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── boards/
│   │   ├── classroom/
│   │   ├── files/
│   │   └── subscriptions/
│   ├── db/                       # Database layer
│   ├── deployment/               # Deployment configs
│   ├── middleware/                # Auth, CORS, rate limit, error handling
│   │   ├── auth.py
│   │   ├── cors.py
│   │   ├── error_handler.py
│   │   └── rate_limit.py
│   ├── models/                   # Data models
│   ├── services/                 # Business logic
│   │   ├── analytics_service.py
│   │   ├── auth_service.py
│   │   ├── email_service.py
│   │   ├── notification_service.py
│   │   └── storage_service.py
│   ├── ws/                       # WebSocket handlers
│   │   ├── board_handler.py
│   │   ├── classroom_handler.py
│   │   ├── collaboration_handler.py
│   │   └── gesture_handler.py
│   └── tests/                    # Backend tests
│       ├── test_ai.py
│       ├── test_auth.py
│       ├── test_boards.py
│       └── test_classroom.py
├── components/                   # Reusable React components
│   ├── admin/
│   ├── ai/
│   ├── analytics/
│   ├── ar/
│   ├── auth/
│   ├── classroom/
│   ├── cloud/
│   ├── collaboration/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── premium/
│   ├── smart-board/
│   ├── ui/                       # UI primitives
│   │   ├── AnimatedContainer.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── GlassButton.tsx
│   │   ├── GlassCard.tsx
│   │   ├── GlassInput.tsx
│   │   ├── GradientText.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts
│   ├── GestureCanvas.tsx         # Core gesture-driven canvas
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── ui.tsx
├── gesture_module/               # Standalone gesture detection
│   ├── gesture_detector.py       # MediaPipe-based gesture recognition
│   └── server.py
├── nlp_module/                   # NLP utilities
│   └── spell_checker.py
├── ui_module/                    # Text formatting
│   └── text_formatter.py
├── lib/                          # Shared utilities
│   ├── api.ts                    # Axios API client
│   ├── AuthContext.tsx           # Auth React context
│   ├── BoardContext.tsx          # Board state context
│   ├── formatter.ts
│   ├── hooks.ts
│   ├── socket.ts                 # Socket.IO client service
│   ├── spellcheck.ts
│   ├── store.ts                  # Offline-first localStorage store
│   └── types.ts                  # Full TypeScript type definitions
├── public/                       # Static assets
│   ├── icons/
│   ├── illustrations/
│   ├── onboarding/
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker
├── docker/                       # Docker configuration
├── github/workflows/             # CI/CD pipelines
├── server.py                     # Main FastAPI server entry point
├── package.json
├── next.config.ts                # Next.js + PWA config
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── tailwind.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime |
| **npm** | 10+ | Package management |
| **Python** | 3.11+ | Backend & AI modules |
| **pip** | 23+ | Python package management |
| **Docker** | 24+ (optional) | Containerized deployment |
| **Webcam** | Any | Gesture recognition & face attendance |

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server (with Webpack)
npm run dev

# Or use Turbopack for faster development
npx next dev --turbopack
```

The frontend runs at **http://localhost:3000**.

### Backend Setup

```bash
# Create virtual environment (recommended)
python -m venv venv
.\venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux/macOS

# Install Python dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
python server.py
```

The backend API runs at **http://localhost:8000**.

### Running Both (Development)

Open **two terminals**:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
python server.py
```

### Docker Setup

```bash
# Build and run all services
docker-compose up -d

# Or build individual images
docker build -f docker/Dockerfile.frontend -t eduboard-frontend .
docker build -f docker/Dockerfile.backend -t eduboard-backend .
```

---

## 🔐 Authentication

The platform supports a comprehensive authentication system with multiple methods:

| Method | Status | Details |
|---|---|---|
| **Email/Password** | ✅ | Standard registration with email verification |
| **Google OAuth** | ✅ | One-click sign-in with Google account |
| **Microsoft OAuth** | ✅ | One-click sign-in with Microsoft/Office 365 |
| **Biometric** | ✅ | Fingerprint and face recognition (device-native) |
| **OTP Verification** | ✅ | Email-based one-time password for verification |
| **Magic Link** | 🚧 | Passwordless email login (roadmap) |

### Role-Based Access Control

| Role | Permissions |
|---|---|
| **Student** | Join classrooms, participate in polls, use whiteboard, view analytics |
| **Teacher** | Create classrooms, record lectures, manage students, access AI tools |
| **School Admin** | Manage school settings, oversee teachers, view institution analytics |
| **Super Admin** | Full system access, user management, platform configuration |

### Auth Flow

```
User → Login/Signup → JWT Issued → Stored in localStorage
   ↓                                            ↓
  API calls include Authorization: Bearer <token>
   ↓                                            ↓
  Middleware validates → 401 on expiry → Refresh token
```

---

## 🤖 AI Pipeline

### Gesture Recognition Pipeline

```
Camera Frame Capture
        ↓
  MediaPipe Hand Landmarks (21 points per hand)
        ↓
  Finger State Detection (extended/curled per finger)
        ↓
  Gesture Classification (pinch, five, hover, point, fist, etc.)
        ↓
  Stability Filtering (debounce over N frames)
        ↓
  Gesture → Action Mapping (user-configurable)
        ↓
  Canvas Action (draw, erase, pan, zoom, select)
```

**Confidence thresholds:** Detection 0.7, Tracking 0.7, configurable in settings.

### OCR Text Extraction

```
Board Content / Uploaded Image
        ↓
  Preprocessing (grayscale, threshold, denoise)
        ↓
  Tesseract OCR / TensorFlow Lite
        ↓
  Post-processing (spell check via NLP module)
        ↓
  Structured text output with position metadata
```

### Speech-to-Text

```
Microphone Audio → Web Speech API / Backend STT
        ↓
  Transcription with punctuation
        ↓
  Voice command matching OR lecture transcript
```

### Lecture Summarization

```
Recorded Lecture (whiteboard strokes + audio transcript)
        ↓
  NLP Processing (key phrase extraction, topic modeling)
        ↓
  AI Summary Generation (key points, action items, questions)
        ↓
  Structured output saved with lecture replay
```

### Recommendation Engine

```
User analytics + board content + classroom data
        ↓
  Feature extraction (frequency, accuracy, subjects, patterns)
        ↓
  Recommendation scoring → personalized suggestions
```

---

## 🌐 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/signup` | Register new account |
| `POST` | `/auth/logout` | Logout current session |
| `GET` | `/auth/me` | Get current user profile |
| `POST` | `/auth/verify-email` | Verify email with token |
| `POST` | `/auth/reset-password` | Request password reset |
| `POST` | `/auth/confirm-reset` | Confirm password reset |

### Boards
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/boards` | List all boards |
| `POST` | `/boards` | Create new board |
| `GET` | `/boards/:id` | Get board by ID |
| `PUT` | `/boards/:id` | Update board |
| `DELETE` | `/boards/:id` | Delete board |
| `POST` | `/boards/:id/share` | Share board with users |
| `GET` | `/boards/shared` | Get shared boards |
| `GET` | `/boards/:id/activity` | Get board activity log |
| `GET` | `/boards/:id/export` | Export board (pdf/png/json) |

### AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/spellcheck` | Spell check text |
| `POST` | `/api/format` | Apply text formatting |
| `WS` | `/ws` | WebSocket for gesture streaming |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/usage` | Get usage statistics |
| `GET` | `/analytics/:type` | Get analytics by type (gestures, accuracy, writing, time) |

### User Profile
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get user profile |
| `PUT` | `/profile` | Update profile |
| `POST` | `/profile/avatar` | Upload avatar |
| `GET` | `/settings` | Get settings |
| `PUT` | `/settings` | Update settings |

### WebSocket Events
| Event | Direction | Description |
|---|---|---|
| `board:join` | Client → Server | Join a board room |
| `board:leave` | Client → Server | Leave a board room |
| `board:stroke` | Client → Server | Send drawing stroke |
| `board:cursor` | Client → Server | Send cursor position |
| `board:stroke:received` | Server → Client | Receive remote stroke |
| `board:cursor:received` | Server → Client | Receive remote cursor |
| `board:user:joined` | Server → Client | User joined notification |
| `board:user:left` | Server → Client | User left notification |
| `classroom:join` | Client → Server | Join classroom |
| `classroom:chat` | Client → Server | Send chat message |
| `classroom:hand:raise` | Client → Server | Raise hand |
| `classroom:poll:vote` | Client → Server | Vote on poll |
| `gesture:data` | Client → Server | Send gesture data |
| `gesture:data:received` | Server → Client | Receive gesture |
| `ai:summary:request` | Client → Server | Request AI summary |
| `ai:summary:ready` | Server → Client | AI summary ready |

---

## 📲 Deployment

### Web (PWA)

The app is a fully functional Progressive Web App with offline support:

```bash
# Production build
npm run build

# Start production server
npm start
```

Features:
- Installable on desktop and mobile (manifest.json + service worker)
- Offline support via service worker caching
- Cross-platform: Windows, macOS, Linux, ChromeOS
- Automatic updates via Workbox

### Android (APK/AAB)

Convert the PWA to a native Android app:

1. **Using PWABuilder:** https://pwabuilder.com
   - Enter the deployed URL
   - Package as Android APK/AAB
   - Sign with your keystore

2. **Using Bubblewrap:**
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://your-domain.com/manifest.json
   bubblewrap build
   ```

### Windows (Microsoft Store)

Package for Windows using PWABuilder:
1. Build the PWA
2. Use PWABuilder → Package for Windows
3. Generate MSIX package
4. Submit to Microsoft Partner Center

### Docker

```bash
# Build frontend
docker build -f docker/Dockerfile.frontend -t eduboard-frontend .

# Build backend
docker build -f docker/Dockerfile.backend -t eduboard-backend .

# Run with docker-compose
docker-compose up -d
```

---

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests (Python)
pytest backend/tests/

# Lint check
npm run lint
```

---

## 🔒 Security

| Measure | Implementation |
|---|---|
| **JWT Authentication** | Access + refresh token pattern with configurable expiry |
| **Password Hashing** | bcrypt with salt rounds |
| **Rate Limiting** | Per-IP and per-endpoint rate limits via FastAPI middleware |
| **CORS** | Configurable CORS policy with allowed origins |
| **Input Validation** | Strict input validation on all API endpoints |
| **SQL Injection Prevention** | Parameterized queries via SQLAlchemy |
| **XSS Protection** | Content sanitization and CSP headers |
| **HTTPS Enforcement** | SSL/TLS in production |
| **Session Management** | Secure token storage with HTTP-only cookies option |
| **Audit Logging** | All auth events logged with timestamps and IP addresses |

---

## 💰 Monetization

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | 5 boards, 1 classroom, 10 students, basic gestures, community support |
| **Pro** | $9.99/mo | Unlimited boards, 5 classrooms, 50 students, AI summaries, voice commands, analytics |
| **Education** | $4.99/seat/mo | Everything in Pro + unlimited classrooms, 500+ students per school, AR/VR lab, admin dashboard |
| **Enterprise** | Custom | Everything in Education + dedicated server, SSO, custom AI models, SLA, priority support |

---

## 📈 Future Roadmap

| Quarter | Milestone |
|---|---|
| **Q3 2025** | Flutter mobile app (iOS + Android native) |
| **Q4 2025** | Native ARKit (iOS) / ARCore (Android) integration |
| **Q1 2026** | AI avatar teacher with natural language tutoring |
| **Q2 2026** | Blockchain-based credential verification for courses |
| **Q3 2026** | Full VR classroom with Meta Quest / Apple Vision Pro support |
| **Q4 2026** | IoT smart board hardware integration (Raspberry Pi-based) |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style (Tailwind utility classes, TypeScript strict mode)
- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Add tests for new features
- Update documentation as needed
- Run `npm run lint` before committing

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 EduBoard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 📞 Support

| Channel | Contact |
|---|---|
| **GitHub Issues** | [github.com/eduboard/issues](https://github.com/eduboard/issues) |
| **Email** | support@eduboard.ai |
| **Documentation** | docs.eduboard.ai |
| **Community Forum** | community.eduboard.ai |
| **Discord** | [discord.gg/eduboard](https://discord.gg/eduboard) |

---

<div align="center">
  <strong>Built with ❤️ for the future of education</strong>
  <br/><br/>
  <sub>EduBoard — Touchless. Intelligent. Revolutionary.</sub>
</div>
