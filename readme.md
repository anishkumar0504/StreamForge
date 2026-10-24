# StreamForge

**Scalable Video Streaming Backend** — Presigned uploads, background FFmpeg HLS transcoding, Redis caching, real-time updates, and personalized recommendations.

[![Tech](https://img.shields.io/badge/Stack-Node.js%20%7C%20Express%20%7C%20Prisma%20%7C%20Redis%20%7C%20BullMQ%20%7C%20MinIO%20%7C%20FFmpeg%20%7C%20Socket.IO-blue?style=for-the-badge)](#-tech-stack)

> Production-style YouTube-like backend: direct-to-S3 uploads, asynchronous multi-quality HLS processing, hybrid recommendation engine, full-text + fuzzy search, and real-time processing feedback.

---

## 🎯 Project Overview (Resume Summary)

**StreamForge** is a production-grade video streaming platform backend that demonstrates deep backend engineering and distributed systems design.

**What it solves:**
- Users upload large video files without overloading the API server
- Videos are automatically transcoded into adaptive HLS streams (360p + 720p)
- Real-time progress is pushed to the client via WebSockets
- Personalized home feed + related videos using collaborative filtering, trending scores, and watch history
- Fast, relevance-ranked search with personalization

**Key engineering highlights for recruiters:**
- **Presigned S3 uploads** — client uploads directly to MinIO, API stays lightweight
- **BullMQ + Redis** background workers for FFmpeg transcoding (concurrency-controlled)
- **Multi-quality HLS** generation with master playlist
- **Hybrid recommendation system** (trending + personalized + collaborative filtering)
- **Modular domain architecture** (`modules/auth`, `modules/video`, `modules/feed`, `modules/search`, etc.)
- **11-phase search pipeline** (FTS + prefix + trigram fuzzy + ranking + personalization + blending)
- **Socket.IO** real-time upload & processing status updates
- **Prisma + PostgreSQL** with proper status machines, watch history, and analytics

This project shows end-to-end ownership of a media platform backend: upload pipeline, media processing, recommendation systems, search ranking, caching, and real-time feedback.

---

## ✨ Core Features

### 📤 Video Upload & Processing
- **Presigned URL flow** — API only issues a signed PUT URL; client uploads directly to MinIO
- Background **BullMQ worker** downloads, generates thumbnail, extracts duration, and transcodes
- **FFmpeg** produces 360p + 720p HLS segments + master playlist
- Real-time progress events via Socket.IO (UPLOADING → PROCESSING → READY / FAILED)
- Retry mechanism (max 3 attempts) for failed processing
- Automatic cleanup of temporary files

### 🔍 Search System
- Full-text search (`tsvector` / `plainto_tsquery`)
- Prefix matching + trigram fuzzy search (`pg_trgm`)
- Multi-signal ranking (text relevance + engagement + freshness + intent)
- Personalization multipliers based on watch history & subscriptions
- Result blending (3 videos : 1 channel) with cursor-based pagination
- Redis caching of search candidates and user search context

### 🎯 Recommendation & Feed
- **Home Feed** — chronological + personalized (filters already-watched content)
- **Trending** — recency-weighted engagement score (views + completions − age decay)
- **Collaborative Filtering** — “Users who watched this also watched…”
- **Hybrid Ranker** — combines trending + personal + collaborative signals
- Related videos + autoplay fallback chain on the watch page

### 📊 Engagement & Analytics
- View recording with watch history
- Like / dislike tracking
- Channel subscriptions
- Video analytics endpoints
- Watch signal processing for better recommendations

### 🔐 Auth & Real-time
- JWT-based authentication (bcrypt password hashing)
- Socket.IO for live upload progress and processing status
- Protected routes with auth middleware

---

## 🏗 Architecture

```
Client
  │
  ├── REST API (Express)  ◄──► Socket.IO (real-time upload/processing updates)
  │         │
  │         ├── PostgreSQL via Prisma ORM
  │         ├── Redis (ioredis) — caching + BullMQ queue
  │         └── MinIO (S3-compatible) — file storage
  │
  └── Direct S3 upload (presigned URL, bypasses API server)
                │
                ▼
         BullMQ Worker  (video-processing queue, concurrency: 2)
                │
                └── FFmpeg — 360p + 720p HLS transcoding
```

**Design principles:**
- Heavy compute (transcoding) is completely offloaded from the request path
- Raw video never goes through the API server
- Status machine + real-time events give the frontend a reliable UX
- Domain logic is organized into modular feature folders (`modules/*`)

---

## 🛠 Tech Stack

| Layer              | Technology                          | Purpose                              |
|--------------------|-------------------------------------|--------------------------------------|
| Runtime            | Node.js 18+                         | Server runtime                       |
| Framework          | Express.js                          | HTTP API                             |
| ORM                | Prisma + PostgreSQL                 | Type-safe data access                |
| Queue              | BullMQ + Redis                      | Background job processing            |
| Object Storage     | MinIO (AWS S3 SDK v3)               | Raw + processed video storage        |
| Video Processing   | FFmpeg (fluent-ffmpeg)              | HLS transcoding + thumbnails         |
| Real-time          | Socket.IO                           | Live progress updates                |
| Auth               | JWT + bcrypt                        | Stateless authentication             |
| Search             | PostgreSQL tsvector + pg_trgm       | Full-text + fuzzy search             |
| Caching            | Redis                               | Search cache, job queue, rate limits |

---

## 📂 Project Structure

```
StreamForge/
├── BACKEND/
│   ├── server.js                 # Express entry point
│   ├── websocket.js              # Socket.IO server + emitters
│   ├── worker.js                 # BullMQ video processing worker
│   ├── logger.js
│   ├── metrics.js
│   ├── queryParser.js
│   ├── swagger.yml
│   │
│   ├── config/
│   │   └── s3.js                 # MinIO / S3 client
│   ├── lib/
│   │   ├── prisma.js
│   │   └── redis.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── upload.js
│   ├── queues/
│   │   └── videoQueue.js
│   ├── jobs/
│   │   └── cleanup.job.js
│   ├── redis/
│   │   └── publisher.js
│   │
│   ├── modules/                  # Domain-driven feature modules
│   │   ├── auth/
│   │   │   ├── controller/
│   │   │   └── routes/
│   │   ├── video/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   ├── feed/
│   │   │   ├── controller/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── search/
│   │   │   ├── controller/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── recommendation/
│   │   │   ├── controller/
│   │   │   ├── routes/
│   │   │   └── services/
│   │   ├── subscription/
│   │   │   ├── controller/
│   │   │   └── routes/
│   │   ├── likes/
│   │   │   ├── controller/
│   │   │   └── routes/
│   │   ├── comment/
│   │   │   ├── controller/
│   │   │   └── routes/
│   │   ├── thumbnail/
│   │   │   ├── controllers/
│   │   │   └── routes/
│   │   └── analytics/
│   │       ├── controller/
│   │       └── routes/
│   │
│   ├── services/                 # Shared / cross-cutting services
│   │   ├── collaborative.service.js
│   │   ├── trending.service.js
│   │   ├── videoRecommendation.service.js
│   │   ├── watchSignal.service.js
│   │   └── search/
│   │       └── blend.service.complete.js
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── client.js
│   │   └── migrations/
│   │
│   ├── test/                     # Test scripts & sample data
│   ├── docker-compose.yml
│   ├── API.md
│   ├── EnvSetup.md
│   └── package.json
│
├── FRONTEND/                     # React + Vite client
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── page/
│   │   ├── AUTH/
│   │   └── ...
│   └── package.json
│
└── readme.md
```

---

## 🔄 Video Processing Pipeline

### Upload Flow

```
1. POST /upload/init
   → Creates Video record (status: UPLOADING)
   → Returns { videoId, uploadUrl (presigned PUT), s3Key }

2. Client PUTs file directly to MinIO via presigned URL
   Client reports progress → PUT /upload/progress/:videoId
   (Socket.IO emits real-time progress to the user)

3. POST /upload/complete { videoId }
   → S3 HeadObject verifies file exists
   → Status → PROCESSING
   → BullMQ job enqueued

4. Worker:
   a. Download raw file from S3_RAW_BUCKET
   b. Generate thumbnail (ffmpeg screenshot at 10%)
   c. ffprobe → duration
   d. Transcode to 360p + 720p HLS
   e. Upload .ts + .m3u8 files to S3_PROCESSED_BUCKET
   f. Status → READY, save masterPlaylist URL
   g. Cleanup local temp files

5. On failure → PROCESSING_FAILED + retry support (max 3)
```

### Status Machine
```
UPLOADING ──► PROCESSING ──► READY
                         └──► PROCESSING_FAILED (retryable)
UPLOADING ──► FAILED
```

### Quality Ladder

| Stream   | Resolution | Max Bitrate | Segment | Type |
|----------|------------|-------------|---------|------|
| stream_0 | 360p       | 800 Kbps    | 6s      | VOD  |
| stream_1 | 720p       | 2800 Kbps   | 6s      | VOD  |

---

## 🔍 Search System (11-Phase Pipeline)

1. Receive query + pagination cursor  
2. Normalize & tokenize  
3. Candidate generation (FTS + prefix + fuzzy + token expansion)  
4. Fetch full records  
5–6. Rank videos & channels  
7. Apply personalization multipliers  
8–9. Transform + safety trim  
10. Cursor decode  
11. Blend (3 videos : 1 channel) + paginate  

**Ranking formula (videos):**
```
score = textScore×0.40 + engagement×0.25 + freshness×0.20 + intentBoost×0.15
```

---

## 🎯 Recommendation Engine

| Phase | Strategy | Signals |
|-------|----------|---------|
| Home Feed | Chronological + Personalized | `createdAt`, WatchHistory filter |
| Trending | Time-decay engagement | recentViews×3 + completions×5 − age×0.5 |
| Collaborative | Co-watch frequency | “Users who watched X also watched Y” |
| Hybrid | Weighted combination | Trending + Personal + Collaborative |
| Watch Page | Related + Autoplay chain | Same creator → co-watch → trending fallback |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker (for local Postgres, Redis, MinIO)
- FFmpeg installed on the machine that runs the worker

### 1. Clone
```bash
git clone https://github.com/anishkumar0504/StreamForge.git
cd StreamForge/BACKEND
```

### 2. Environment
```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, MinIO credentials, JWT_SECRET, etc.
```

See `EnvSetup.md` for detailed variable descriptions.

### 3. Start infrastructure
```bash
docker compose up -d
```

### 4. Database
```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Run services
```bash
# Terminal 1 — API + Socket.IO
node server.js

# Terminal 2 — Video processing worker
node worker.js
```

### 6. Frontend
```bash
cd ../FRONTEND
npm install
npm run dev
```

---

## 📡 Key API Surface (High Level)

| Area            | Endpoints (examples)                          |
|-----------------|-----------------------------------------------|
| Auth            | `POST /auth/register`, `POST /auth/login`     |
| Upload          | `POST /upload/init`, `POST /upload/complete`  |
| Videos          | `GET /videos/:id`, `DELETE /videos/:id`, retry |
| Feed            | `GET /api/feed/home`                          |
| Search          | `GET /api/search?q=...`                       |
| Recommendations | `GET /api/videos/:id/recommendations`         |
| Subscriptions   | Subscribe / unsubscribe / list                |
| Analytics       | Video-level metrics                           |

Full API documentation lives in `BACKEND/API.md`.

---

## 🧪 Production Readiness Notes

- Presigned uploads keep the API server free of large file I/O
- Worker concurrency is limited (default 2) to protect CPU/memory
- Redis used for both queue and short-lived caches
- Status machine + retry logic handles transient FFmpeg/S3 failures
- Cursor-based pagination avoids offset drift
- Logging + basic metrics endpoints included
- Modular `modules/*` structure makes features easy to extend

---

## 👨‍💻 Author

**Anish Kumar**  
GitHub: [@anishkumar0504](https://github.com/anishkumar0504)

This project demonstrates production-minded backend design for a media platform: direct-to-object-storage uploads, asynchronous media processing, hybrid recommendation systems, ranked search, and real-time user feedback.

---

## ⭐ Support

If this project helped you or inspired your own work, a star is greatly appreciated!

*Built with Node.js, FFmpeg, Redis, and a focus on scalable media pipelines.*
