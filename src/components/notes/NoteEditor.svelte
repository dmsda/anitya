<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Note, PageMetadata } from '../../schemas/types';
  import { NoteRepository } from '../../repositories/noteRepository';
  import { CollectionRepository } from '../../repositories/collectionRepository';
  import MarkdownRenderer from '../ui/MarkdownRenderer.svelte';
  import { MarkdownExporter } from '../../modules/export/markdownExporter';
  import { HighlightRepository } from '../../repositories/highlightRepository';
  import { VideoNoteRepository } from '../../repositories/videoNoteRepository';

  import ConfirmModal from '../ui/ConfirmModal.svelte';
  import { toast } from '../../lib/toast';

  let {
    activeNote = null,
    activePageMeta = null,
    onNoteSaved = () => {},
    onNoteDeleted = () => {},
  }: {
    activeNote: Note | null;
    activePageMeta: PageMetadata | null;
    onNoteSaved?: (note: Note) => void;
    onNoteDeleted?: (id: string) => void;
  } = $props();

  let title = $state('');
  let content = $state('');
  let tags = $state<string[]>([]);
  let tagInput = $state('');
  let selectedCollectionId = $state<string | undefined>(undefined);
  let collections = $state<Array<{ id: string; name: string }>>([]);

  let viewMode = $state<'edit' | 'preview' | 'split'>('edit');
  let saveStatus = $state<'saved' | 'saving' | 'unsaved'>('saved');
  let saveTimeout: any = null;
  let isDeleteModalOpen = $state(false);

  let wordCount = $derived.by(() => {
    const text = content.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  });

  let charCount = $derived(content.length);

  // Initialize data on mount or note change
  $effect(() => {
    if (activeNote) {
      title = activeNote.title;
      content = activeNote.contentMarkdown;
      tags = [...(activeNote.tags || [])];
      selectedCollectionId = activeNote.collectionId;
      saveStatus = 'saved';
    } else {
      resetToDraft();
    }
  });

  onMount(async () => {
    try {
      collections = await CollectionRepository.getAll();
    } catch (e) {
      console.warn('Failed to load collections:', e);
    }
  });

  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  function resetToDraft() {
    title = activePageMeta ? `Notes on ${activePageMeta.title.slice(0, 40)}` : 'Quick Note';
    content = '';
    tags = activePageMeta?.domain ? [activePageMeta.domain] : [];
    selectedCollectionId = undefined;
    saveStatus = 'saved';
  }

  function handleInput() {
    saveStatus = 'unsaved';
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      triggerAutosave();
    }, 600);
  }

  async function triggerAutosave() {
    if (!title.trim() && !content.trim()) return;

    saveStatus = 'saving';
    try {
      if (activeNote) {
        const updated = await NoteRepository.save({
          ...activeNote,
          title: title.trim() || 'Untitled Note',
          contentMarkdown: content,
          tags,
          collectionId: selectedCollectionId,
        });
        saveStatus = 'saved';
        onNoteSaved(updated);
      } else {
        const created = await NoteRepository.create({
          title: title.trim() || 'Untitled Note',
          contentMarkdown: content,
          sourceUrl: activePageMeta?.url,
          sourceTitle: activePageMeta?.title,
          sourceDomain: activePageMeta?.domain,
          type: activePageMeta?.isVideo ? 'video' : activePageMeta?.isPdf ? 'pdf' : activePageMeta?.url ? 'web' : 'quick',
          tags,
          collectionId: selectedCollectionId,
        });
        saveStatus = 'saved';
        onNoteSaved(created);
      }
    } catch (err) {
      console.error('[Acitya] Save error:', err);
      saveStatus = 'unsaved';
      toast.error('Failed to autosave note changes');
    }
  }

  function addTag() {
    const clean = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      tags = [...tags, clean];
      tagInput = '';
      handleInput();
    }
  }

  function removeTag(tag: string) {
    tags = tags.filter((t) => t !== tag);
    handleInput();
  }

  function handleTagKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }

  async function clipActiveArticle() {
    if (!activePageMeta?.articleContent) return;
    content = content ? `${content}\n\n## Clipped Content\n${activePageMeta.articleContent}` : activePageMeta.articleContent;
    handleInput();
    toast.success('Clipped article into note');
  }

  async function exportToObsidian() {
    if (!activeNote) return;
    try {
      const [highlights, videoNotes] = await Promise.all([
        HighlightRepository.getByNoteId(activeNote.id),
        VideoNoteRepository.getByNoteId(activeNote.id),
      ]);
      const md = MarkdownExporter.exportNote(activeNote, highlights, videoNotes);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeNote.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported Obsidian Markdown file');
    } catch {
      toast.error('Failed to export note');
    }
  }

  function requestDeleteNote() {
    if (!activeNote) {
      resetToDraft();
      return;
    }
    isDeleteModalOpen = true;
  }

  async function executeDeleteNote() {
    if (!activeNote) return;
    try {
      await NoteRepository.delete(activeNote.id);
      onNoteDeleted(activeNote.id);
      resetToDraft();
      isDeleteModalOpen = false;
      toast.info('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  }
</script>

<div class="note-editor">
  <!-- Top Bar: Status, Mode Switcher, Actions -->
  <div class="editor-header">
    <div class="status-indicator" role="status" aria-live="polite">
      {#if saveStatus === 'saved'}
        <span class="status-badge saved">✓ Saved</span>
      {:else if saveStatus === 'saving'}
        <span class="status-badge saving">⏳ Saving...</span>
      {:else}
        <span class="status-badge unsaved">● Unsaved</span>
      {/if}
    </div>

    <div class="view-modes" role="group" aria-label="Editor View Modes">
      <button
        class="mode-btn {viewMode === 'edit' ? 'active' : ''}"
        onclick={() => (viewMode = 'edit')}
        aria-pressed={viewMode === 'edit'}
      >
        Edit
      </button>
      <button
        class="mode-btn {viewMode === 'split' ? 'active' : ''}"
        onclick={() => (viewMode = 'split')}
        aria-pressed={viewMode === 'split'}
        title="Side-by-side edit and preview"
      >
        Split
      </button>
      <button
        class="mode-btn {viewMode === 'preview' ? 'active' : ''}"
        onclick={() => (viewMode = 'preview')}
        aria-pressed={viewMode === 'preview'}
      >
        Preview
      </button>
    </div>

    <div class="header-actions">
      {#if activeNote}
        <button
          class="icon-btn"
          title="Export as Obsidian Markdown with front matter"
          aria-label="Export Obsidian Markdown"
          onclick={exportToObsidian}
        >
          ⬇ MD
        </button>
        <button
          class="icon-btn danger"
          title="Delete Note"
          aria-label="Delete Note"
          onclick={requestDeleteNote}
        >
          🗑
        </button>
      {/if}
    </div>
  </div>

  <!-- Source Context Banner -->
  {#if activeNote?.sourceUrl || activePageMeta?.url}
    <div class="source-banner">
      <span class="source-icon" aria-hidden="true">🌐</span>
      <a
        href={activeNote?.sourceUrl || activePageMeta?.url}
        target="_blank"
        rel="noopener noreferrer"
        class="source-link"
        title={activeNote?.sourceTitle || activePageMeta?.title}
      >
        {activeNote?.sourceTitle || activePageMeta?.title || 'Active Web Page'}
      </a>
      {#if activePageMeta?.articleContent && !activeNote}
        <button class="clip-action-btn" onclick={clipActiveArticle} title="Clip extracted article text">
          + Clip Article
        </button>
      {/if}
    </div>
  {/if}

  <!-- Title Input -->
  <input
    type="text"
    class="title-input"
    placeholder="Note title..."
    aria-label="Note Title"
    bind:value={title}
    oninput={handleInput}
  />

  <!-- Tag Management & Collection -->
  <div class="meta-row">
    <div class="tag-chips">
      {#each tags as tag}
        <span class="tag-chip">
          #{tag}
          <button
            class="tag-remove"
            onclick={() => removeTag(tag)}
            aria-label="Remove tag {tag}"
          >
            ×
          </button>
        </span>
      {/each}
      <input
        type="text"
        class="tag-input"
        placeholder="+ Add tag..."
        aria-label="Add tag"
        bind:value={tagInput}
        onkeydown={handleTagKeyDown}
      />
    </div>

    {#if collections.length > 0}
      <select
        class="collection-select"
        aria-label="Select note collection"
        bind:value={selectedCollectionId}
        onchange={handleInput}
      >
        <option value={undefined}>No Collection</option>
        {#each collections as col}
          <option value={col.id}>{col.name}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Content Workspace -->
  <div class="content-workspace {viewMode}">
    {#if viewMode === 'edit' || viewMode === 'split'}
      <textarea
        class="markdown-textarea"
        placeholder="Write note in Markdown... Tip: use [mm:ss] for interactive video timestamps!"
        aria-label="Note Content Markdown"
        bind:value={content}
        oninput={handleInput}
      ></textarea>
    {/if}

    {#if viewMode === 'preview' || viewMode === 'split'}
      <div class="preview-scroll" role="region" aria-label="Markdown Preview">
        <MarkdownRenderer {content} />
      </div>
    {/if}
  </div>

  <!-- Note Footer Metadata -->
  <footer class="editor-footer">
    <span class="count-pill">{wordCount} words · {charCount} chars</span>
    <span class="shortcuts-hint">Autosaved locally</span>
  </footer>

  <!-- Confirmation Modal -->
  <ConfirmModal
    isOpen={isDeleteModalOpen}
    title="Delete Note"
    message={`Are you sure you want to delete "${activeNote?.title || 'this note'}"? This action cannot be undone.`}
    confirmText="Delete Note"
    isDanger={true}
    onConfirm={executeDeleteNote}
    onCancel={() => (isDeleteModalOpen = false)}
  />
</div>


<style>
  .note-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 8px;
    padding: 10px;
    background: var(--bg-primary);
  }

  .editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .status-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: var(--radius-full);
  }
  .status-badge.saved {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .status-badge.saving {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }
  .status-badge.unsaved {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .view-modes {
    display: flex;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .mode-btn {
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
  .mode-btn.active {
    background: var(--accent-primary);
    color: #ffffff;
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }
  .icon-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    padding: 3px 8px;
    font-size: 11px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
  }
  .icon-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-focus);
  }
  .icon-btn.danger:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
    border-color: #ef4444;
  }

  .source-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
  }
  .source-link {
    color: #818cf8;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  .source-link:hover {
    text-decoration: underline;
  }
  .clip-action-btn {
    background: var(--accent-primary);
    color: #ffffff;
    border: none;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }

  .title-input {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s;
  }
  .title-input:focus {
    border-color: var(--border-focus);
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(99, 102, 241, 0.15);
    color: #a5b4fc;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }
  .tag-remove {
    background: transparent;
    border: none;
    color: #a5b4fc;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }
  .tag-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-secondary);
    font-size: 11px;
    width: 80px;
  }
  .collection-select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 11px;
    padding: 3px 6px;
    border-radius: var(--radius-sm);
    outline: none;
  }

  .content-workspace {
    flex: 1;
    display: flex;
    min-height: 0;
    gap: 8px;
  }
  .content-workspace.split {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .markdown-textarea {
    flex: 1;
    width: 100%;
    height: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    padding: 10px;
    border-radius: var(--radius-sm);
    outline: none;
    resize: none;
    transition: border-color 0.15s;
  }
  .markdown-textarea:focus {
    border-color: var(--border-focus);
  }

  .preview-scroll {
    flex: 1;
    height: 100%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    padding: 10px;
    border-radius: var(--radius-sm);
    overflow-y: auto;
  }

  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 4px;
    border-top: 1px solid var(--border-subtle);
    font-size: 10.5px;
    color: var(--text-muted);
  }
  .count-pill {
    background: var(--bg-tertiary);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .shortcuts-hint {
    font-size: 10px;
    color: var(--text-muted);
  }

  /* Responsive Split View: Stack vertically on narrow side panels (< 420px) */
  @media (max-width: 420px) {
    .content-workspace.split {
      display: flex;
      flex-direction: column;
    }
    .content-workspace.split .markdown-textarea,
    .content-workspace.split .preview-scroll {
      height: 50%;
    }
  }
</style>

