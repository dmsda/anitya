<script lang="ts">
  import { onMount } from 'svelte';
  import type { Highlight, PageMetadata } from '../../schemas/types';
  import { HighlightRepository } from '../../repositories/highlightRepository';
  import { sendToActiveTab } from '../../services/messaging/messages';
  import { HIGHLIGHT_COLORS } from '../../modules/highlighter/floatingToolbar';
  import ConfirmModal from '../ui/ConfirmModal.svelte';
  import { toast } from '../../lib/toast';

  let {
    activePageMeta = null,
  }: {
    activePageMeta: PageMetadata | null;
  } = $props();

  let highlights = $state<Highlight[]>([]);
  let activeFilterColor = $state<string | 'all'>('all');
  let filterScope = $state<'page' | 'all'>('page');
  let editingId = $state<string | null>(null);
  let editAnnotation = $state('');
  let isDeleteModalOpen = $state(false);
  let highlightToDelete = $state<Highlight | null>(null);

  onMount(() => {
    loadHighlights();
  });

  $effect(() => {
    // Reload when active page or scope changes
    if (activePageMeta || filterScope) {
      loadHighlights();
    }
  });

  async function loadHighlights() {
    try {
      if (filterScope === 'page' && activePageMeta?.url) {
        highlights = await HighlightRepository.getBySourceUrl(activePageMeta.url);
      } else {
        highlights = await HighlightRepository.getAll();
      }
    } catch (e) {
      console.warn('Failed to load highlights:', e);
    }
  }

  let filteredHighlights = $derived.by(() => {
    if (activeFilterColor === 'all') return highlights;
    return highlights.filter((h) => h.color === activeFilterColor);
  });

  async function jumpToHighlight(hl: Highlight) {
    try {
      await sendToActiveTab({
        type: 'SCROLL_TO_HIGHLIGHT',
        payload: { highlightId: hl.id },
      });
      toast.info('Scrolling to highlight in page');
    } catch {
      toast.error('Could not locate highlight on current active tab');
    }
  }

  function requestDeleteHighlight(hl: Highlight) {
    highlightToDelete = hl;
    isDeleteModalOpen = true;
  }

  async function executeDeleteHighlight() {
    if (!highlightToDelete) return;
    try {
      await HighlightRepository.delete(highlightToDelete.id);
      await sendToActiveTab({
        type: 'DELETE_HIGHLIGHT_DOM',
        payload: { highlightId: highlightToDelete.id },
      });
      toast.info('Highlight deleted');
      loadHighlights();
    } catch {
      toast.error('Failed to delete highlight');
    } finally {
      isDeleteModalOpen = false;
      highlightToDelete = null;
    }
  }

  function startEditAnnotation(hl: Highlight) {
    editingId = hl.id;
    editAnnotation = hl.annotation || '';
  }

  function cancelEditAnnotation() {
    editingId = null;
    editAnnotation = '';
  }

  async function saveAnnotation(hl: Highlight) {
    hl.annotation = editAnnotation.trim();
    await HighlightRepository.save(hl);
    editingId = null;
    toast.success('Annotation saved');
    loadHighlights();
  }

  async function copyQuote(hl: Highlight) {
    try {
      await navigator.clipboard.writeText(`"${hl.exactText}"`);
      toast.success('Quote copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }
</script>

<div class="highlight-panel">
  <!-- Filter & Scope Header -->
  <div class="panel-header">
    <div class="scope-toggle" role="group" aria-label="Highlight Scope">
      <button
        class="scope-btn {filterScope === 'page' ? 'active' : ''}"
        onclick={() => (filterScope = 'page')}
        aria-pressed={filterScope === 'page'}
      >
        This Page ({filterScope === 'page' ? filteredHighlights.length : '...'})
      </button>
      <button
        class="scope-btn {filterScope === 'all' ? 'active' : ''}"
        onclick={() => (filterScope = 'all')}
        aria-pressed={filterScope === 'all'}
      >
        All Library
      </button>
    </div>

    <!-- Color filters -->
    <div class="color-filters" role="group" aria-label="Filter highlights by color">
      <button
        class="color-filter-btn {activeFilterColor === 'all' ? 'active' : ''}"
        onclick={() => (activeFilterColor = 'all')}
        aria-label="Show all highlight colors"
        title="All colors"
      >
        All
      </button>
      {#each HIGHLIGHT_COLORS as c}
        <button
          class="color-filter-dot {activeFilterColor === c.hex ? 'active' : ''}"
          style="background-color: {c.hex};"
          onclick={() => (activeFilterColor = c.hex)}
          aria-label="Filter by color {c.name}"
          title="{c.name}"
        ></button>
      {/each}
    </div>
  </div>

  <!-- Highlight Cards List -->
  <div class="highlight-list">
    {#if filteredHighlights.length === 0}
      <div class="empty-state">
        <img src="/assets/illustrations/empty-highlights.svg" alt="No highlights" class="empty-illu" />
        <p class="empty-title">No highlights found</p>
        <p class="empty-desc">
          Select any text on a web page to highlight with Acitya's floating toolbar.
        </p>
      </div>
    {:else}
      {#each filteredHighlights as hl (hl.id)}
        <div class="highlight-card" style="border-left-color: {hl.color};">
          <div class="card-header">
            {#if hl.anchorStatus === 'unresolved'}
              <span class="unresolved-badge" title="Page content changed; text cannot be reliably re-anchored">
                ⚠ Unresolved
              </span>
            {:else}
              <span class="anchored-badge" title="W3C anchored to DOM">
                ● Anchored
              </span>
            {/if}

            <div class="card-actions">
              <button
                class="card-action-btn"
                title="Jump to text in page"
                aria-label="Jump to text in page"
                onclick={() => jumpToHighlight(hl)}
              >
                🎯 Jump
              </button>
              <button
                class="card-action-btn"
                title="Copy quote"
                aria-label="Copy quote to clipboard"
                onclick={() => copyQuote(hl)}
              >
                📋
              </button>
              <button
                class="card-action-btn danger"
                title="Delete highlight"
                aria-label="Delete highlight"
                onclick={() => requestDeleteHighlight(hl)}
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Quoted Text -->
          <button
            class="quote-btn"
            type="button"
            onclick={() => jumpToHighlight(hl)}
            title="Click to jump to text in page"
            aria-label="Jump to highlighted text in web page: {hl.exactText.slice(0, 40)}"
          >
            <blockquote class="quote-text">
              "{hl.exactText}"
            </blockquote>
          </button>

          <!-- Annotation Note -->
          {#if editingId === hl.id}
            <div class="annotation-edit-box">
              <input
                type="text"
                class="annotation-input"
                placeholder="Add your note/comment... (Esc to cancel)"
                aria-label="Edit annotation"
                bind:value={editAnnotation}
                onkeydown={(e) => {
                  if (e.key === 'Enter') saveAnnotation(hl);
                  if (e.key === 'Escape') cancelEditAnnotation();
                }}
              />
              <button class="save-anno-btn" onclick={() => saveAnnotation(hl)}>Save</button>
              <button class="cancel-anno-btn" onclick={cancelEditAnnotation}>Cancel</button>
            </div>
          {:else if hl.annotation}
            <button
              class="annotation-badge"
              onclick={() => startEditAnnotation(hl)}
              title="Click to edit annotation"
              aria-label="Edit annotation: {hl.annotation}"
            >
              💭 {hl.annotation}
            </button>
          {:else}
            <button
              class="add-anno-btn"
              onclick={() => startEditAnnotation(hl)}
              aria-label="Add personal annotation to highlight"
            >
              + Add note
            </button>
          {/if}

          <!-- Source Footer -->
          {#if filterScope === 'all'}
            <div class="source-info">
              <a href={hl.sourceUrl} target="_blank" rel="noopener noreferrer" class="source-url">
                {hl.sourceUrl.split('/')[2] || hl.sourceUrl}
              </a>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Delete Confirmation Modal -->
  <ConfirmModal
    isOpen={isDeleteModalOpen}
    title="Delete Highlight"
    message={`Delete highlight "${highlightToDelete?.exactText.slice(0, 60) || ''}..."?`}
    confirmText="Delete"
    isDanger={true}
    onConfirm={executeDeleteHighlight}
    onCancel={() => {
      isDeleteModalOpen = false;
      highlightToDelete = null;
    }}
  />
</div>

<style>
  .highlight-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid var(--border-subtle);
    gap: 8px;
  }

  .scope-toggle {
    display: flex;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .scope-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .scope-btn.active {
    background: var(--accent-primary);
    color: #ffffff;
  }

  .color-filters {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .color-filter-btn {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 10.5px;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    cursor: pointer;
  }
  .color-filter-btn.active {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-focus);
  }
  .color-filter-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .color-filter-dot:hover, .color-filter-dot.active {
    transform: scale(1.25);
    box-shadow: 0 0 0 2px var(--border-focus);
  }

  .highlight-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .highlight-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-left-width: 4px;
    border-radius: var(--radius-sm);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .highlight-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .anchored-badge {
    font-size: 10px;
    color: #34d399;
    font-weight: 500;
  }
  .unresolved-badge {
    font-size: 10px;
    color: #fbbf24;
    font-weight: 500;
  }

  .card-actions {
    display: flex;
    gap: 4px;
  }
  .card-action-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 10.5px;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .card-action-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-focus);
  }
  .card-action-btn.danger:hover {
    color: #f87171;
    border-color: #ef4444;
  }

  .quote-btn {
    background: transparent;
    border: none;
    text-align: left;
    padding: 0;
    cursor: pointer;
    width: 100%;
  }

  .quote-text {
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-primary);
    font-style: italic;
    margin: 0;
  }

  .annotation-badge {
    font-size: 11.5px;
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .add-anno-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }
  .add-anno-btn:hover {
    color: var(--accent-primary);
  }

  .annotation-edit-box {
    display: flex;
    gap: 4px;
  }
  .annotation-input {
    flex: 1;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11.5px;
    padding: 4px 6px;
    border-radius: 4px;
    outline: none;
  }
  .save-anno-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  .cancel-anno-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .cancel-anno-btn:hover {
    color: var(--text-primary);
  }

  .source-info {
    font-size: 10.5px;
    color: var(--text-muted);
    border-top: 1px solid var(--border-subtle);
    padding-top: 4px;
  }
  .source-url {
    color: var(--text-muted);
    text-decoration: none;
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
    font-weight: 600;
    font-size: 14px;
    color: var(--text-secondary);
  }
  .empty-desc {
    font-size: 12px;
    margin-top: 4px;
  }
</style>
