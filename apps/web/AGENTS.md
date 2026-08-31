<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# EduBoard — Complete Project Summary

## Architecture
```
smartboard_pdd/
├── frontend/           # Next.js app (port 3000)
│   ├── app/            # Next.js frontend (15 modules)
│   │   ├── layout/     # AppLayout (sidebar, topbar, theme system)
│   │   ├── dashboard/  # Overview, stats, quick actions
│   │   ├── smart-board/# Full whiteboard canvas (existing)
│   │   ├── ai/         # AI Teaching Assistant (chat, OCR, quiz)
│   │   ├── collaboration/# Real-time multi-user whiteboard
│   │   ├── analytics/  # Usage, gestures, AI performance charts
│   │   ├── export/     # Multi-format export center (12 formats)
│   │   ├── settings/   # All settings (appearance, gestures, voice, etc.)
│   │   └── ...         # Auth, admin, classroom, cloud, ar (existing)
│   ├── lib/            # Store, types, gesture engine, socket client
│   ├── components/     # Reusable React components
│   ├── public/         # Static assets
│   ├── electron/       # Electron desktop shell (main.js, preload.js)
│   ├── tests/          # Jest unit + Jest integration + Cypress E2E
│   ├── docker/         # Docker Compose (frontend, backend, MySQL, Nginx)
│   ├── docs/           # Documentation
│   └── ...config files
├── backend/            # Express.js backend (port 3001)
│   ├── server/         # API server
│   │   ├── config/     # Database config (MySQL + localStorage fallback)
│   │   ├── middleware/  # JWT auth, RBAC, error handling
│   │   ├── routes/     # 8 API route modules (auth, whiteboards, collaboration, ai, export, voice, gesture, users, analytics)
│   │   ├── services/   # AI (OpenAI), Export (PDF/PNG/SVG/HTML/MD/JSON), Voice, Encryption
│   │   ├── socket/     # Real-time collaboration via Socket.io
│   │   └── scripts/    # Database init
│   └── database/       # MySQL schema (17 tables) + migrations
```

## Key Features Implemented
- **Smart Whiteboard**: Full drawing canvas with shapes, text, images, sticky notes, freehand, layers, undo/redo, version control
- **Gesture Recognition**: Camera-based hand tracking with 10 gesture mappings
- **AI Integration**: OpenAI-powered handwriting OCR, spelling/grammar check, text completion, teaching assistant, image gen, summarization, quiz/lesson plan generation, translation
- **Real-time Collaboration**: Socket.io-based multi-user boards with cursors, chat, presentation mode
- **Export Center**: 12 formats (PDF, PNG, SVG, JSON, PPTX, DOCX, HTML, MD, LaTeX, CSV, GIF, MP4)
- **Auth + RBAC**: JWT with refresh tokens, 4 roles (admin, teacher, student, viewer)
- **Analytics**: Usage stats, gesture accuracy, AI performance, daily trends
- **Voice Commands**: 14 intent-based voice commands
- **Theme System**: 4 themes (dark, light, neon, educational) with CSS variables
- **Offline Mode**: localStorage fallback when MySQL unavailable
- **Electron Desktop**: Main process, preload, IPC handlers, auto-update ready
- **Docker**: Full containerized deployment (nginx, frontend, backend, mysql)

## Running
```bash
# Development
cd frontend && npm install
cd ../backend/server && npm install && cd ../..
npm run server:dev     # Start backend on :3001 (from frontend/)
npm run dev            # Start frontend on :3000 (from frontend/)
npm run electron:dev   # Start Electron desktop app (from frontend/)

# Database
npm run db:init        # Create MySQL tables (from frontend/)

# Tests
npm test               # Jest unit + integration (from frontend/)
npm run test:e2e       # Cypress E2E (from frontend/)

# Production
npm run build && npm run electron:build:win  # Build Windows installer (from frontend/)

# Docker
docker-compose -f frontend/docker/docker-compose.yml up -d
```

## API Endpoints (30+)
- `POST /api/auth/register|login|refresh|logout`
- `GET|POST /api/whiteboards`, `GET|PUT|DELETE /api/whiteboards/:id`
- `POST /api/whiteboards/:id/shapes`, `PUT|DELETE /api/whiteboards/:id/shapes/:shapeId`
- `POST /api/whiteboards/:id/versions`, `POST /api/whiteboards/:id/restore/:versionId`
- `POST /api/ai/handwriting|spelling|grammar|complete|teaching|generate-image|summarize|quiz|lesson-plan|translate`
- `POST /api/collaboration/rooms|join`, `GET /api/collaboration/room/:id/participants`
- `POST|GET|DELETE /api/exports`
- `POST /api/voice/command`, `POST /api/gesture/log`
- `GET /api/analytics/overview|boards|ai|gestures|export|collaboration`
- `GET /api/health`
- `WebSocket /socket.io` for real-time board collaboration
