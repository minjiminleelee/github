import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import { readStore, writeStore } from './dataStore.js';
import { buildCourseFromTexts } from './processor.js';
import { createCard, sm2Review, isDue } from './sm2.js';
import { v4 as uuidv4 } from 'uuid';

const upload = multer({ dest: 'uploads/' });
const app = express();
app.use(bodyParser.json());

// POST /api/upload
// Accepts: multipart files or { links: [...], topic: "..." }
// For prototype, we accept text uploads or topic; real implementation should parse files/transcribe audio/video.
app.post('/api/upload', upload.any(), async (req, res) => {
  /**
   * Prototype behavior:
   * - If req.body.topic provided, call buildCourseFromTexts with that topic as a tiny seed.
   * - If text files present, read and pass as strings.
   *
   * Production:
   * - For PDFs/slides: run pdf-parse / pptx parser to extract text.
   * - For audio/video: run ffmpeg to extract audio -> Whisper to transcribe.
   * - Persist files to S3 and create background job to process them.
   */
  const store = readStore();
  let seedTexts: string[] = [];

  if (req.body.topic) {
    seedTexts.push(`Topic: ${req.body.topic}\nGenerate course content for this topic.`);
  }

  // If text fields exist
  if (req.body.text) {
    seedTexts.push(req.body.text);
  }

  // For each uploaded file we could parse it here; prototype simply notes their filenames
  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files as any) {
      seedTexts.push(`Uploaded file: ${f.originalname}. In production extract text/transcription.`);
    }
  }

  // Build a sample course (units and lessons)
  const title = req.body.title || req.body.topic || `Course ${Date.now()}`;
  const course = await buildCourseFromTexts(title, seedTexts, 4, 5);

  // Convert generated lesson flashcards into SM-2 cards in datastore
  const flashcardsToAdd = [];
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (lesson.flashcards) {
        for (const fc of lesson.flashcards) {
          const id = fc.id || uuidv4();
          const card = createCard(id, fc.q, fc.a);
          card.metadata = { courseId: course.id, unitId: unit.id, lessonId: lesson.id };
          flashcardsToAdd.push(card);
        }
      }
    }
  }

  store.courses.push(course);
  store.flashcards.push(...flashcardsToAdd);

  writeStore(store);
  return res.json({ ok: true, course, addedFlashcards: flashcardsToAdd.length });
});

// GET /api/courses
app.get('/api/courses', (req, res) => {
  const store = readStore();
  res.json({ courses: store.courses });
});

// GET /api/flashcards/due
app.get('/api/flashcards/due', (req, res) => {
  const store = readStore();
  const asOf = new Date();
  const due = store.flashcards.filter((c: any) => isDue(c, asOf));
  res.json({ due, count: due.length });
});

// POST /api/flashcards/:id/grade
app.post('/api/flashcards/:id/grade', (req, res) => {
  const { id } = req.params;
  const { quality } = req.body; // 0..5 scale
  const store = readStore();
  const idx = store.flashcards.findIndex((c: any) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'card not found' });
  const card = store.flashcards[idx];
  const updated = sm2Review(card, Number(quality));
  store.flashcards[idx] = updated;
  writeStore(store);
  res.json({ ok: true, card: updated });
});

// POST /api/essay/grade
app.post('/api/essay/grade', async (req, res) => {
  /**
   * Prototype: simulate grading using a naive rubric.
   * Replace with LLM call to produce 0-100 score and detailed feedback.
   */
  const { text, title } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  // naive metrics: length and basic grammar heuristics
  const wordCount = text.split(/\s+/).length;
  const readabilityScore = Math.max(0, Math.min(50, Math.round((wordCount / 300) * 50)));
  const grammarPenalty = /(\bis\b|\bare\b).{0,3}\1/.test(text) ? 5 : 0;

  let score = Math.max(0, Math.min(100, readabilityScore + 50 - grammarPenalty));
  const letter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  const feedback = {
    overall: `Score ${score} (${letter}) — based on length and simple heuristics.`,
    strengths: ['Clear attempt to structure ideas', 'Sufficient length'],
    weaknesses: ['Grammar / repetition may need work', 'Add concrete examples or citations'],
    suggestions: ['Use an LLM-based grader for deeper feedback', 'Cite sources and add transitions']
  };

  const store = readStore();
  const essay = { id: uuidv4(), title: title || 'Untitled Essay', text, score, letter, feedback, createdAt: new Date().toISOString() };
  store.essays.push(essay);
  writeStore(store);

  res.json({ essay });
});

// Project planner endpoints (minimal)
app.post('/api/projects', (req, res) => {
  const { title, deadline, tasks } = req.body;
  const store = readStore();
  const proj = { id: uuidv4(), title, deadline, tasks: tasks || [], createdAt: new Date().toISOString() };
  store.projects.push(proj);
  writeStore(store);
  res.json({ project: proj });
});

app.get('/api/stats', (req, res) => {
  const store = readStore();
  const courses = store.courses.length;
  const avgMastery = 0; // placeholder – compute from quizzes/tests / user's progress
  const flashcardsDue = store.flashcards.filter((c: any) => isDue(c, new Date())).length;
  const essays = store.essays.length;
  res.json({ courses, avgMastery, flashcardsDue, essays });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI Learning Prototype API listening on http://localhost:${PORT}`);
});