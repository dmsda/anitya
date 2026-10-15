<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageMetadata, Note } from '../../schemas/types';
  import { AIService } from '../../services/ai/aiService';
  import type { AnswerResponse, Flashcard, ProviderAvailability } from '../../services/ai/types';
  import { NoteRepository } from '../../repositories/noteRepository';
  import { TranscriptRepository } from '../../repositories/transcriptRepository';
  import MarkdownRenderer from '../ui/MarkdownRenderer.svelte';
  import { toast } from '../../lib/toast';

  let {
    activePageMeta = null,
    onInsertToNote = () => {},
  }: {
    activePageMeta: PageMetadata | null;
    onInsertToNote?: (text: string) => void;
  } = $props();

  let contextSource = $state<'page' | 'selection' | 'transcript' | 'library'>('page');
  let userQuestion = $state('');
  let isProcessing = $state(false);
  let statusText = $state<string | null>(null);
  let abortTriggered = false;

  let activeResultText = $state<string | null>(null);
  let flashcardsResult = $state<Flashcard[]>([]);
  let answerReferences = $state<AnswerResponse['references']>([]);
  let providerInfo = $state<ProviderAvailability | null>(null);

  onMount(async () => {
    checkProvider();
    if (activePageMeta?.selectedText) {
      contextSource = 'selection';
    } else if (activePageMeta?.isVideo) {
      contextSource = 'transcript';
    }
  });

  async function checkProvider() {
    const { availability } = await AIService.getActiveProvider();
    providerInfo = availability;
  }

  async function resolveContextText(): Promise<string> {
    if (contextSource === 'selection' && activePageMeta?.selectedText) {
      return activePageMeta.selectedText;
    }
    if (contextSource === 'transcript' && activePageMeta?.videoId) {
      const segs = await TranscriptRepository.getByVideoId(activePageMeta.videoId);
      if (segs.length > 0) {
        return segs.map((s) => s.text).join(' ');
      }
    }
    if (contextSource === 'page' && activePageMeta?.articleContent) {
      return activePageMeta.articleContent;
    }
    // Fallback: all notes text
    const notes = await NoteRepository.getAll();
    return notes.map((n) => `${n.title}\n${n.contentMarkdown}`).join('\n\n');
  }

  function cancelOperation() {
    abortTriggered = true;
    isProcessing = false;
    statusText = null;
    toast.info('AI operation cancelled');
  }

  async function handleSummarize() {
    abortTriggered = false;
    isProcessing = true;
    statusText = 'Generating summary...';
    flashcardsResult = [];
    answerReferences = [];
    try {
      const text = await resolveContextText();
      if (abortTriggered) return;
      activeResultText = await AIService.summarize(text);
      if (!abortTriggered) toast.success('Summary generated');
    } catch (err) {
      if (!abortTriggered) {
        activeResultText = `Failed to summarize: ${err instanceof Error ? err.message : String(err)}`;
        toast.error('Failed to summarize content');
      }
    } finally {
      if (!abortTriggered) {
        isProcessing = false;
        statusText = null;
      }
    }
  }

  async function handleKeyPoints() {
    abortTriggered = false;
    isProcessing = true;
    statusText = 'Extracting key takeaways...';
    flashcardsResult = [];
    answerReferences = [];
    try {
      const text = await resolveContextText();
      if (abortTriggered) return;
      const points = await AIService.extractKeyPoints(text);
      activeResultText = points.map((p) => `- ${p}`).join('\n');
      if (!abortTriggered) toast.success('Key takeaways extracted');
    } catch {
      if (!abortTriggered) {
        activeResultText = 'Failed to extract key points.';
        toast.error('Failed to extract key points');
      }
    } finally {
      if (!abortTriggered) {
        isProcessing = false;
        statusText = null;
      }
    }
  }

  async function handleActionItems() {
    abortTriggered = false;
    isProcessing = true;
    statusText = 'Finding action items...';
    flashcardsResult = [];
    answerReferences = [];
    try {
      const text = await resolveContextText();
      if (abortTriggered) return;
      const items = await AIService.extractActionItems(text);
      activeResultText = items.map((item) => `- [ ] ${item}`).join('\n');
      if (!abortTriggered) toast.success('Action items extracted');
    } catch {
      if (!abortTriggered) {
        activeResultText = 'Failed to extract action items.';
        toast.error('Failed to extract action items');
      }
    } finally {
      if (!abortTriggered) {
        isProcessing = false;
        statusText = null;
      }
    }
  }

  async function handleFlashcards() {
    abortTriggered = false;
    isProcessing = true;
    statusText = 'Generating study flashcards...';
    activeResultText = null;
    answerReferences = [];
    try {
      const text = await resolveContextText();
      if (abortTriggered) return;
      flashcardsResult = await AIService.generateFlashcards(text);
      if (!abortTriggered) toast.success(`Generated ${flashcardsResult.length} flashcards`);
    } catch {
      if (!abortTriggered) {
        flashcardsResult = [];
        toast.error('Failed to generate flashcards');
      }
    } finally {
      if (!abortTriggered) {
        isProcessing = false;
        statusText = null;
      }
    }
  }

  async function handleAskQuestion() {
    if (!userQuestion.trim()) return;

    abortTriggered = false;
    isProcessing = true;
    statusText = 'Searching knowledge base and formulating answer...';
    flashcardsResult = [];
    try {
      const notes = await NoteRepository.getAll();
      if (abortTriggered) return;
      const res = await AIService.answerQuestion(userQuestion, notes);
      activeResultText = res.answer;
      answerReferences = res.references;
      if (!abortTriggered) toast.success('Answer generated from your knowledge base');
    } catch {
      if (!abortTriggered) {
        activeResultText = 'Failed to answer question.';
        toast.error('Failed to answer question');
      }
    } finally {
      if (!abortTriggered) {
        isProcessing = false;
        statusText = null;
      }
    }
  }

  function copyResult() {
    if (activeResultText) {
      navigator.clipboard.writeText(activeResultText);
      toast.success('Copied AI response to clipboard');
    }
  }
</script>

<div class="ai-panel">
  <!-- Provider Status Pill -->
  {#if providerInfo}
    <div class="provider-pill">
      <span class="provider-dot {providerInfo.available ? 'online' : 'fallback'}" aria-hidden="true"></span>
      <span class="provider-msg">{providerInfo.message}</span>
    </div>
  {/if}

  <!-- Context Target Selector -->
  <div class="context-selector">
    <span class="context-label">Context:</span>
    <select
      class="context-select"
      aria-label="Select knowledge context source"
      bind:value={contextSource}
    >
      <option value="page" disabled={!activePageMeta?.articleContent}>
        Active Page ({activePageMeta?.domain || 'Web'})
      </option>
      <option value="selection" disabled={!activePageMeta?.selectedText}>
        Selected Text {activePageMeta?.selectedText ? `(${activePageMeta.selectedText.slice(0, 15)}...)` : '(None)'}
      </option>
      <option value="transcript" disabled={!activePageMeta?.isVideo}>
        Video Transcript {activePageMeta?.isVideo ? '✓' : '(Not video)'}
      </option>
      <option value="library">All Saved Notes</option>
    </select>
  </div>

  <!-- Quick Action Buttons -->
  <div class="quick-actions" role="group" aria-label="AI Prompt Actions">
    <button class="ai-action-btn" disabled={isProcessing} onclick={handleSummarize}>
      ✨ Summarize
    </button>
    <button class="ai-action-btn" disabled={isProcessing} onclick={handleKeyPoints}>
      🎯 Key Takeaways
    </button>
    <button class="ai-action-btn" disabled={isProcessing} onclick={handleActionItems}>
      📋 Action Items
    </button>
    <button class="ai-action-btn" disabled={isProcessing} onclick={handleFlashcards}>
      💡 Flashcards
    </button>
  </div>

  <!-- Question Input -->
  <div class="qa-input-box">
    <input
      type="text"
      class="qa-input"
      placeholder="Ask anything based on your notes..."
      aria-label="Ask a question about your knowledge base"
      bind:value={userQuestion}
      onkeydown={(e) => e.key === 'Enter' && handleAskQuestion()}
      disabled={isProcessing}
    />
    <button
      class="qa-submit-btn"
      disabled={isProcessing || !userQuestion.trim()}
      onclick={handleAskQuestion}
      aria-label="Submit question to AI"
    >
      Ask
    </button>
  </div>

  {#if statusText}
    <div class="loading-state" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true">⚙</span>
      <span class="status-msg">{statusText}</span>
      <button class="cancel-op-btn" onclick={cancelOperation} title="Abort current operation">
        Cancel
      </button>
    </div>
  {/if}

  <!-- AI Results Output -->
  <div class="ai-output-container">
    {#if activeResultText}
      <div class="result-card">
        <div class="result-header">
          <span class="result-title">AI Assistant Response</span>
          <div class="result-actions">
            <button class="res-btn" title="Copy to clipboard" aria-label="Copy AI response" onclick={copyResult}>📋 Copy</button>
            <button
              class="res-btn primary"
              title="Append to active note"
              aria-label="Add response to note"
              onclick={() => onInsertToNote(activeResultText!)}
            >
              + Add to Note
            </button>
          </div>
        </div>

        <div class="result-content">
          <MarkdownRenderer content={activeResultText} />
        </div>

        <!-- Grounded References List -->
        {#if answerReferences.length > 0}
          <div class="references-box">
            <span class="ref-title">Grounded Sources:</span>
            <div class="ref-links">
              {#each answerReferences as ref}
                <span class="ref-chip">
                  📄 {ref.title}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {:else if flashcardsResult.length > 0}
      <div class="flashcards-list">
        <div class="result-header">
          <span class="result-title">Generated Flashcards ({flashcardsResult.length})</span>
        </div>
        {#each flashcardsResult as card, idx}
          <div class="flashcard-item">
            <div class="card-side front">
              <span class="q-label">Q{idx + 1}:</span> {card.front}
            </div>
            <div class="card-side back">
              <span class="a-label">A:</span> {card.back}
            </div>
          </div>
        {/each}
      </div>
    {:else if !isProcessing}
      <div class="empty-state">
        <img src="/assets/illustrations/ai-processing.svg" alt="AI Assistant" class="empty-illu" />
        <p class="empty-title">Acitya AI Assistant</p>
        <p class="empty-desc">
          Click an action above or ask a question to process page content, transcripts, or your saved notes.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .ai-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    gap: 8px;
    background: var(--bg-primary);
  }

  .provider-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    padding: 4px 8px;
    border-radius: var(--radius-full);
    font-size: 11px;
  }
  .provider-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .provider-dot.online {
    background: #10b981;
    box-shadow: 0 0 6px #10b981;
  }
  .provider-dot.fallback {
    background: #f59e0b;
  }
  .provider-msg {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .context-selector {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .context-label {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .context-select {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    outline: none;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .ai-action-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 500;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .ai-action-btn:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.12);
    border-color: var(--border-focus);
    color: #a5b4fc;
  }
  .ai-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .qa-input-box {
    display: flex;
    gap: 6px;
  }
  .qa-input {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11.5px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    outline: none;
  }
  .qa-input:focus {
    border-color: var(--border-focus);
  }
  .qa-submit-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    font-size: 11px;
    font-weight: 600;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .qa-submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-state {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: #818cf8;
    background: rgba(99, 102, 241, 0.1);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }
  .status-msg {
    flex: 1;
  }
  .cancel-op-btn {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .cancel-op-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    color: #ffffff;
  }
  .spinner {
    display: inline-block;
    animation: spin 1.5s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ai-output-container {
    flex: 1;
    overflow-y: auto;
  }

  .result-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 6px;
  }
  .result-title {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .result-actions {
    display: flex;
    gap: 4px;
  }
  .res-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 10.5px;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .res-btn.primary {
    background: var(--accent-primary);
    color: white;
    border-color: transparent;
  }

  .references-box {
    border-top: 1px solid var(--border-subtle);
    padding-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ref-title {
    font-size: 10.5px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .ref-links {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .ref-chip {
    font-size: 10.5px;
    background: rgba(99, 102, 241, 0.12);
    color: #a5b4fc;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .flashcards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .flashcard-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .card-side {
    font-size: 12px;
    line-height: 1.4;
  }
  .card-side.front {
    color: var(--text-primary);
    font-weight: 600;
  }
  .card-side.back {
    color: var(--text-secondary);
    border-top: 1px dashed var(--border-subtle);
    padding-top: 4px;
    margin-top: 2px;
  }
  .q-label {
    color: #818cf8;
  }
  .a-label {
    color: #34d399;
  }

  .empty-state {
    text-align: center;
    padding: 30px 16px;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .empty-illu {
    width: 120px;
    height: 90px;
    margin-bottom: 8px;
    object-fit: contain;
  }
  .empty-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .empty-desc {
    font-size: 12px;
    margin-top: 4px;
  }
</style>
