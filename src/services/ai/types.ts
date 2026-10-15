import type { Note } from '../../schemas/types';

export interface AIReference {
  id: string;
  title: string;
  sourceUrl?: string;
  type: string;
}

export interface AnswerResponse {
  answer: string;
  references: AIReference[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export type AvailabilityStatus = 'readily' | 'after-download' | 'no';

export interface ProviderAvailability {
  available: boolean;
  status: AvailabilityStatus;
  message: string;
}

export interface AIServiceProvider {
  readonly id: string;
  readonly name: string;
  checkAvailability(): Promise<ProviderAvailability>;
  summarize(text: string): Promise<string>;
  extractKeyPoints(text: string): Promise<string[]>;
  extractActionItems(text: string): Promise<string[]>;
  answerQuestion(question: string, contextNotes: Note[]): Promise<AnswerResponse>;
  suggestTags(text: string): Promise<string[]>;
  generateFlashcards(text: string): Promise<Flashcard[]>;
}
