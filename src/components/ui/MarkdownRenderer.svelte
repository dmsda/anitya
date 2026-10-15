<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { sendToActiveTab } from '../../services/messaging/messages';
  import { parseTimestamp } from '../../modules/video/timestampHelper';

  let { content = '' }: { content: string } = $props();

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Hook to guarantee external links open safely in new tabs without opener leakage
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });

  // Convert markdown to sanitized HTML with timestamp link enhancement
  let renderedHtml = $derived.by(() => {
    if (!content) return '<p class="empty-text">No content</p>';

    try {
      const rawHtml = marked.parse(content, { breaks: true, gfm: true }) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'data-timestamp', 'rel'],
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      });

      // Enhance timestamps like [01:23] into clickable spans
      return cleanHtml.replace(
        /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g,
        '<span class="timestamp-link" data-timestamp="$1">⏱ $1</span>'
      );
    } catch {
      return `<pre class="safe-fallback">${escapeHtml(content)}</pre>`;
    }
  });

  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target && target.classList.contains('timestamp-link')) {
      const tsStr = target.getAttribute('data-timestamp');
      if (tsStr) {
        const seconds = parseTimestamp(tsStr);
        sendToActiveTab({ type: 'SEEK_VIDEO', payload: { seconds } });
      }
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="markdown-preview" onclick={handleClick}>
  {@html renderedHtml}
</div>

<style>
  .markdown-preview {
    font-size: 13.5px;
    line-height: 1.65;
    color: var(--text-primary);
    word-break: break-word;
  }

  :global(.markdown-preview h1) {
    font-size: 1.35em;
    font-weight: 700;
    margin: 14px 0 8px 0;
    color: var(--text-primary);
  }

  :global(.markdown-preview h2) {
    font-size: 1.2em;
    font-weight: 600;
    margin: 12px 0 6px 0;
    color: var(--text-primary);
  }

  :global(.markdown-preview h3) {
    font-size: 1.05em;
    font-weight: 600;
    margin: 10px 0 4px 0;
    color: var(--text-primary);
  }

  :global(.markdown-preview p) {
    margin: 6px 0;
  }

  :global(.markdown-preview ul, .markdown-preview ol) {
    padding-left: 20px;
    margin: 6px 0;
  }

  :global(.markdown-preview li) {
    margin: 3px 0;
  }

  :global(.markdown-preview blockquote) {
    border-left: 3px solid var(--accent-primary);
    padding: 4px 12px;
    margin: 8px 0;
    background: rgba(99, 102, 241, 0.08);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    font-style: italic;
    color: var(--text-secondary);
  }

  :global(.markdown-preview code) {
    background: var(--bg-tertiary);
    padding: 2px 5px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  :global(.markdown-preview pre) {
    background: var(--bg-tertiary);
    padding: 10px;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    margin: 8px 0;
  }

  :global(.markdown-preview pre code) {
    background: transparent;
    padding: 0;
  }

  :global(.markdown-preview hr) {
    border: none;
    border-top: 1px solid var(--border-subtle);
    margin: 14px 0;
  }

  :global(.markdown-preview a) {
    color: var(--accent-primary);
    text-decoration: none;
  }

  :global(.markdown-preview a:hover) {
    text-decoration: underline;
  }

  :global(.markdown-preview .timestamp-link) {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.88em;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
  }

  :global(.markdown-preview .timestamp-link:hover) {
    background: var(--accent-primary);
    color: #ffffff;
    transform: translateY(-1px);
  }

  :global(.markdown-preview .empty-text) {
    color: var(--text-muted);
    font-style: italic;
  }
</style>
