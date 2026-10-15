import type { PageMetadata } from '../../schemas/types';
import { isYouTubePage, extractYouTubeVideoId } from '../video/youtubeDetector';

export class PageExtractor {
  static extractMetadata(): PageMetadata {
    const url = window.location.href;
    const title = document.title || 'Untitled Document';
    const domain = window.location.hostname;

    // Check for PDF
    const isPdf =
      url.toLowerCase().endsWith('.pdf') ||
      document.contentType === 'application/pdf' ||
      document.querySelector('embed[type="application/pdf"]') !== null;

    // Check for YouTube
    const isVideo = isYouTubePage(url);
    const videoId = isVideo ? extractYouTubeVideoId(url) || undefined : undefined;

    // Description meta
    const descMeta =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      undefined;

    // Selection text
    const selection = window.getSelection();
    const selectedText = selection && !selection.isCollapsed ? selection.toString().trim() : undefined;

    // Main article content
    const articleContent = this.extractArticleMarkdown();

    return {
      url,
      title,
      domain,
      description: descMeta,
      selectedText,
      articleContent,
      isVideo,
      videoId,
      isPdf,
    };
  }

  /**
   * Extracts clean readability-focused Markdown from the main article element
   */
  static extractArticleMarkdown(): string {
    // Candidates for main content
    const candidates = [
      document.querySelector('article'),
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('.post-content'),
      document.querySelector('.article-content'),
      document.querySelector('.entry-content'),
      document.body,
    ];

    let mainEl: HTMLElement | null = null;
    for (const cand of candidates) {
      if (cand && cand.textContent && cand.textContent.trim().length > 150) {
        mainEl = cand as HTMLElement;
        break;
      }
    }

    if (!mainEl) {
      return '';
    }

    // Clone element to avoid modifying live page
    const clone = mainEl.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    const stripSelectors = [
      'script',
      'style',
      'noscript',
      'nav',
      'header',
      'footer',
      'aside',
      '.ad',
      '.ads',
      '.comments',
      '.share',
      '.sidebar',
      '#acitya-toolbar-host',
    ];
    stripSelectors.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    });

    // Extract blocks into markdown
    const blocks: string[] = [];
    const elements = clone.querySelectorAll('h1, h2, h3, h4, p, blockquote, pre, ul, ol');

    elements.forEach((el) => {
      const text = el.textContent?.trim();
      if (!text) return;

      const tag = el.tagName.toLowerCase();
      switch (tag) {
        case 'h1':
          blocks.push(`# ${text}`);
          break;
        case 'h2':
          blocks.push(`## ${text}`);
          break;
        case 'h3':
          blocks.push(`### ${text}`);
          break;
        case 'h4':
          blocks.push(`#### ${text}`);
          break;
        case 'blockquote':
          blocks.push(`> ${text}`);
          break;
        case 'pre':
          blocks.push(`\`\`\`\n${text}\n\`\`\``);
          break;
        case 'ul':
        case 'ol':
          const items = Array.from(el.querySelectorAll('li'))
            .map((li) => `- ${li.textContent?.trim()}`)
            .filter((t) => t.length > 2);
          if (items.length > 0) {
            blocks.push(items.join('\n'));
          }
          break;
        case 'p':
        default:
          blocks.push(text);
          break;
      }
    });

    return blocks.join('\n\n').slice(0, 10000); // capped to reasonable 10k chars
  }
}
