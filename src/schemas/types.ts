/**
 * Acitya Notes - Data Models & Schemas
 * Adhering to W3C Web Annotation Data Model & Local-First Architecture
 */

export type NoteType = 'quick' | 'web' | 'pdf' | 'video';

export interface Note {
  id: string;
  title: string;
  contentMarkdown: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceDomain?: string;
  type: NoteType;
  collectionId?: string;
  tags: string[];
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
}

export type AnchorStatus = 'anchored' | 'unresolved';

export interface TextQuoteSelector {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface TextPositionSelector {
  start: number;
  end: number;
}

export interface Highlight {
  id: string;
  noteId?: string;
  sourceUrl: string;
  exactText: string;
  prefix: string;
  suffix: string;
  startOffset?: number;
  endOffset?: number;
  color: string; // e.g. '#fef08a' (yellow), '#bbf7d0' (green), '#bae6fd' (blue), '#fbcfe8' (pink), '#e9d5ff' (purple)
  annotation?: string;
  selectorVersion: number;
  anchorStatus: AnchorStatus;
  createdAt: number;
  updatedAt: number;
}

export interface VideoNote {
  id: string;
  noteId: string;
  videoId: string;
  videoUrl: string;
  timestampSeconds: number;
  timestampOffset: number; // offset applied in seconds
  text: string;
  screenshotId?: string;
  createdAt: number;
}

export interface TranscriptSegment {
  id: string;
  videoId: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface Screenshot {
  id: string;
  noteId?: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  timestampSeconds: number;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = 'dark' | 'light' | 'system';
export type AIProviderType = 'builtin' | 'cloud' | 'fallback';

export interface AISettings {
  provider: AIProviderType;
  cloudApiKey?: string;
  cloudModel?: string; // e.g. 'gemini-2.5-flash' or 'gpt-4o-mini'
  cloudBaseUrl?: string;
  optInCloudProcessing: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface UserSettings {
  theme: ThemeMode;
  defaultHighlightColor: string;
  defaultTimestampOffset: number; // default reaction offset in seconds (e.g. 5)
  autoOpenSidePanel: boolean;
  ai: AISettings;
  exportPreferences: {
    includeFrontmatter: boolean;
    defaultFormat: 'markdown' | 'json' | 'html';
  };
}

export interface PageMetadata {
  url: string;
  title: string;
  domain: string;
  description?: string;
  selectedText?: string;
  articleContent?: string;
  isVideo: boolean;
  videoId?: string;
  isPdf: boolean;
}
