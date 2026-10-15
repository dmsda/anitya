import type { Note, Highlight, VideoNote } from '../../schemas/types';
import { formatTimestamp } from '../video/timestampHelper';

export class MarkdownExporter {
  static exportNote(note: Note, highlights: Highlight[] = [], videoNotes: VideoNote[] = []): string {
    const createdIso = new Date(note.createdAt).toISOString();
    const updatedIso = new Date(note.updatedAt).toISOString();

    // YAML Front Matter (Obsidian Compatible)
    let md = `---\n`;
    md += `title: ${JSON.stringify(note.title)}\n`;
    if (note.sourceUrl) {
      md += `source: "${note.sourceUrl}"\n`;
    }
    if (note.sourceDomain) {
      md += `domain: "${note.sourceDomain}"\n`;
    }
    md += `created: "${createdIso}"\n`;
    md += `updated: "${updatedIso}"\n`;
    md += `type: "${note.type}"\n`;
    if (note.tags && note.tags.length > 0) {
      md += `tags:\n`;
      note.tags.forEach((tag) => {
        md += `  - ${tag}\n`;
      });
    } else {
      md += `tags: []\n`;
    }
    md += `---\n\n`;

    // Note Title & Content
    md += `# ${note.title}\n\n`;
    if (note.contentMarkdown) {
      md += `${note.contentMarkdown.trim()}\n\n`;
    }

    // Associated Highlights
    if (highlights.length > 0) {
      md += `## Highlights (${highlights.length})\n\n`;
      highlights.forEach((hl, i) => {
        md += `> ${hl.exactText.trim()}\n\n`;
        if (hl.annotation) {
          md += `*Note: ${hl.annotation.trim()}*\n\n`;
        }
      });
    }

    // Associated Video Notes
    if (videoNotes.length > 0) {
      md += `## Video Notes (${videoNotes.length})\n\n`;
      videoNotes.forEach((vn) => {
        const timeStr = formatTimestamp(vn.timestampSeconds);
        const link = vn.videoUrl ? `[${timeStr}](${vn.videoUrl}&t=${Math.floor(vn.timestampSeconds)}s)` : `[${timeStr}]`;
        md += `- **${link}**: ${vn.text}\n`;
      });
      md += `\n`;
    }

    // Source link footer
    if (note.sourceUrl) {
      md += `---\n*Captured with [Acitya Notes](https://github.com/acitya-notes) from [${note.sourceTitle || note.sourceUrl}](${note.sourceUrl})*\n`;
    }

    return md;
  }
}
