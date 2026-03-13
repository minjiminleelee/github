import fs from 'fs';
import { join } from 'path';

const FILENAME = join(process.cwd(), 'data', 'db.json');

function ensureStore() {
  const dir = join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  if (!fs.existsSync(FILENAME)) {
    fs.writeFileSync(FILENAME, JSON.stringify({
      courses: [],
      flashcards: [],
      essays: [],
      projects: [],
      chats: []
    }, null, 2));
  }
}

export function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(FILENAME, 'utf-8'));
}

export function writeStore(obj: any) {
  fs.writeFileSync(FILENAME, JSON.stringify(obj, null, 2));
}