# EduBoard.AI — Professional Monorepo

Enterprise-grade AI Smart Teaching & Collaboration SaaS Platform.

## 📁 Project Structure

```text
my-app/
│
├── apps/
│   ├── web/                    # Next.js 16 Frontend
│   └── api/                    # Express.js Backend Entry
│
├── src/                        # Core Logic (Shared/Backend)
│   ├── controllers/            # Request handlers
│   ├── services/               # Business logic & AI pipelines
│   ├── routes/                 # API route definitions
│   ├── middleware/             # Auth & Validation
│   ├── models/                 # Prisma/Database Models
│   ├── database/               # Migrations & Seeders
│   └── socket/                 # Real-time Engine
│
├── infrastructure/             # Docker, K8s, Terraform
├── monitoring/                 # Metrics & Logs
├── public/                     # Static assets
└── scripts/                    # Automation
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your API keys.

### 3. Start Development
```bash
npm run dev
```

## 🛠️ Features
- **Neural Transcription**: Technical STT with LaTeX support.
- **Smart Canvas**: AI Handwriting recognition and alignment.
- **Gesture Board**: Hand tracking via MediaPipe.
- **Multi-Tenant SaaS**: Built-in subscription and role management.
