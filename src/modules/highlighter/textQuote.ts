import type { TextQuoteSelector } from '../../schemas/types';

const CONTEXT_LENGTH = 32;

/**
 * Extracts a W3C TextQuoteSelector from a DOM Range.
 */
export function describeRange(range: Range, root: Node = document.body): TextQuoteSelector {
  const exact = range.toString();

  // Extract prefix: up to CONTEXT_LENGTH characters preceding the start of range
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(root);
  try {
    prefixRange.setEnd(range.startContainer, range.startOffset);
  } catch {
    // fallback if start container not in root
  }
  const fullPrefix = prefixRange.toString();
  const prefix = fullPrefix.slice(-CONTEXT_LENGTH);

  // Extract suffix: up to CONTEXT_LENGTH characters following the end of range
  const suffixRange = document.createRange();
  suffixRange.selectNodeContents(root);
  try {
    suffixRange.setStart(range.endContainer, range.endOffset);
  } catch {
    // fallback
  }
  const fullSuffix = suffixRange.toString();
  const suffix = fullSuffix.slice(0, CONTEXT_LENGTH);

  return {
    exact,
    prefix,
    suffix,
  };
}

/**
 * Re-anchors a TextQuoteSelector in the document text nodes.
 * Returns a DOM Range if found with high confidence, or null if unresolved.
 */
export function reanchorQuote(
  selector: TextQuoteSelector,
  root: HTMLElement = document.body
): { range: Range | null; score: number } {
  const { exact, prefix, suffix } = selector;
  if (!exact) return { range: null, score: 0 };

  // Collect all text nodes and their cumulative text offsets
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'textarea'].includes(tag)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  const nodeOffsets: number[] = [];
  let fullText = '';

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const content = textNode.textContent || '';
    nodeOffsets.push(fullText.length);
    fullText += content;
    textNodes.push(textNode);
    currentNode = walker.nextNode();
  }

  if (fullText.length === 0) {
    return { range: null, score: 0 };
  }

  // Find all occurrences of exact text
  const candidates: number[] = [];
  let pos = fullText.indexOf(exact);
  while (pos !== -1) {
    candidates.push(pos);
    pos = fullText.indexOf(exact, pos + 1);
  }

  if (candidates.length === 0) {
    // Try normalized whitespace match
    return { range: null, score: 0 };
  }

  // Score candidates against prefix and suffix
  let bestScore = -1;
  let bestIndex = -1;

  for (const idx of candidates) {
    let score = 1.0; // exact text matched

    // Prefix match scoring
    if (prefix) {
      const candPrefix = fullText.slice(Math.max(0, idx - prefix.length), idx);
      const prefixOverlap = calculateOverlap(candPrefix, prefix, 'end');
      score += prefixOverlap * 2.0;
    }

    // Suffix match scoring
    if (suffix) {
      const candSuffix = fullText.slice(idx + exact.length, idx + exact.length + suffix.length);
      const suffixOverlap = calculateOverlap(candSuffix, suffix, 'start');
      score += suffixOverlap * 2.0;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = idx;
    }
  }

  // Threshold: if score is too low and ambiguous, return unresolved
  // If there's only 1 candidate, any exact match is good (> 1.0)
  // If multiple candidates, we require context overlap (score >= 1.2)
  const confidenceThreshold = candidates.length > 1 ? 1.2 : 1.0;
  if (bestIndex === -1 || bestScore < confidenceThreshold) {
    return { range: null, score: bestScore };
  }

  // Convert character offset back to DOM Range
  const startChar = bestIndex;
  const endChar = bestIndex + exact.length;

  const startPos = findNodeAtOffset(textNodes, nodeOffsets, startChar);
  const endPos = findNodeAtOffset(textNodes, nodeOffsets, endChar);

  if (!startPos || !endPos) {
    return { range: null, score: 0 };
  }

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  return { range, score: bestScore };
}

function calculateOverlap(sample: string, target: string, direction: 'start' | 'end'): number {
  if (!sample || !target) return 0;

  // Normalize whitespace
  const normSample = sample.replace(/\s+/g, ' ');
  const normTarget = target.replace(/\s+/g, ' ');

  // Direct substring check
  if (direction === 'start') {
    const trimmedTarget = normTarget.trimStart();
    const trimmedSample = normSample.trimStart();
    if (trimmedSample.startsWith(trimmedTarget) || trimmedTarget.startsWith(trimmedSample)) {
      return 1.0;
    }
  } else {
    const trimmedTarget = normTarget.trimEnd();
    const trimmedSample = normSample.trimEnd();
    if (trimmedSample.endsWith(trimmedTarget) || trimmedTarget.endsWith(trimmedSample)) {
      return 1.0;
    }
  }

  // Character-by-character fallback
  const s = normSample.trim();
  const t = normTarget.trim();
  if (t.length === 0) return 0;

  let matchLen = 0;
  const minLen = Math.min(s.length, t.length);

  if (direction === 'start') {
    for (let i = 0; i < minLen; i++) {
      if (s[i] === t[i]) matchLen++;
      else break;
    }
  } else {
    for (let i = 1; i <= minLen; i++) {
      if (s[s.length - i] === t[t.length - i]) matchLen++;
      else break;
    }
  }

  return matchLen / t.length;
}

function findNodeAtOffset(
  textNodes: Text[],
  offsets: number[],
  charOffset: number
): { node: Text; offset: number } | null {
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const nodeStart = offsets[i];
    if (!node || nodeStart === undefined) continue;

    const nodeLength = node.textContent?.length || 0;
    const nodeEnd = nodeStart + nodeLength;

    if (charOffset >= nodeStart && (charOffset < nodeEnd || i === textNodes.length - 1)) {
      return {
        node,
        offset: Math.max(0, Math.min(charOffset - nodeStart, nodeLength)),
      };
    }
  }
  return null;
}
