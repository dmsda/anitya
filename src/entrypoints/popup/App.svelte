<script lang="ts">
  import { onMount } from 'svelte';
  import { NoteRepository } from '../../repositories/noteRepository';
  import { HighlightRepository } from '../../repositories/highlightRepository';

  let totalNotes = $state(0);
  let totalHighlights = $state(0);
  let activeTabTitle = $state('Loading...');
  let activeTabUrl = $state('');

  onMount(async () => {
    try {
      const [notes, highlights] = await Promise.all([
        NoteRepository.getAll(),
        HighlightRepository.getAll(),
      ]);
      totalNotes = notes.length;
      totalHighlights = highlights.length;

      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          activeTabTitle = tab.title || 'Web Page';
          activeTabUrl = tab.url || '';
        }
      }
    } catch (e) {
      console.warn('Failed to load popup data:', e);
    }
  });

  async function openSidePanel() {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && chrome.sidePanel?.open) {
        await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
          chrome.sidePanel.open({ windowId: tab.windowId });
        });
        window.close();
      }
    }
  }
</script>

<div class="popup-container">
  <!-- Brand Header -->
  <div class="popup-header">
    <img src="/assets/brand/logo-mark.svg" alt="Acitya Logo" class="logo-img" />
    <div class="brand">
      <h3>Acitya Notes</h3>
      <span class="sub">Knowledge Side Panel</span>
    </div>
  </div>

  <!-- Active Page Card -->
  <div class="page-card">
    <span class="card-label">Active Page:</span>
    <p class="page-title">{activeTabTitle}</p>
    <span class="page-domain">{activeTabUrl ? new URL(activeTabUrl).hostname : ''}</span>
  </div>

  <!-- Stats Grid -->
  <div class="stats-row">
    <div class="stat-box">
      <span class="stat-num">{totalNotes}</span>
      <span class="stat-text">Notes</span>
    </div>
    <div class="stat-box">
      <span class="stat-num">{totalHighlights}</span>
      <span class="stat-text">Highlights</span>
    </div>
  </div>

  <!-- Action Button -->
  <button class="open-panel-btn" onclick={openSidePanel}>
    <span>Open Knowledge Side Panel</span>
    <span class="arrow">→</span>
  </button>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    width: 280px;
    background: #090d16;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .popup-container {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .popup-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logo-img {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: block;
  }
  .brand h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand .sub {
    font-size: 10px;
    color: #94a3b8;
  }

  .page-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .card-label {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
  }
  .page-title {
    margin: 3px 0;
    font-size: 12px;
    font-weight: 500;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .page-domain {
    font-size: 10.5px;
    color: #818cf8;
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .stat-box {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px;
    text-align: center;
  }
  .stat-num {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #38bdf8;
  }
  .stat-text {
    font-size: 10.5px;
    color: #94a3b8;
  }

  .open-panel-btn {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    transition: opacity 0.15s, transform 0.1s;
  }
  .open-panel-btn:hover {
    opacity: 0.95;
    transform: translateY(-1px);
  }
  .arrow {
    font-size: 14px;
  }
</style>
