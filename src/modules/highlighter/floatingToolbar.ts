import { describeRange } from './textQuote';
import { applyHighlightToRange } from './domHighlighter';
import { HighlightRepository } from '../../repositories/highlightRepository';
import { NoteRepository } from '../../repositories/noteRepository';
import type { Highlight } from '../../schemas/types';

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#fef08a', border: '#facc15' },
  { name: 'Green', hex: '#bbf7d0', border: '#4ade80' },
  { name: 'Blue', hex: '#bae6fd', border: '#38bdf8' },
  { name: 'Pink', hex: '#fbcfe8', border: '#f472b6' },
  { name: 'Purple', hex: '#e9d5ff', border: '#c084fc' },
];

export class FloatingToolbar {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private currentRange: Range | null = null;
  private currentText = '';

  constructor() {
    this.init();
  }

  private init(): void {
    // Prevent duplicate hosts
    const existing = document.getElementById('acitya-toolbar-host');
    if (existing) existing.remove();

    this.host = document.createElement('div');
    this.host.id = 'acitya-toolbar-host';
    this.host.style.position = 'absolute';
    this.host.style.top = '0';
    this.host.style.left = '0';
    this.host.style.zIndex = '2147483647'; // Max z-index
    this.host.style.pointerEvents = 'none';

    this.shadow = this.host.attachShadow({ mode: 'closed' });
    document.documentElement.appendChild(this.host);

    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    // If click is outside toolbar, hide it
    if (this.host && !e.composedPath().includes(this.host)) {
      this.hide();
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    // Delay slightly to let browser update window.getSelection()
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        this.hide();
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) {
        this.hide();
        return;
      }

      try {
        const range = selection.getRangeAt(0);
        this.currentRange = range.cloneRange();
        this.currentText = text;
        this.show(range);
      } catch (err) {
        this.hide();
      }
    }, 20);
  }

  private show(range: Range): void {
    if (!this.shadow) return;

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.hide();
      return;
    }

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position above selection center
    let top = rect.top + scrollY - 48;
    let left = rect.left + scrollX + rect.width / 2 - 120;

    // Viewport bounds checking
    if (top < scrollY + 8) {
      top = rect.bottom + scrollY + 8; // flip below selection
    }
    if (left < 8) left = 8;
    if (left + 240 > window.innerWidth) left = window.innerWidth - 248;

    this.shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }
        .acitya-bar {
          position: absolute;
          top: ${top}px;
          left: ${left}px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #f8fafc;
          padding: 6px 10px;
          border-radius: 9999px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.15);
          pointer-events: auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          user-select: none;
          animation: acityaFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes acityaFadeIn {
          from { opacity: 0; transform: translateY(4px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .color-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.15s, border-color 0.15s;
        }
        .color-dot:hover {
          transform: scale(1.22);
        }
        .divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 2px;
        }
        .action-btn {
          background: transparent;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
        }
        .action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .brand-badge {
          font-size: 11px;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-right: 2px;
          letter-spacing: -0.02em;
        }
      </style>
      <div class="acitya-bar" role="toolbar" aria-label="Acitya Text Tools">
        <span class="brand-badge" aria-hidden="true">Acitya</span>
        ${HIGHLIGHT_COLORS.map(
          (c) => `<div class="color-dot" role="button" tabindex="0" data-color="${c.hex}" title="${c.name}" aria-label="Highlight in ${c.name}" style="background-color: ${c.hex}; border-color: ${c.border};"></div>`
        ).join('')}
        <div class="divider" aria-hidden="true"></div>
        <button class="action-btn" id="btn-clip" title="Save clipping to Acitya Notes" aria-label="Clip selected text to Acitya Notes">
          <span>Clip</span>
        </button>
        <button class="action-btn" id="btn-copy" title="Copy exact quote" aria-label="Copy exact quote to clipboard">
          <span>Copy</span>
        </button>
      </div>
    `;


    // Bind color clicks
    this.shadow.querySelectorAll<HTMLElement>('.color-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = dot.dataset.color || '#fef08a';
        this.highlightSelection(color);
      });
    });

    // Bind Clip button
    const clipBtn = this.shadow.getElementById('btn-clip');
    if (clipBtn) {
      clipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clipSelection();
      });
    }

    // Bind Copy button
    const copyBtn = this.shadow.getElementById('btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copySelection();
      });
    }
  }

  private async highlightSelection(color: string): Promise<void> {
    if (!this.currentRange || !this.currentText) {
      this.hide();
      return;
    }

    try {
      const selector = describeRange(this.currentRange);
      const highlight = await HighlightRepository.create({
        sourceUrl: window.location.href,
        exactText: selector.exact,
        prefix: selector.prefix,
        suffix: selector.suffix,
        color,
        anchorStatus: 'anchored',
        selectorVersion: 1,
      });

      applyHighlightToRange(this.currentRange, highlight);

      // Deselect text selection
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error('[Acitya] Error creating highlight:', err);
    } finally {
      this.hide();
    }
  }

  private async clipSelection(): Promise<void> {
    if (!this.currentText) {
      this.hide();
      return;
    }

    try {
      const pageTitle = document.title || 'Web Note';
      const sourceUrl = window.location.href;
      const domain = window.location.hostname;

      await NoteRepository.create({
        title: `Quote: ${this.currentText.slice(0, 50)}...`,
        contentMarkdown: `> ${this.currentText}\n\n*Source: [${pageTitle}](${sourceUrl})*`,
        sourceUrl,
        sourceTitle: pageTitle,
        sourceDomain: domain,
        type: 'web',
        tags: ['web-clip', domain],
      });

      // Provide visual feedback
      if (this.shadow) {
        const bar = this.shadow.querySelector('.acitya-bar');
        if (bar) {
          bar.innerHTML = '<span style="color:#4ade80;font-weight:600;padding:2px 8px;">✓ Saved to Notes</span>';
          setTimeout(() => this.hide(), 1000);
          return;
        }
      }
    } catch (err) {
      console.error('[Acitya] Error saving clip:', err);
    }
    this.hide();
  }

  private async copySelection(): Promise<void> {
    if (!this.currentText) {
      this.hide();
      return;
    }
    try {
      await navigator.clipboard.writeText(`"${this.currentText}" — ${window.location.href}`);
      if (this.shadow) {
        const bar = this.shadow.querySelector('.acitya-bar');
        if (bar) {
          bar.innerHTML = '<span style="color:#38bdf8;font-weight:600;padding:2px 8px;">✓ Copied</span>';
          setTimeout(() => this.hide(), 800);
          return;
        }
      }
    } catch {
      this.hide();
    }
  }

  public hide(): void {
    if (this.shadow) {
      this.shadow.innerHTML = '';
    }
    this.currentRange = null;
    this.currentText = '';
  }

  public destroy(): void {
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadow = null;
    }
  }
}
