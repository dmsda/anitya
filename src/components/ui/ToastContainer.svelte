<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toast, type ToastItem } from '../../lib/toast';

  let currentToasts = $state<ToastItem[]>([]);
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = toast.subscribe((items) => {
      currentToasts = items;
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

<div class="toast-container" aria-live="polite" aria-atomic="true">
  {#each currentToasts as item (item.id)}
    <div class="toast-pill {item.type}" role="status">
      <span class="toast-icon">
        {#if item.type === 'success'}
          ✓
        {:else if item.type === 'error'}
          ✕
        {:else if item.type === 'warning'}
          ⚠
        {:else}
          ℹ
        {/if}
      </span>
      <span class="toast-text">{item.message}</span>
      <button
        class="toast-close"
        onclick={() => toast.dismiss(item.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 52px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10001;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
    width: 90%;
    max-width: 320px;
  }

  .toast-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 11.5px;
    font-weight: 500;
    pointer-events: auto;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    animation: toastSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid transparent;
    width: auto;
    max-width: 100%;
  }

  @keyframes toastSlideDown {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .toast-pill.success {
    background: #064e3b;
    color: #a7f3d0;
    border-color: #059669;
  }
  .toast-pill.error {
    background: #7f1d1d;
    color: #fecaca;
    border-color: #dc2626;
  }
  .toast-pill.warning {
    background: #78350f;
    color: #fde68a;
    border-color: #d97706;
  }
  .toast-pill.info {
    background: #1e1b4b;
    color: #c7d2fe;
    border-color: #6366f1;
  }

  .toast-icon {
    font-weight: 700;
    font-size: 12px;
    line-height: 1;
  }

  .toast-text {
    flex: 1;
    line-height: 1.35;
    word-break: break-word;
  }

  .toast-close {
    background: transparent;
    border: none;
    color: inherit;
    opacity: 0.7;
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
  }
  .toast-close:hover {
    opacity: 1;
  }
</style>
