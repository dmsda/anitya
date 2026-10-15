<script lang="ts">
  import { onMount } from 'svelte';
  import type { Note, NoteType } from '../../schemas/types';
  import { SearchEngine, type SearchResultItem } from '../../modules/search/searchEngine';
  import { NoteRepository } from '../../repositories/noteRepository';
  import { toast } from '../../lib/toast';

  let {
    onSelectNote = () => {},
  }: {
    onSelectNote?: (note: Note) => void;
  } = $props();

  let query = $state('');
  let selectedType = $state<NoteType | ''>('');
  let selectedTag = $state('');
  let availableTags = $state<string[]>([]);
  let availableDomains = $state<string[]>([]);
  let results = $state<SearchResultItem[]>([]);
  let isSearching = $state(false);

  onMount(async () => {
    const allNotes = await NoteRepository.getAll();
    availableTags = SearchEngine.getUniqueTags(allNotes);
    availableDomains = SearchEngine.getUniqueDomains(allNotes);
    triggerSearch();
  });

  async function triggerSearch() {
    isSearching = true;
    try {
      results = await SearchEngine.search({
        query: query.trim(),
        type: selectedType ? selectedType : undefined,
        tag: selectedTag ? selectedTag : undefined,
      });
    } finally {
      isSearching = false;
    }
  }

  function handleQueryInput() {
    triggerSearch();
  }

  function handleTypeFilter(t: NoteType | '') {
    selectedType = t;
    triggerSearch();
  }

  function handleTagFilter(t: string) {
    selectedTag = selectedTag === t ? '' : t;
    triggerSearch();
  }

  function handleSelect(note: Note) {
    onSelectNote(note);
    toast.info(`Opened "${note.title.slice(0, 30)}" in Editor`);
  }
</script>

<div class="library-panel">
  <!-- Search Bar -->
  <div class="search-header">
    <input
      type="text"
      class="search-bar-input"
      placeholder="Search notes, highlights, transcripts..."
      aria-label="Search notes, highlights, and transcripts"
      bind:value={query}
      oninput={handleQueryInput}
    />
  </div>

  <!-- Type Filters -->
  <div class="filter-pills" role="group" aria-label="Filter by note type">
    <button
      class="pill {selectedType === '' ? 'active' : ''}"
      onclick={() => handleTypeFilter('')}
      aria-pressed={selectedType === ''}
    >
      All
    </button>
    <button
      class="pill {selectedType === 'web' ? 'active' : ''}"
      onclick={() => handleTypeFilter('web')}
      aria-pressed={selectedType === 'web'}
    >
      🌐 Web
    </button>
    <button
      class="pill {selectedType === 'video' ? 'active' : ''}"
      onclick={() => handleTypeFilter('video')}
      aria-pressed={selectedType === 'video'}
    >
      📺 Video
    </button>
    <button
      class="pill {selectedType === 'quick' ? 'active' : ''}"
      onclick={() => handleTypeFilter('quick')}
      aria-pressed={selectedType === 'quick'}
    >
      ⚡ Quick
    </button>
  </div>

  <!-- Tag Pills -->
  {#if availableTags.length > 0}
    <div class="tag-filters" role="group" aria-label="Filter by tag">
      {#each availableTags.slice(0, 10) as tag}
        <button
          class="tag-pill {selectedTag === tag ? 'active' : ''}"
          onclick={() => handleTagFilter(tag)}
          aria-pressed={selectedTag === tag}
          aria-label="Filter by tag #{tag}"
        >
          #{tag}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Results List -->
  <div class="results-list" role="feed" aria-label="Search results">
    {#if isSearching}
      <div class="loading-state" role="status" aria-live="polite">Searching library...</div>
    {:else if results.length === 0}
      <div class="empty-state">
        <img src="/assets/illustrations/no-search-results.svg" alt="No results" class="empty-illu" />
        <p class="empty-title">No matching notes found</p>
        <p class="empty-desc">Try different keywords or clear active filters.</p>
      </div>
    {:else}
      {#each results as item (item.type === 'note' ? item.note!.id : item.highlight!.id)}
        {#if item.type === 'note' && item.note}
          <button
            class="item-card"
            type="button"
            onclick={() => handleSelect(item.note!)}
            aria-label="Open note: {item.note.title}"
          >
            <div class="card-top">
              <span class="type-badge {item.note.type}">{item.note.type}</span>
              <span class="date-label">{new Date(item.note.updatedAt).toLocaleDateString()}</span>
            </div>
            <h4 class="card-title">{item.note.title}</h4>
            <p class="card-snippet">
              {item.note.contentMarkdown.slice(0, 120)}...
            </p>
            {#if item.note.tags.length > 0}
              <div class="card-tags">
                {#each item.note.tags as t}
                  <span class="mini-tag">#{t}</span>
                {/each}
              </div>
            {/if}
          </button>
        {:else if item.type === 'highlight' && item.highlight}
          <div
            class="item-card highlight"
            style="border-left-color: {item.highlight.color};"
            role="article"
            aria-label="Highlight: {item.highlight.exactText.slice(0, 40)}"
          >
            <div class="card-top">
              <span class="type-badge hl">Highlight</span>
              <span class="date-label">{new Date(item.highlight.createdAt).toLocaleDateString()}</span>
            </div>
            <p class="card-quote">"{item.highlight.exactText}"</p>
            {#if item.highlight.annotation}
              <p class="card-anno">💭 {item.highlight.annotation}</p>
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>


<style>
  .library-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    gap: 8px;
    background: var(--bg-primary);
  }

  .search-header {
    display: flex;
  }
  .search-bar-input {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 12px;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s;
  }
  .search-bar-input:focus {
    border-color: var(--border-focus);
  }

  .filter-pills {
    display: flex;
    gap: 4px;
  }
  .pill {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .pill.active {
    background: var(--accent-primary);
    color: white;
    border-color: transparent;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .tag-pill {
    background: transparent;
    border: 1px dashed var(--border-subtle);
    color: var(--text-muted);
    font-size: 10.5px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    cursor: pointer;
  }
  .tag-pill.active {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border-color: #818cf8;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .item-card:hover {
    transform: translateY(-1px);
    border-color: var(--border-focus);
  }
  .item-card.highlight {
    border-left-width: 4px;
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .type-badge {
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--bg-tertiary);
    color: var(--text-muted);
  }
  .type-badge.web {
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
  }
  .type-badge.video {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  .type-badge.quick {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .type-badge.hl {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }

  .date-label {
    font-size: 10.5px;
    color: var(--text-muted);
  }

  .card-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .card-snippet {
    font-size: 11.5px;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  .card-quote {
    font-size: 11.5px;
    font-style: italic;
    color: var(--text-primary);
  }
  .card-anno {
    font-size: 11px;
    color: #a5b4fc;
  }

  .card-tags {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }
  .mini-tag {
    font-size: 10px;
    color: var(--text-muted);
  }

  .loading-state, .empty-state {
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
