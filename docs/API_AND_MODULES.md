# Anitya (Acitya Notes) — API & Module Technical Reference 🛠️

> **Complete Developer Reference for Core Modules, Repositories, Services, and Interfaces**  
> *Manifest V3 Chrome Extension · Svelte 5 · IndexedDB · TypeScript*

---

## 1. Schema Definitions (`src/schemas/types.ts`)

### `Note`
Represents an individual user note or clipped web article.
```ts
export type NoteType = 'quick' | 'web' | 'pdf' | 'video';

export interface Note {
  id: string;               // UUIDv4 primary key
  title: string;            // Document title
  contentMarkdown: string;  // Raw Markdown body
  sourceUrl?: string;       // Originating web or video URL
  sourceTitle?: string;     // Web page title at capture
  sourceDomain?: string;    // Parsed hostname (e.g. 'github.com')
  type: NoteType;           // Categorical classification
  collectionId?: string;    // Optional foreign key to Collection
  tags: string[];           // Array of user tags (without '#' prefix)
  createdAt: number;        // Epoch timestamp (ms)
  updatedAt: number;        // Epoch timestamp (ms)
}
```

### `Highlight`
Represents a W3C Web Annotation anchored to a specific DOM position.
```ts
export type AnchorStatus = 'anchored' | 'unresolved';

export interface Highlight {
  id: string;               // UUIDv4 primary key
  noteId?: string;          // Optional foreign key to parent Note
  sourceUrl: string;        // Web page URL where highlight exists
  exactText: string;        // Exact text selected by user
  prefix: string;           // Preceding text context (~30-50 chars)
  suffix: string;           // Following text context (~30-50 chars)
  startOffset?: number;     // Approximate start character offset
  endOffset?: number;       // Approximate end character offset
  color: string;            // Hex color code (e.g. '#fef08a')
  annotation?: string;      // User comment or reflection
  selectorVersion: number;  // Schema version (current: 1)
  anchorStatus: AnchorStatus; // Current DOM binding state
  createdAt: number;        // Epoch timestamp (ms)
  updatedAt: number;        // Epoch timestamp (ms)
}
```

### `VideoNote` & `Screenshot`
Timestamped annotations synchronized with video players.
```ts
export interface VideoNote {
  id: string;
  noteId: string;           // Foreign key to parent Note
  videoId: string;          // YouTube video identifier
  videoUrl: string;         // Full watch URL
  timestampSeconds: number; // Compensated video playback second
  timestampOffset: number;  // Human reaction time offset applied (e.g. -5s)
  text: string;             // Annotation body
  screenshotId?: string;    // Optional foreign key to Screenshot
  createdAt: number;
}

export interface Screenshot {
  id: string;
  noteId?: string;
  blob: Blob;               // High-resolution JPEG/PNG binary data
  mimeType: string;         // 'image/jpeg' or 'image/png'
  width: number;
  height: number;
  timestampSeconds: number;
  createdAt: number;
}
```

---

## 2. Core Modules (`src/modules/`)

### 2.1 Web Clipper (`src/modules/clipper/pageExtractor.ts`)
Extracts clean content, metadata, and reader mode representations from the active DOM.
- `extractPageMetadata(): PageMetadata`
  - Scrapes `document.title`, OpenGraph tags (`og:title`, `og:description`), canonical URLs, and meta description.
  - Detects if the page hosts a YouTube video (`isVideo: true`, parses `v=` query parameter).
  - Detects if the current document is an embedded or native PDF viewer.
  - Extracts clean article text by traversing semantic elements (`<article>`, `<main>`, `.content`) and stripping navigation, ads, and footers.

### 2.2 W3C Web Highlighter (`src/modules/highlighter/`)
- `textQuote.ts`:
  - `extractTextQuoteSelector(range: Range): TextQuoteSelector`: Computes `exact`, `prefix`, and `suffix` from an active browser DOM `Range`.
  - `findRangeFromTextQuote(root: Node, selector: TextQuoteSelector): Range | null`: Resilient fuzzy search algorithm locating text ranges even across dynamic DOM reflows.
- `domHighlighter.ts`:
  - `renderHighlight(root: HTMLElement, highlight: Highlight): HTMLElement | null`: Wraps matched text in `<mark class="acitya-highlight">` with dataset attributes (`data-highlight-id`).
  - `removeHighlight(id: string): void`: Unwraps the `<mark>` element, restoring original text nodes without losing surrounding siblings.
- `floatingToolbar.ts`:
  - `createFloatingToolbar(options: ToolbarOptions): { show, hide, destroy }`: Mounts the interactive color picker toolbar into a closed Shadow DOM attached to `document.body`.

### 2.3 YouTube Video Tools (`src/modules/video/`)
- `youtubeDetector.ts`:
  - `detectYouTubeVideo(): { isYouTube: boolean, videoId?: string, player?: HTMLVideoElement }`: Queries DOM for `video.html5-main-video` or `ytd-watch-flexy`.
- `timestampHelper.ts`:
  - `formatTimestamp(seconds: number): string`: Formats seconds into `mm:ss` or `hh:mm:ss`.
  - `parseTimestamp(formatted: string): number`: Parses string formatted timestamps into absolute seconds.
  - `calculateCompensatedTimestamp(current: number, offset: number): number`: Enforces `Math.max(0, current - offset)`.
- `frameCapture.ts`:
  - `captureVideoFrame(video: HTMLVideoElement): Promise<Blob>`: Creates an offscreen HTML5 `<canvas>`, draws current frame at native resolution (`video.videoWidth` × `video.videoHeight`), and exports compressed binary Blob (`image/jpeg`, 0.85 quality). Handles tainted canvas exceptions gracefully.

### 2.4 Transcript Extraction & Exporters (`src/modules/transcript/`)
- `youtubeTranscript.ts`:
  - `fetchYouTubeTranscript(videoId: string): Promise<TranscriptSegment[]>`: Fetches official timedtext captions via `fmt=json3` or timedtext XML.
  - `extractFromDOMTextTracks(video: HTMLVideoElement): TranscriptSegment[]`: Secondary fallback pulling active WebVTT text tracks directly from the player.
- `exporters.ts`:
  - `exportTranscriptToVtt(segments: TranscriptSegment[]): string`: Generates WebVTT compliant subtitle file.
  - `exportTranscriptToSrt(segments: TranscriptSegment[]): string`: Generates SubRip standard SRT subtitle file.
  - `exportTranscriptToMarkdown(segments: TranscriptSegment[], title: string): string`: Produces timestamped Markdown document.

### 2.5 Local Search Engine (`src/modules/search/searchEngine.ts`)
- `searchLibrary(query: string, notes: Note[], highlights: Highlight[], options: SearchOptions): SearchResult[]`
  - Tokenizes queries into normalized search terms.
  - Scores matches using weighted relevance:
    - Title match: **Weight 5.0**
    - Tag match: **Weight 4.0**
    - Domain match: **Weight 3.0**
    - Content body match: **Weight 1.5**
  - Supports filtering by `type` (`quick`, `web`, `video`), collection, and date range.

---

## 3. Repositories Layer (`src/repositories/`)

All database interactions flow through isolated, typed repository classes using the singleton `getDB()` connection.

### 3.1 `NoteRepository` (`src/repositories/noteRepository.ts`)
- `getAll(): Promise<Note[]>`
- `getById(id: string): Promise<Note | undefined>`
- `create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note>`
- `update(id: string, updates: Partial<Note>): Promise<Note>`
- `delete(id: string): Promise<void>`: **Atomic multi-store cascade transaction**. Purges child `videoNotes`, deletes binary `screenshots`, and unlinks `highlights` (`noteId = undefined`).

### 3.2 `HighlightRepository` (`src/repositories/highlightRepository.ts`)
- `getByUrl(url: string): Promise<Highlight[]>`
- `getByNoteId(noteId: string): Promise<Highlight[]>`
- `create(highlight: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Highlight>`
- `update(id: string, updates: Partial<Highlight>): Promise<Highlight>`
- `delete(id: string): Promise<void>`

### 3.3 `ScreenshotRepository` (`src/repositories/screenshotRepository.ts`)
- `saveScreenshot(blob: Blob, noteId?: string, timestamp?: number): Promise<Screenshot>`
- `getById(id: string): Promise<Screenshot | undefined>`
- `delete(id: string): Promise<void>`

---

## 4. AI Service Subsystem (`src/services/ai/`)

Implemented using the Strategy & Adapter pattern:

```ts
export interface AIProvider {
  summarize(text: string, options?: SummarizeOptions): Promise<string>;
  extractKeyPoints(text: string): Promise<string[]>;
  generateActionItems(text: string): Promise<string[]>;
  generateFlashcards(text: string): Promise<Array<{ question: string; answer: string }>>;
  askGrounded(context: string, question: string): Promise<string>;
}
```

### Providers:
1. `BuiltinAIProvider`: Binds to `window.ai.languageModel` (Gemini Nano on Chrome Dev/Canary).
2. `CloudAIProvider`: REST client connecting to Gemini API (`generativelanguage.googleapis.com`) or OpenAI (`api.openai.com`). **Guarded by `optInCloudProcessing` check**.
3. `FallbackAIProvider`: Client-side, zero-dependency statistical heuristic parser:
   - Sentence tokenization and TF-IDF term scoring for extractive summarization.
   - Heuristic imperative sentence extraction for action items.
   - Subject-verb extraction for question-answer pairs and flashcards.

---

## 5. UI & Feedback Systems

### 5.1 Toast Notification Service (`src/lib/toast.ts`)
Non-blocking user feedback system:
```ts
import { toast } from '../../lib/toast';

toast.success('Note exported to Obsidian!');
toast.info('Seeking video to 04:15...');
toast.error('Frame capture failed: protected video stream.');
```

### 5.2 Confirmation Modal (`src/components/ui/ConfirmModal.svelte`)
Replaces blocking browser native `confirm()` and `prompt()`:
- Supports danger variants.
- Supports challenge phrases (e.g. typing `DELETE` to confirm database wipe).
- Focus trapping and accessible keyboard escape handling.
