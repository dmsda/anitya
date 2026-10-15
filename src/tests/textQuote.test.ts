import { describe, it, expect, beforeEach } from 'vitest';
import { reanchorQuote, describeRange } from '../modules/highlighter/textQuote';

describe('W3C DOM Text Anchoring Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-content">
        <p id="p1">Acitya Notes is a privacy-first browser extension for smart researchers.</p>
        <p id="p2">Knowledge management allows fast indexing and contextual bookmarks.</p>
        <p id="p3">Acitya Notes is another paragraph with identical beginning words.</p>
      </div>
    `;
  });

  it('accurately generates exact, prefix, and suffix from a DOM range', () => {
    const p1 = document.getElementById('p1')!;
    const textNode = p1.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0); // "Acitya Notes"
    range.setEnd(textNode, 12);

    const selector = describeRange(range, p1);
    expect(selector.exact).toBe('Acitya Notes');
    expect(selector.suffix).toContain('is a privacy');
  });

  it('re-anchors exact quote with high confidence using prefix and suffix context', () => {
    const root = document.getElementById('test-content') as HTMLElement;
    const selector = {
      exact: 'Acitya Notes',
      prefix: '',
      suffix: 'is a privacy-first',
    };

    const { range, score } = reanchorQuote(selector, root);
    expect(range).not.toBeNull();
    expect(score).toBeGreaterThan(1.0);
    expect(range?.toString()).toBe('Acitya Notes');
  });

  it('distinguishes between duplicate exact phrases using surrounding context', () => {
    const root = document.getElementById('test-content') as HTMLElement;
    
    // Target p3 instead of p1
    const selectorP3 = {
      exact: 'Acitya Notes',
      prefix: '',
      suffix: 'is another paragraph',
    };

    const { range } = reanchorQuote(selectorP3, root);
    expect(range).not.toBeNull();
    expect(range?.startContainer.parentElement?.id).toBe('p3');
  });

  it('rejects ambiguous or missing quotes without falsifying re-anchoring', () => {
    const root = document.getElementById('test-content') as HTMLElement;
    const nonExistent = {
      exact: 'Completely missing sentence',
      prefix: 'abc',
      suffix: 'xyz',
    };

    const { range, score } = reanchorQuote(nonExistent, root);
    expect(range).toBeNull();
    expect(score).toBe(0);
  });
});
