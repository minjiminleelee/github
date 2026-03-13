# AI Learning Platform Prototype

Overview
- Prototype backend (Node + Express + TypeScript) that demonstrates:
  - Multimedia processing orchestration (PDF, slides, audio, video, links, or a topic) -> course pathway creation.
  - SM-2 spaced repetition flashcards with scheduling.
  - Essay grading endpoint (LLM abstracted).
  - Project planner endpoints.
- This is a minimal prototype; heavy tasks (transcription, embeddings, LLM text generation) are abstracted and marked where to integrate real services.

Architecture (high level)
- API server (Express) with modules:
  - processor: orchestration for conversion -> lessons / flashcards / quizzes.
  - sm2: flashcard scheduling and review logic.
  - datastore: JSON-backed store (replaceable with PostgreSQL + Prisma).
  - tutor/essay: LLM integration points for AI Tutor & Essay Grader.
- Integrations:
  - Transcription: Whisper or 3rd party
  - LLM: OpenAI / Anthropic / local LLMs
  - Vector DB: Pinecone / Milvus / Weaviate
  - Storage: S3 or local file system
  - Background workers: BullMQ / Celery

Quick start (local prototype)
1. Requirements:
   - Node 18+, pnpm or npm
2. Install:
   - npm install
3. Run:
   - npm run dev
   - Server runs at http://localhost:4000
4. Test endpoints:
   - POST /api/upload (multipart form upload or JSON link/topic) to create a course
   - GET /api/courses
   - GET /api/flashcards/due
   - POST /api/flashcards/:id/grade { quality: 0-5 }
   - POST /api/essay/grade { text: "..." }

Notes and Next Steps
- Replace datastore with PostgreSQL + Prisma (I included a `prisma/schema.prisma` to use).
- Implement background workers for heavy processing (ffmpeg/transcription/embedding/generation).
- Add frontend (Next.js) to present lessons, progress, interactive flashcards, and the AI tutor chat.