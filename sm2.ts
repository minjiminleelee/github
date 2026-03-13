import dayjs from 'dayjs';

/**
 * SM-2 card shape:
 * {
 *   id, question, answer,
 *   interval: number (days),
 *   repetitions: number,
 *   ease: number,
 *   nextReview: ISODate string
 * }
 */

export type Card = {
  id: string;
  question: string;
  answer: string;
  interval: number;
  repetitions: number;
  ease: number;
  nextReview: string;
  metadata?: any;
};

export function createCard(id: string, question: string, answer: string): Card {
  return {
    id,
    question,
    answer,
    interval: 0,
    repetitions: 0,
    ease: 2.5,
    nextReview: new Date().toISOString()
  };
}

/**
 * Update card scheduling using SM-2 algorithm.
 * quality: 0..5 (5 = perfect response)
 */
export function sm2Review(card: Card, quality: number): Card {
  // Ensure quality bounds
  quality = Math.max(0, Math.min(5, quality));

  if (quality < 3) {
    card.repetitions = 0;
    card.interval = 1;
  } else {
    card.repetitions = (card.repetitions || 0) + 1;
    if (card.repetitions === 1) {
      card.interval = 1;
    } else if (card.repetitions === 2) {
      card.interval = 6;
    } else {
      card.interval = Math.round((card.interval || 6) * card.ease);
    }
  }

  // update ease
  card.ease = card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (card.ease < 1.3) card.ease = 1.3;

  // set next review date
  card.nextReview = dayjs().add(card.interval, 'day').toISOString();

  return card;
}

export function isDue(card: Card, asOf: Date = new Date()) {
  return dayjs(card.nextReview).isSameOrBefore(asOf);
}