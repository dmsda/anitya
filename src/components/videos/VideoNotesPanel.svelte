<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { VideoNote, Screenshot, PageMetadata } from '../../schemas/types';
  import { VideoNoteRepository } from '../../repositories/videoNoteRepository';
  import { ScreenshotRepository } from '../../repositories/screenshotRepository';
  import { SettingsRepository } from '../../repositories/settingsRepository';
  import { sendToActiveTab } from '../../services/messaging/messages';
  import { formatTimestamp, calculateCompensatedTime } from '../../modules/video/timestampHelper';
  import ConfirmModal from '../ui/ConfirmModal.svelte';
  import { toast } from '../../lib/toast';

  let {
    activePageMeta = null,
  }: {
    activePageMeta: PageMetadata | null;
  } = $props();

  let videoNotes = $state<VideoNote[]>([]);
  let currentVideoTime = $state(0);
  let videoDuration = $state(0);
  let isVideoPlaying = $state(false);
  let noteText = $state('');
  let reactionOffset = $state(5);
  let capturedScreenshot = $state<{ blob: Blob; dataUrl: string; width: number; height: number } | null>(null);
  let isCapturingFrame = $state(false);
  let captureError = $state<string | null>(null);
  let isDeleteModalOpen = $state(false);
  let noteToDeleteId = $state<string | null>(null);

  // Poll video state every 1 second when active
  let pollInterval: any = null;

  onMount(async () => {
    const settings = await SettingsRepository.getSettings();
    reactionOffset = settings.defaultTimestampOffset ?? 5;
    loadVideoNotes();

    pollInterval = setInterval(updateVideoState, 1000);
    updateVideoState();
  });

  onDestroy(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  $effect(() => {
    if (activePageMeta?.videoId) {
      loadVideoNotes();
    }
  });

  async function updateVideoState() {
    if (!activePageMeta?.isVideo) return;
    try {
      const state = await sendToActiveTab<undefined, { videoId: string; currentTime: number; duration: number; isPlaying: boolean }>({
        type: 'GET_VIDEO_STATE',
      });
      if (state) {
        currentVideoTime = state.currentTime;
        videoDuration = state.duration;
        isVideoPlaying = state.isPlaying;
      }
    } catch {
      // ignore
    }
  }

  async function loadVideoNotes() {
    if (!activePageMeta?.videoId) {
      videoNotes = [];
      return;
    }
    try {
      videoNotes = await VideoNoteRepository.getByVideoId(activePageMeta.videoId);
    } catch (e) {
      console.warn('Failed to load video notes:', e);
    }
  }

  let compensatedTime = $derived.by(() => {
    return calculateCompensatedTime(currentVideoTime, reactionOffset, videoDuration);
  });

  async function captureScreenshot() {
    isCapturingFrame = true;
    captureError = null;
    try {
      const res = await sendToActiveTab<undefined, { success: boolean; dataUrl?: string; width?: number; height?: number; error?: string }>({
        type: 'CAPTURE_VIDEO_SCREENSHOT',
      });

      if (res?.success && res.dataUrl) {
        const blobResp = await fetch(res.dataUrl);
        const blob = await blobResp.blob();

        capturedScreenshot = {
          blob,
          dataUrl: res.dataUrl,
          width: res.width || 640,
          height: res.height || 360,
        };
        toast.success(`Captured video frame at ${formatTimestamp(compensatedTime)}`);
      } else {
        captureError = res?.error || 'Screenshot capture not supported on this video stream.';
        toast.warning(captureError);
      }
    } catch {
      captureError = 'Failed to communicate with video player.';
      toast.error(captureError);
    } finally {
      isCapturingFrame = false;
    }
  }

  async function saveVideoNote() {
    if (!noteText.trim() && !capturedScreenshot) return;
    if (!activePageMeta?.videoId) return;

    let screenshotId: string | undefined = undefined;

    if (capturedScreenshot) {
      const shot = await ScreenshotRepository.save({
        blob: capturedScreenshot.blob,
        width: capturedScreenshot.width,
        height: capturedScreenshot.height,
        timestampSeconds: compensatedTime,
      });
      screenshotId = shot.id;
    }

    const savedText = noteText.trim() || 'Frame screenshot';
    await VideoNoteRepository.create({
      noteId: `vnote_grp_${activePageMeta.videoId}`,
      videoId: activePageMeta.videoId,
      videoUrl: activePageMeta.url,
      timestampSeconds: compensatedTime,
      timestampOffset: reactionOffset,
      text: savedText,
      screenshotId,
    });

    toast.success(`Saved note at ${formatTimestamp(compensatedTime)}`);
    noteText = '';
    capturedScreenshot = null;
    captureError = null;
    loadVideoNotes();
  }

  async function seekTo(seconds: number) {
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

  function requestDeleteNote(id: string) {
    noteToDeleteId = id;
    isDeleteModalOpen = true;
  }

  async function executeDeleteNote() {
    if (!noteToDeleteId) return;
    try {
      await VideoNoteRepository.delete(noteToDeleteId);
      toast.info('Video note deleted');
      loadVideoNotes();
    } catch {
      toast.error('Failed to delete note');
    } finally {
      isDeleteModalOpen = false;
      noteToDeleteId = null;
    }
  }
</script>

<div class="video-notes-panel">
  {#if !activePageMeta?.isVideo}
    <div class="not-video-banner">
      <img src="/assets/illustrations/empty-video-notes.svg" alt="No video" class="banner-illu" />
      <p class="banner-title">No Video Detected</p>
      <p class="banner-desc">Open a YouTube video page to create timestamped notes, take screenshots, and read transcripts.</p>
    </div>
  {:else}
    <!-- Video Info Header -->
    <div class="video-status-card">
      <div class="status-left">
        <span class="video-badge {isVideoPlaying ? 'playing' : 'paused'}" role="status">
          {isVideoPlaying ? '▶ Playing' : '⏸ Paused'}
        </span>
        <span class="live-clock" aria-label="Current and total video duration">
          {formatTimestamp(currentVideoTime)} / {formatTimestamp(videoDuration)}
        </span>
      </div>
      <div class="status-right">
        <span
          class="offset-label"
          title="Reaction compensation: automatically offsets timestamps back by {reactionOffset}s so notes match the event you saw"
        >
          Offset: -{reactionOffset}s ℹ
        </span>
      </div>
    </div>

    <!-- New Video Note Creator Box -->
    <div class="create-note-box">
      <div class="creator-top">
        <button
          class="target-timestamp"
          type="button"
          onclick={() => seekTo(compensatedTime)}
          title="Click to seek player to compensated timestamp"
          aria-label="Current compensated timestamp {formatTimestamp(compensatedTime)}"
        >
          ⏱ {formatTimestamp(compensatedTime)}
        </button>

        <button
          class="frame-capture-btn"
          disabled={isCapturingFrame}
          onclick={captureScreenshot}
          title="Take screenshot frame at this timestamp"
          aria-label="Capture video frame screenshot"
        >
          📷 {isCapturingFrame ? 'Capturing...' : 'Capture Frame'}
        </button>
      </div>

      {#if captureError}
        <div class="capture-error-msg" role="alert">⚠ {captureError}</div>
      {/if}

      {#if capturedScreenshot}
        <div class="screenshot-preview">
          <img src={capturedScreenshot.dataUrl} alt="Captured video frame" class="thumb-img" />
          <button
            class="remove-thumb-btn"
            onclick={() => (capturedScreenshot = null)}
            aria-label="Remove captured screenshot"
          >
            ✕
          </button>
        </div>
      {/if}

      <div class="input-row">
        <input
          type="text"
          class="note-input"
          placeholder="Add note at {formatTimestamp(compensatedTime)}... (Press Enter to save)"
          aria-label="Note text at timestamp {formatTimestamp(compensatedTime)}"
          bind:value={noteText}
          onkeydown={(e) => e.key === 'Enter' && saveVideoNote()}
        />
        <button
          class="save-btn"
          onclick={saveVideoNote}
          aria-label="Save video note"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Timeline of Video Notes -->
    <div class="notes-timeline" role="feed" aria-label="Video Notes Timeline">
      {#if videoNotes.length === 0}
        <div class="empty-timeline">
          <p>No notes for this video yet.</p>
          <p class="sub">Add key insights or screenshots while watching!</p>
        </div>
      {:else}
        {#each videoNotes as vn (vn.id)}
          <div class="timeline-item">
            <button
              class="time-pill"
              onclick={() => seekTo(vn.timestampSeconds)}
              title="Seek video to {formatTimestamp(vn.timestampSeconds)}"
              aria-label="Seek video to {formatTimestamp(vn.timestampSeconds)}"
            >
              ⏱ {formatTimestamp(vn.timestampSeconds)}
            </button>
            <div class="item-body">
              <p class="item-text">{vn.text}</p>
            </div>
            <button
              class="del-btn"
              title="Delete note"
              aria-label="Delete video note"
              onclick={() => requestDeleteNote(vn.id)}
            >
              ✕
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      isOpen={isDeleteModalOpen}
      title="Delete Video Note"
      message="Are you sure you want to delete this video timestamp note?"
      confirmText="Delete"
      isDanger={true}
      onConfirm={executeDeleteNote}
      onCancel={() => {
        isDeleteModalOpen = false;
        noteToDeleteId = null;
      }}
    />
  {/if}
</div>

<style>

  .video-notes-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    gap: 10px;
    background: var(--bg-primary);
  }

  .not-video-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 30px 16px;
    color: var(--text-muted);
  }
  .banner-illu {
    width: 120px;
    height: 90px;
    margin-bottom: 8px;
    object-fit: contain;
  }
  .banner-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .banner-desc {
    font-size: 12px;
    margin-top: 4px;
    max-width: 240px;
  }

  .video-status-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
  }
  .status-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .video-badge {
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }
  .video-badge.playing {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .video-badge.paused {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
  }
  .live-clock {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--text-primary);
    font-weight: 500;
  }
  .offset-label {
    font-size: 10.5px;
    color: var(--text-muted);
  }

  .create-note-box {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    padding: 10px;
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .creator-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .target-timestamp {
    background: rgba(99, 102, 241, 0.2);
    color: #818cf8;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .target-timestamp:hover {
    background: var(--accent-primary);
    color: white;
  }
  .frame-capture-btn {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.15s;
  }
  .frame-capture-btn:hover:not(:disabled) {
    border-color: var(--border-focus);
    background: rgba(99, 102, 241, 0.1);
  }

  .capture-error-msg {
    font-size: 11px;
    color: #f87171;
    background: rgba(239, 68, 68, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .screenshot-preview {
    position: relative;
    border-radius: var(--radius-sm);
    overflow: hidden;
    max-height: 120px;
  }
  .thumb-img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
  }
  .remove-thumb-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 11px;
    cursor: pointer;
  }

  .input-row {
    display: flex;
    gap: 6px;
  }
  .note-input {
    flex: 1;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 12px;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    outline: none;
  }
  .note-input:focus {
    border-color: var(--border-focus);
  }
  .save-btn {
    background: var(--accent-primary);
    color: white;
    border: none;
    font-size: 11.5px;
    font-weight: 600;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .notes-timeline {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    transition: background 0.15s;
  }
  .timeline-item:hover {
    background: var(--bg-tertiary);
  }
  .time-pill {
    background: rgba(99, 102, 241, 0.15);
    color: #818cf8;
    border: none;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .time-pill:hover {
    background: var(--accent-primary);
    color: white;
  }
  .item-body {
    flex: 1;
  }
  .item-text {
    font-size: 12px;
    color: var(--text-primary);
    line-height: 1.4;
  }
  .del-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
  }
  .del-btn:hover {
    color: #f87171;
  }

  .empty-timeline {
    text-align: center;
    padding: 30px 10px;
    color: var(--text-muted);
    font-size: 12.5px;
  }
  .empty-timeline .sub {
    font-size: 11px;
    margin-top: 4px;
  }
</style>
