import type { Highlight } from '../../schemas/types';
import { reanchorQuote } from './textQuote';

export const HIGHLIGHT_CLASS = 'acitya-highlight';

/**
 * Highlights a Range in the DOM using <mark> elements.
 * Handles ranges spanning multiple text nodes cleanly.
 */
export function applyHighlightToRange(range: Range, highlight: Highlight): HTMLElement[] {
  const marks: HTMLElement[] = [];

  // Extract text nodes within the range
  const documentFragment = range.extractContents();
  const mark = document.createElement('mark');
  mark.className = HIGHLIGHT_CLASS;
  mark.dataset.highlightId = highlight.id;
  mark.dataset.color = highlight.color;
  mark.style.backgroundColor = highlight.color;
  mark.style.color = '#1f2937';
  mark.style.borderRadius = '3px';
  mark.style.padding = '1px 3px';
  mark.style.cursor = 'pointer';
  mark.style.transition = 'background-color 0.2s, box-shadow 0.2s';
  mark.title = highlight.annotation ? `Acitya Note: ${highlight.annotation}` : 'Acitya Highlight';

  mark.appendChild(documentFragment);
  range.insertNode(mark);
  marks.push(mark);

  return marks;
}

/**
 * Removes a highlight from the DOM by replacing the <mark> with its child nodes.
 */
export function removeHighlightFromDom(highlightId: string): void {
  const marks = document.querySelectorAll(`mark.${HIGHLIGHT_CLASS}[data-highlight-id="${highlightId}"]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize(); // merge adjacent text nodes
  });
}

/**
 * Scrolls smoothly to a highlight and flashes a focus outline.
 */
export function scrollToHighlight(highlightId: string): boolean {
  const mark = document.querySelector<HTMLElement>(`mark.${HIGHLIGHT_CLASS}[data-highlight-id="${highlightId}"]`);
  if (!mark) return false;

  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const originalShadow = mark.style.boxShadow;
  mark.style.boxShadow = '0 0 0 3px #6366f1, 0 4px 12px rgba(99, 102, 241, 0.4)';
  setTimeout(() => {
    mark.style.boxShadow = originalShadow;
  }, 1800);

  return true;
}

/**
 * Restores a list of highlights on the current page.
 * Returns map of results with re-anchored and unresolved statuses.
 */
export function restorePageHighlights(
  highlights: Highlight[]
): { restored: Highlight[]; unresolved: Highlight[] } {
  const restored: Highlight[] = [];
  const unresolved: Highlight[] = [];

  for (const hl of highlights) {
    // Check if already in DOM
    const existing = document.querySelector(`mark.${HIGHLIGHT_CLASS}[data-highlight-id="${hl.id}"]`);
    if (existing) {
      restored.push(hl);
      continue;
    }

    const { range, score } = reanchorQuote({
      exact: hl.exactText,
      prefix: hl.prefix,
      suffix: hl.suffix,
    });

    if (range && score >= 1.0) {
      try {
        applyHighlightToRange(range, hl);
        restored.push(hl);
      } catch (err) {
        console.warn(`[Acitya] Failed to wrap range for highlight ${hl.id}:`, err);
        unresolved.push(hl);
      }
    } else {
      unresolved.push(hl);
    }
  }

  return { restored, unresolved };
}
