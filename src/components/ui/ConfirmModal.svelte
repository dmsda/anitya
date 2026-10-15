<script lang="ts">
  let {
    isOpen = false,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    requireChallengeText = '',
    onConfirm = () => {},
    onCancel = () => {},
  }: {
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    requireChallengeText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();

  let challengeInput = $state('');
  let isChallengeSatisfied = $derived.by(() => {
    if (!requireChallengeText) return true;
    return challengeInput.trim() === requireChallengeText;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Enter' && isChallengeSatisfied) {
      e.stopPropagation();
      confirmAction();
    }
  }

  function confirmAction() {
    if (!isChallengeSatisfied) return;
    challengeInput = '';
    onConfirm();
  }
</script>

{#if isOpen}
  <div
    class="confirm-backdrop"
    role="presentation"
    onclick={onCancel}
    onkeydown={handleKeydown}
  >
    <div
      class="confirm-card"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <div class="confirm-header {isDanger ? 'danger' : ''}">
        <span class="icon-indicator">{isDanger ? '⚠' : 'ℹ'}</span>
        <h3 id="confirm-dialog-title" class="confirm-title">{title}</h3>
      </div>

      <div class="confirm-body">
        <p id="confirm-dialog-desc" class="confirm-desc">{message}</p>

        {#if requireChallengeText}
          <div class="challenge-box">
            <label for="confirm-challenge-input" class="challenge-label">
              Type <strong class="challenge-word">{requireChallengeText}</strong> to confirm:
            </label>
            <input
              id="confirm-challenge-input"
              type="text"
              class="challenge-input"
              placeholder={requireChallengeText}
              bind:value={challengeInput}
            />
          </div>
        {/if}
      </div>

      <div class="confirm-footer">
        <button class="btn secondary" onclick={onCancel}>
          {cancelText}
        </button>
        <button
          class="btn {isDanger ? 'danger' : 'primary'}"
          disabled={!isChallengeSatisfied}
          onclick={confirmAction}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(9, 13, 22, 0.82);
    backdrop-filter: blur(4px);
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .confirm-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 100%;
    max-width: 320px;
    box-shadow: var(--shadow-lg);
    animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .confirm-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .confirm-header.danger {
    background: rgba(239, 68, 68, 0.08);
    border-bottom-color: rgba(239, 68, 68, 0.2);
  }

  .icon-indicator {
    font-size: 14px;
    color: var(--accent-primary);
  }
  .confirm-header.danger .icon-indicator {
    color: #ef4444;
  }

  .confirm-title {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
    color: var(--text-primary);
  }

  .confirm-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .confirm-desc {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
    margin: 0;
  }

  .challenge-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-tertiary);
    padding: 8px 10px;
    border-radius: var(--radius-sm);
  }
  .challenge-label {
    font-size: 11px;
    color: var(--text-secondary);
  }
  .challenge-word {
    color: #f87171;
    letter-spacing: 0.05em;
  }
  .challenge-input {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-size: 12px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    outline: none;
    font-family: var(--font-mono);
  }
  .challenge-input:focus {
    border-color: #ef4444;
  }

  .confirm-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-subtle);
  }

  .btn {
    font-size: 11.5px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: none;
    transition: all var(--transition-fast);
  }
  .btn.secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
  .btn.secondary:hover {
    color: var(--text-primary);
  }
  .btn.primary {
    background: var(--accent-primary);
    color: white;
  }
  .btn.danger {
    background: #dc2626;
    color: white;
  }
  .btn.danger:hover:not(:disabled) {
    background: #b91c1c;
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
