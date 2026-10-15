<script lang="ts">
  import { onMount } from 'svelte';
  import type { TranscriptSegment, PageMetadata } from '../../schemas/types';
  import { TranscriptRepository } from '../../repositories/transcriptRepository';
  import { TranscriptExporters } from '../../modules/transcript/exporters';
  import { sendToActiveTab } from '../../services/messaging/messages';
  import { formatTimestamp } from '../../modules/video/timestampHelper';
  import { toast } from '../../lib/toast';

  let {
    activePageMeta = null,
  }: {
    activePageMeta: PageMetadata | null;
  } = $props();

  let segments = $state<TranscriptSegment[]>([]);
  let searchQuery = $state('');
  let isLoading = $state(false);
  let statusMessage = $state<string | null>(null);

  onMount(() => {
    if (activePageMeta?.videoId) {
      loadSavedTranscript();
    }
  });

  $effect(() => {
    if (activePageMeta?.videoId) {
      loadSavedTranscript();
    }
  });

  async function loadSavedTranscript() {
    if (!activePageMeta?.videoId) return;
    try {
      const saved = await TranscriptRepository.getByVideoId(activePageMeta.videoId);
      if (saved.length > 0) {
        segments = saved;
      }
    } catch (e) {
      console.warn('Failed to load saved transcript:', e);
    }
  }

  async function extractTranscript() {
    if (!activePageMeta?.videoId) return;

    isLoading = true;
    statusMessage = 'Extracting captions from video...';
    try {
      const res = await sendToActiveTab<{ videoId: string }, { success: boolean; segments?: TranscriptSegment[]; error?: string }>({
        type: 'EXTRACT_TRANSCRIPT',
        payload: { videoId: activePageMeta.videoId },
      });

      if (res?.success && res.segments && res.segments.length > 0) {
        segments = await TranscriptRepository.saveBatch(activePageMeta.videoId, res.segments);
        statusMessage = `Successfully extracted ${segments.length} segments!`;
        toast.success(`Extracted ${segments.length} transcript segments`);
        setTimeout(() => (statusMessage = null), 2500);
      } else {
        statusMessage = res?.error || 'No subtitles or captions available for this video.';
        toast.warning(statusMessage);
      }
    } catch {
      statusMessage = 'Failed to extract transcript.';
      toast.error(statusMessage);
    } finally {
      isLoading = false;
    }
  }

  let filteredSegments = $derived.by(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  });

  async function jumpToSegment(seg: TranscriptSegment) {
    const seconds = seg.startMs / 1000;
    try {
      await sendToActiveTab({
        type: 'SEEK_VIDEO',
        payload: { seconds },
      });
      toast.info(`Seeking video to ${formatTimestamp(seconds)}`);
    } catch {
      toast.error('Could not seek video');
    }
  }

  function exportVtt() {
    try {
      const content = TranscriptExporters.toVtt(segments);
      TranscriptExporters.downloadFile(content, `transcript_${activePageMeta?.videoId || 'video'}.vtt`, 'text/vtt');
      toast.success('Downloaded VTT captions');
    } catch {
      toast.error('Failed to export VTT');
    }
  }

  function exportSrt() {
    try {
      const content = TranscriptExporters.toSrt(segments);
      TranscriptExporters.downloadFile(content, `transcript_${activePageMeta?.videoId || 'video'}.srt`, 'text/plain');
      toast.success('Downloaded SRT captions');
    } catch {
      toast.error('Failed to export SRT');
    }
  }

  function exportMarkdown() {
    try {
      const content = TranscriptExporters.toMarkdown(segments, activePageMeta?.title, activePageMeta?.url);
      TranscriptExporters.downloadFile(content, `transcript_${activePageMeta?.videoId || 'video'}.md`, 'text/markdown');
      toast.success('Downloaded Markdown transcript');
    } catch {
      toast.error('Failed to export Markdown');
    }
  }
</script>

<div class="transcript-panel">
  <!-- Controls Bar -->
  <div class="controls-bar">
    {#if segments.length === 0}
      <button
        class="extract-btn primary"
        disabled={isLoading || !activePageMeta?.isVideo}
        onclick={extractTranscript}
        aria-label="Extract video captions and subtitles"
      >
        {isLoading ? '⏳ Extracting...' : '📄 Extract Video Transcript'}
      </button>
    {:else}
      <input
        type="text"
        class="search-input"
        placeholder="Search transcript ({filteredSegments.length} segments)..."
        aria-label="Search transcript segments"
        bind:value={searchQuery}
      />
      <div class="export-dropdown" role="group" aria-label="Export transcript formats">
        <button class="export-btn" title="Export as WebVTT" aria-label="Export VTT" onclick={exportVtt}>VTT</button>
        <button class="export-btn" title="Export as SubRip SRT" aria-label="Export SRT" onclick={exportSrt}>SRT</button>
        <button class="export-btn" title="Export as Markdown" aria-label="Export Markdown" onclick={exportMarkdown}>MD</button>
        <button class="re-extract-btn" title="Re-extract captions" aria-label="Refresh transcript" onclick={extractTranscript}>⟳</button>
      </div>
    {/if}
  </div>

  {#if statusMessage}
    <div class="status-banner {statusMessage.includes('Success') ? 'success' : 'info'}" role="status">
      {statusMessage}
    </div>
  {/if}

  <!-- Segment List -->
  <div class="segments-list" role="feed" aria-label="Synchronized captions list">
    {#if segments.length === 0}
      <div class="empty-state">
        <img src="/assets/illustrations/no-transcript.svg" alt="No transcript" class="empty-illu" />
        <p class="empty-title">Transcript Not Extracted</p>
        <p class="empty-desc">
          Click "Extract Video Transcript" to load synchronized subtitles and captions.
        </p>
      </div>
    {:else if filteredSegments.length === 0}
      <div class="empty-state">
        <p class="empty-title">No matching text found</p>
      </div>
    {:else}
      {#each filteredSegments as seg (seg.id)}
        <button
          class="segment-row"
          type="button"
          onclick={() => jumpToSegment(seg)}
          aria-label="Seek to {formatTimestamp(seg.startMs / 1000)}: {seg.text}"
        >
          <span class="time-tag">
            {formatTimestamp(seg.startMs / 1000)}
          </span>
          <p class="segment-text">{seg.text}</p>
        </button>
      {/each}
    {/if}
  </div>
</div>


<style>
  .transcript-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    gap: 8px;
    background: var(--bg-primary);
  }

  .controls-bar {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .extract-btn {
    flex: 1;
    background: var(--accent-primary);
    color: white;
    border: none;
    font-size: 12px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.15s;
  }
  .extract-btn:hover:not(:disabled) {
    background: var(--accent-primary-hover);
  }
  .extract-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .search-input {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11.5px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    outline: none;
  }
  .search-input:focus {
    border-color: var(--border-focus);
  }

  .export-dropdown {
    display: flex;
    gap: 3px;
  }
  .export-btn, .re-extract-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 600;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
  }
  .export-btn:hover, .re-extract-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-focus);
  }

  .status-banner {
    font-size: 11px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }
  .status-banner.success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .status-banner.info {
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
  }

  .segments-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .segment-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background 0.1s;
  }
  .segment-row:hover {
    background: var(--bg-secondary);
  }

  .time-tag {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: #818cf8;
    background: rgba(99, 102, 241, 0.1);
    padding: 1px 5px;
    border-radius: 3px;
    white-space: nowrap;
    margin-top: 2px;
  }

  .segment-text {
    font-size: 12px;
    color: var(--text-primary);
    line-height: 1.45;
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
