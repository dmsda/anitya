<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageMetadata, Note } from '../../schemas/types';
  import { sendToActiveTab } from '../../services/messaging/messages';
  import { SettingsRepository } from '../../repositories/settingsRepository';
  import NoteEditor from '../../components/notes/NoteEditor.svelte';
  import HighlightList from '../../components/highlights/HighlightList.svelte';
  import VideoNotesPanel from '../../components/videos/VideoNotesPanel.svelte';
  import TranscriptViewer from '../../components/videos/TranscriptViewer.svelte';
  import AIAssistantPanel from '../../components/ai/AIAssistantPanel.svelte';
  import LibraryPanel from '../../components/search/LibraryPanel.svelte';
  import SettingsModal from '../../components/settings/SettingsModal.svelte';

  import OnboardingModal from '../../components/onboarding/OnboardingModal.svelte';
  import ToastContainer from '../../components/ui/ToastContainer.svelte';
  import { toast } from '../../lib/toast';

  type NavTab = 'notes' | 'highlights' | 'videos' | 'transcript' | 'ai' | 'library';

  const TABS: Array<{ id: NavTab; label: string; icon: string; shortLabel: string }> = [
    { id: 'notes', label: 'Notes', icon: '📝', shortLabel: 'Notes' },
    { id: 'highlights', label: 'Highlights', icon: '🖍', shortLabel: 'Marks' },
    { id: 'videos', label: 'Video', icon: '📺', shortLabel: 'Video' },
    { id: 'transcript', label: 'Transcript', icon: '📄', shortLabel: 'Captions' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖', shortLabel: 'AI' },
    { id: 'library', label: 'Library', icon: '📚', shortLabel: 'Library' },
  ];

  let activeTab = $state<NavTab>('notes');
  let activePageMeta = $state<PageMetadata | null>(null);
  let activeNote = $state<Note | null>(null);
  let isSettingsOpen = $state(false);
  let isOnboardingOpen = $state(false);
  let isSyncing = $state(false);

  onMount(async () => {
    // 1. Initialize user theme
    const settings = await SettingsRepository.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);

    // 2. Check first-time onboarding
    try {
      const hasSeen = localStorage.getItem('acitya_onboarding_completed');
      if (!hasSeen) {
        isOnboardingOpen = true;
      }
    } catch {}

    // 3. Fetch active tab metadata
    syncActiveTabMeta();

    // 4. Listen for tab switches or URL updates in Chrome
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => {
        syncActiveTabMeta();
      });
      chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
        if (changeInfo.status === 'complete') {
          syncActiveTabMeta();
        }
      });
    }
  });

  async function syncActiveTabMeta() {
    isSyncing = true;
    try {
      const meta = await sendToActiveTab<undefined, PageMetadata>({
        type: 'GET_PAGE_METADATA',
      });
      if (meta) {
        activePageMeta = meta;
        // Auto-switch to videos if YouTube
        if (meta.isVideo && activeTab === 'notes' && !activeNote) {
          activeTab = 'videos';
        }
      }
    } catch (err) {
      console.warn('Failed to sync active tab meta:', err);
    } finally {
      isSyncing = false;
    }
  }

  function handleSelectNoteFromLibrary(note: Note) {
    activeNote = note;
    activeTab = 'notes';
  }

  function handleNewNote() {
    activeNote = null;
    activeTab = 'notes';
    toast.info('New note draft created');
  }

  function handleInsertTextToNote(text: string) {
    activeTab = 'notes';
    if (activeNote) {
      activeNote = {
        ...activeNote,
        contentMarkdown: `${activeNote.contentMarkdown}\n\n${text}`,
      };
    } else {
      activeNote = {
        id: '',
        title: `AI Note: ${new Date().toLocaleDateString()}`,
        contentMarkdown: text,
        sourceUrl: activePageMeta?.url,
        sourceTitle: activePageMeta?.title,
        sourceDomain: activePageMeta?.domain,
        type: 'quick',
        tags: ['ai-generated'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    toast.success('Appended AI output to note');
  }

  function handleTabKeydown(e: KeyboardEvent, currentIndex: number) {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    const nextTab = TABS[nextIndex];
    if (nextTab) {
      activeTab = nextTab.id;
      const tabEl = document.getElementById(`tab-${nextTab.id}`);
      tabEl?.focus();
    }
  }
</script>

<div class="acitya-app">
  <!-- Toast Feedback Overlay -->
  <ToastContainer />

  <!-- Top Global Header -->
  <header class="app-header">
    <div class="header-brand">
      <img src="/assets/brand/logo-mark.svg" alt="Acitya Logo" class="brand-logo-img" />
      <div class="brand-info">
        <h1 class="brand-name">Acitya</h1>
        <span class="brand-tag">Notes</span>
      </div>
    </div>

    <!-- Active Tab Context Pill -->
    <div class="header-context" title={activePageMeta?.title || 'No active page context'}>
      {#if activePageMeta}
        <span class="context-type-icon" aria-hidden="true">
          {activePageMeta.isVideo ? '📺' : activePageMeta.isPdf ? '📑' : '🌐'}
        </span>
        <span class="context-title">
          {activePageMeta.domain || 'Active Tab'}
        </span>
        <button
          class="sync-btn {isSyncing ? 'spinning' : ''}"
          title="Refresh page context"
          aria-label="Refresh page context"
          onclick={syncActiveTabMeta}
        >
          ↻
        </button>
      {:else}
        <span class="context-title">Standby</span>
      {/if}
    </div>

    <div class="header-actions">
      <button
        class="header-btn primary"
        title="Create New Note (Ctrl+N)"
        aria-label="Create New Note"
        onclick={handleNewNote}
      >
        <span class="plus-icon">+</span>
        <span class="btn-label">Note</span>
      </button>
      <button
        class="header-btn icon"
        title="Quick Tour & Tips"
        aria-label="Quick Tour & Tips"
        onclick={() => (isOnboardingOpen = true)}
      >
        ✨
      </button>
      <button
        class="header-btn icon"
        title="Settings & Privacy Guard"
        aria-label="Settings & Privacy Guard"
        onclick={() => (isSettingsOpen = true)}
      >
        ⚙
      </button>
    </div>
  </header>

  <!-- Accessible Tab Navigation Bar -->
  <div class="app-nav-wrapper">
    <div class="app-nav" role="tablist" aria-label="Acitya Sections">
      {#each TABS as tab, idx}
        <button
          id="tab-{tab.id}"
          class="nav-tab {activeTab === tab.id ? 'active' : ''}"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="panel-{tab.id}"
          tabindex={activeTab === tab.id ? 0 : -1}
          title={tab.label}
          onclick={() => (activeTab = tab.id)}
          onkeydown={(e) => handleTabKeydown(e, idx)}
        >
          <span class="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span class="tab-label">{tab.label}</span>
          <span class="tab-label-compact">{tab.shortLabel}</span>
          {#if tab.id === 'videos' && activePageMeta?.isVideo}
            <span class="dot-indicator" title="Active video detected"></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Active Tab Panel Viewport Area -->
  <main class="app-main">
    <div
      id="panel-{activeTab}"
      class="app-tabpanel"
      role="tabpanel"
      aria-labelledby="tab-{activeTab}"
    >
      {#if activeTab === 'notes'}
        <NoteEditor
          {activeNote}
          {activePageMeta}
          onNoteSaved={(saved) => (activeNote = saved)}
          onNoteDeleted={() => (activeNote = null)}
        />
      {:else if activeTab === 'highlights'}
        <HighlightList {activePageMeta} />
      {:else if activeTab === 'videos'}
        <VideoNotesPanel {activePageMeta} />
      {:else if activeTab === 'transcript'}
        <TranscriptViewer {activePageMeta} />
      {:else if activeTab === 'ai'}
        <AIAssistantPanel {activePageMeta} onInsertToNote={handleInsertTextToNote} />
      {:else if activeTab === 'library'}
        <LibraryPanel onSelectNote={handleSelectNoteFromLibrary} />
      {/if}
    </div>
  </main>

  <!-- Settings & Onboarding Modals -->
  <SettingsModal
    isOpen={isSettingsOpen}
    onClose={() => (isSettingsOpen = false)}
    onReplayTour={() => (isOnboardingOpen = true)}
  />
  <OnboardingModal isOpen={isOnboardingOpen} onComplete={() => (isOnboardingOpen = false)} />
</div>

<style>
  .acitya-app {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
    gap: 6px;
    height: 46px;
    flex-shrink: 0;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .brand-logo-img {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: block;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
  }
  .brand-info {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }
  .brand-name {
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1;
    background: var(--accent-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand-tag {
    font-size: 8.5px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 1px;
  }

  .header-context {
    flex: 1;
    min-width: 0;
    max-width: 140px;
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-tertiary);
    padding: 3px 6px;
    border-radius: var(--radius-full);
    font-size: 11px;
    overflow: hidden;
  }
  .context-type-icon {
    font-size: 11px;
    line-height: 1;
    flex-shrink: 0;
  }
  .context-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 10.5px;
  }
  .sync-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 12px;
    padding: 0 2px;
    line-height: 1;
    flex-shrink: 0;
  }
  .sync-btn.spinning {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .header-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 600;
    padding: 4px 7px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .header-btn.primary {
    background: var(--accent-primary);
    border-color: transparent;
    color: white;
  }
  .header-btn.primary:hover {
    background: var(--accent-primary-hover);
  }
  .header-btn:hover:not(.primary) {
    border-color: var(--border-focus);
    background: rgba(99, 102, 241, 0.15);
  }
  .header-btn.icon {
    font-size: 12px;
    padding: 4px 6px;
  }

  /* Responsive App Navigation */
  .app-nav {
    display: flex;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
    padding: 0 4px;
    overflow-x: auto;
    flex-shrink: 0;
    scrollbar-width: none; /* Hide scrollbar for clean UI */
  }
  .app-nav::-webkit-scrollbar {
    display: none;
  }

  .nav-tab {
    flex: 1;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 500;
    padding: 8px 6px;
    cursor: pointer;
    white-space: nowrap;
    transition: color var(--transition-fast);
    border-bottom: 2px solid transparent;
    min-width: 0;
  }
  .nav-tab:hover {
    color: var(--text-primary);
  }
  .nav-tab.active {
    color: #818cf8;
    border-bottom-color: var(--accent-primary);
    font-weight: 600;
  }

  .tab-icon {
    font-size: 12px;
    line-height: 1;
  }
  .tab-label {
    display: inline;
  }
  .tab-label-compact {
    display: none;
  }

  .dot-indicator {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #ef4444;
    border-radius: 50%;
    margin-left: 2px;
    vertical-align: middle;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
  }

  .app-main {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* Side Panel Breakpoints: 280px to 480px */
  @media (max-width: 380px) {
    .tab-label {
      display: none;
    }
    .tab-label-compact {
      display: inline;
    }
  }

  @media (max-width: 320px) {
    .brand-tag {
      display: none;
    }
    .btn-label {
      display: none;
    }
    .header-context {
      max-width: 100px;
    }
    .tab-label-compact {
      display: none;
    }
    .nav-tab {
      padding: 8px 4px;
    }
  }

  @media (max-width: 290px) {
    .brand-info {
      display: none;
    }
    .header-context {
      max-width: 90px;
    }
  }
</style>

