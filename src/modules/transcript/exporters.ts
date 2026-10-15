import type { TranscriptSegment } from '../../schemas/types';
import { formatTimestamp } from '../video/timestampHelper';

export class TranscriptExporters {
  /**
   * Formats milliseconds into WebVTT timestamp: 00:01:23.456
   */
  private static formatVttTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mill = ms % 1000;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}.${mill.toString().padStart(3, '0')}`;
  }

  /**
   * Formats milliseconds into SRT timestamp: 00:01:23,456
   */
  private static formatSrtTime(ms: number): string {
    return this.formatVttTime(ms).replace('.', ',');
  }

  static toVtt(segments: TranscriptSegment[]): string {
    let out = 'WEBVTT\n\n';
    segments.forEach((seg, idx) => {
      out += `${idx + 1}\n`;
      out += `${this.formatVttTime(seg.startMs)} --> ${this.formatVttTime(seg.endMs)}\n`;
      out += `${seg.text}\n\n`;
    });
    return out;
  }

  static toSrt(segments: TranscriptSegment[]): string {
    let out = '';
    segments.forEach((seg, idx) => {
      out += `${idx + 1}\n`;
      out += `${this.formatSrtTime(seg.startMs)} --> ${this.formatSrtTime(seg.endMs)}\n`;
      out += `${seg.text}\n\n`;
    });
    return out;
  }

  static toMarkdown(segments: TranscriptSegment[], title?: string, videoUrl?: string): string {
    let out = `# Transcript: ${title || 'Video'}\n\n`;
    if (videoUrl) {
      out += `Source: [YouTube Video](${videoUrl})\n\n`;
    }
    out += `| Timestamp | Text |\n`;
    out += `| :--- | :--- |\n`;
    segments.forEach((seg) => {
      const timeStr = formatTimestamp(seg.startMs / 1000);
      out += `| \`${timeStr}\` | ${seg.text.replace(/\|/g, '\\|')} |\n`;
    });
    return out;
  }

  static toPlainText(segments: TranscriptSegment[]): string {
    return segments.map((s) => `[${formatTimestamp(s.startMs / 1000)}] ${s.text}`).join('\n');
  }

  /**
   * Triggers a browser file download for the exported transcript
   */
  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
