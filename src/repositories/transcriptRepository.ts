import { getDB } from './db';
import type { TranscriptSegment } from '../schemas/types';

export class TranscriptRepository {
  static async getByVideoId(videoId: string): Promise<TranscriptSegment[]> {
    const db = await getDB();
    const segments = await db.getAllFromIndex('transcriptSegments', 'by-videoId', videoId);
    return segments.sort((a, b) => a.startMs - b.startMs);
  }

  static async saveBatch(videoId: string, segments: Omit<TranscriptSegment, 'id'>[]): Promise<TranscriptSegment[]> {
    const db = await getDB();
    const tx = db.transaction('transcriptSegments', 'readwrite');
    
    // Delete existing segments for this video to avoid duplicates
    const existing = await tx.store.index('by-videoId').getAllKeys(videoId);
    for (const key of existing) {
      await tx.store.delete(key);
    }

    const saved: TranscriptSegment[] = [];
    let idx = 0;
    for (const seg of segments) {
      const item: TranscriptSegment = {
        id: `ts_${videoId}_${idx++}`,
        videoId,
        startMs: seg.startMs,
        endMs: seg.endMs,
        text: seg.text.trim(),
      };
      await tx.store.put(item);
      saved.push(item);
    }

    await tx.done;
    return saved;
  }

  static async deleteByVideoId(videoId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('transcriptSegments', 'readwrite');
    const existing = await tx.store.index('by-videoId').getAllKeys(videoId);
    for (const key of existing) {
      await tx.store.delete(key);
    }
    await tx.done;
  }
}
