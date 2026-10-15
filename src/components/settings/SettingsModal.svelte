<script lang="ts">
  import { onMount } from 'svelte';
  import type { UserSettings } from '../../schemas/types';
  import { SettingsRepository, DEFAULT_SETTINGS } from '../../repositories/settingsRepository';
  import { HIGHLIGHT_COLORS } from '../../modules/highlighter/floatingToolbar';
  import { JsonExporter, JsonImporter } from '../../modules/export/jsonExporter';
  import { clearAllLocalData } from '../../repositories/db';
  import ConfirmModal from '../ui/ConfirmModal.svelte';
  import { toast } from '../../lib/toast';

  let {
    isOpen = false,
    onClose = () => {},
    onReplayTour = () => {},
  }: {
    isOpen: boolean;
    onClose: () => void;
    onReplayTour?: () => void;
  } = $props();

  let settings = $state<UserSettings>({ ...DEFAULT_SETTINGS });
  let saveSuccess = $state(false);
  let isEraseModalOpen = $state(false);

  onMount(async () => {
    loadSettings();
  });

  async function loadSettings() {
    settings = await SettingsRepository.getSettings();
  }

  async function handleSave() {
    await SettingsRepository.saveSettings(settings);
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveSuccess = true;
    toast.success('Preferences saved successfully');
    setTimeout(() => {
      saveSuccess = false;
      onClose();
    }, 600);
  }

  async function handleExportBackup() {
    try {
      const backup = await JsonExporter.exportAll();
      const jsonStr = JsonExporter.toJsonString(backup);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acitya_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full JSON backup downloaded');
    } catch {
      toast.error('Failed to export backup');
    }
  }

  let fileInputRef = $state<HTMLInputElement | null>(null);

  function triggerImportFileInput() {
    fileInputRef?.click();
  }

  async function handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await JsonImporter.importBackup(text);
      toast.success(
        `Imported ${res.notesImported} notes, ${res.highlightsImported} highlights, and ${res.collectionsImported} collections!`
      );
      input.value = '';
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed: corrupted or invalid file.');
      input.value = '';
    }
  }

  function requestClearAll() {
    isEraseModalOpen = true;
  }

  async function executeClearAll() {
    try {
      await clearAllLocalData();
      isEraseModalOpen = false;
      toast.info('All local data erased');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      toast.error('Failed to clear local data');
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" role="presentation" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()}>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Settings and Privacy" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3 class="modal-title">Settings & Privacy</h3>
        <button class="close-btn" aria-label="Close settings dialog" onclick={onClose}>✕</button>
      </div>

      <div class="modal-body">
        <!-- Appearance -->
        <section class="settings-section" aria-labelledby="section-appearance">
          <h4 id="section-appearance" class="section-title">Appearance & Behavior</h4>
          <div class="setting-row">
            <span class="setting-label">Theme Mode</span>
            <select class="setting-select" aria-label="Theme mode" bind:value={settings.theme}>
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>

          <div class="setting-row">
            <span class="setting-label">Default Highlight Color</span>
            <div class="color-picker-row" role="group" aria-label="Default highlight color selection">
              {#each HIGHLIGHT_COLORS as c}
                <button
                  class="color-pick-dot {settings.defaultHighlightColor === c.hex ? 'active' : ''}"
                  style="background-color: {c.hex};"
                  onclick={() => (settings.defaultHighlightColor = c.hex)}
                  title={c.name}
                  aria-label="Set default color {c.name}"
                ></button>
              {/each}
            </div>
          </div>

          <div class="setting-row">
            <span class="setting-label">Video Timestamp Offset</span>
            <div class="offset-slider-box">
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                aria-label="Video timestamp compensation offset in seconds"
                bind:value={settings.defaultTimestampOffset}
                class="slider"
              />
              <span class="offset-val">-{settings.defaultTimestampOffset}s</span>
            </div>
          </div>
        </section>

        <!-- AI Engine & Privacy Guard -->
        <section class="settings-section" aria-labelledby="section-ai">
          <h4 id="section-ai" class="section-title">AI Engine & Privacy Guard</h4>
          
          <div class="privacy-notice" role="note">
            🔒 <strong>Local-First Guarantee:</strong> Acitya Notes stores 100% of your notes and highlights locally on your computer in IndexedDB. No page content is ever sent to external cloud servers without your explicit opt-in below.
          </div>

          <div class="setting-row">
            <span class="setting-label">AI Engine</span>
            <select class="setting-select" aria-label="Select AI provider engine" bind:value={settings.ai.provider}>
              <option value="builtin">Chrome Built-in AI (Gemini Nano on-device)</option>
              <option value="cloud">Cloud LLM (OpenAI / Gemini Custom Key)</option>
              <option value="fallback">Local Heuristic Engine (100% Offline)</option>
            </select>
          </div>

          {#if settings.ai.provider === 'cloud'}
            <div class="cloud-settings-box">
              <label class="optin-checkbox-label">
                <input type="checkbox" bind:checked={settings.ai.optInCloudProcessing} />
                <span>I consent to sending selected text to the configured Cloud LLM provider</span>
              </label>

              {#if settings.ai.optInCloudProcessing}
                <div class="setting-field">
                  <span class="field-label">Cloud API Key</span>
                  <input
                    type="password"
                    placeholder="Enter your OpenAI or Gemini API key"
                    aria-label="Cloud API Key"
                    class="setting-input"
                    bind:value={settings.ai.cloudApiKey}
                  />
                </div>

                <div class="setting-field">
                  <span class="field-label">Model Name</span>
                  <input
                    type="text"
                    placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
                    aria-label="Model Name"
                    class="setting-input"
                    bind:value={settings.ai.cloudModel}
                  />
                </div>
              {/if}
            </div>
          {/if}
        </section>

        <!-- Data Management -->
        <section class="settings-section" aria-labelledby="section-data">
          <h4 id="section-data" class="section-title">Data Management & Backup</h4>
          <div class="actions-grid">
            <button class="action-btn" onclick={() => { onClose(); onReplayTour(); }}>
              ✨ Replay Onboarding Tour
            </button>
            <button class="action-btn" onclick={handleExportBackup}>
              📦 Export Full JSON Backup
            </button>
            <button class="action-btn" onclick={triggerImportFileInput}>
              📥 Import Backup (.json)
            </button>
            <input
              type="file"
              accept=".json,application/json"
              bind:this={fileInputRef}
              style="display: none;"
              onchange={handleFileSelected}
            />
            <button class="action-btn danger" onclick={requestClearAll}>
              🗑 Erase All Local Data
            </button>
          </div>
        </section>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" onclick={onClose}>Cancel</button>
        <button class="save-btn" onclick={handleSave}>
          {saveSuccess ? '✓ Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  </div>

  <!-- Safe Erasure Confirmation Modal with Challenge Phrase -->
  <ConfirmModal
    isOpen={isEraseModalOpen}
    title="Erase All Local Data"
    message="This will permanently delete all your local notes, highlights, transcripts, and screenshots stored in IndexedDB. This action cannot be reversed."
    requireChallengeText="DELETE"
    confirmText="Permanently Erase"
    isDanger={true}
    onConfirm={executeClearAll}
    onCancel={() => (isEraseModalOpen = false)}
  />
{/if}


<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  .modal-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 100%;
    max-width: 380px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .modal-title {
    font-size: 13.5px;
    font-weight: 600;
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 14px;
    cursor: pointer;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-title {
    font-size: 11.5px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .setting-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .setting-select, .setting-input {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11.5px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    outline: none;
  }

  .color-picker-row {
    display: flex;
    gap: 6px;
  }
  .color-pick-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .color-pick-dot.active {
    transform: scale(1.3);
    box-shadow: 0 0 0 2px var(--border-focus);
  }

  .offset-slider-box {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .slider {
    width: 90px;
    cursor: pointer;
  }
  .offset-val {
    font-family: var(--font-mono);
    font-size: 11px;
    color: #818cf8;
    width: 28px;
  }

  .privacy-notice {
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    line-height: 1.45;
    color: #c7d2fe;
  }

  .cloud-settings-box {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .optin-checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 11.5px;
    cursor: pointer;
  }
  .setting-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-label {
    font-size: 10.5px;
    color: var(--text-muted);
  }

  .actions-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .action-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11.5px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }
  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .action-btn.danger {
    color: #f87171;
  }
  .action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);
  }
  .cancel-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 10px;
  }
  .save-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
</style>
