<script lang="ts">
  let {
    isOpen = false,
    onComplete = () => {},
  }: {
    isOpen: boolean;
    onComplete: () => void;
  } = $props();

  let currentStep = $state(0);

  const steps = [
    {
      title: 'Welcome to Acitya Notes',
      subtitle: 'Your Second Brain, Right in Your Browser',
      illustration: '/assets/illustrations/welcome-onboarding.svg',
      description:
        'Acitya (Ilmu Pengetahuan) empowers you to capture, understand, and organize knowledge from articles, PDFs, and YouTube videos without ever leaving your workflow.',
    },
    {
      title: 'Quick Notes & Web Clipper',
      subtitle: 'Capture Thoughts & Articles Instantly',
      illustration: '/assets/illustrations/empty-notes.svg',
      description:
        'Write in full Markdown with live preview and autosave. One-click clip articles cleanly and export anytime to Obsidian-compatible Markdown with YAML front matter.',
    },
    {
      title: 'Precision Web Highlighter',
      subtitle: 'W3C Web Annotation Standard',
      illustration: '/assets/illustrations/empty-highlights.svg',
      description:
        'Select any sentence on the web to trigger our isolated Shadow DOM floating toolbar. Choose from 5 curated colors, add personal comments, and jump straight to the exact text anytime.',
    },
    {
      title: 'YouTube Video Notetaker',
      subtitle: 'Two-Way Timestamp Navigation',
      illustration: '/assets/illustrations/empty-video-notes.svg',
      description:
        'Take notes while watching lectures with automated human reaction time compensation (-5s). Click any timestamp to jump the video, capture crisp frame screenshots, and search captions.',
    },
    {
      title: 'Hybrid AI Assistant',
      subtitle: 'Summarize, Extract & Grounded Q&A',
      illustration: '/assets/illustrations/ai-processing.svg',
      description:
        'Summarize long articles, distill action items, generate study flashcards, and ask questions grounded strictly in your saved notes using on-device Gemini Nano or custom Cloud LLMs.',
    },
    {
      title: 'Local-First Privacy Guarantee',
      subtitle: 'Zero Data Leaks by Default',
      illustration: '/assets/illustrations/privacy-shield.svg',
      description:
        '100% of your notes, highlights, and screenshots remain securely stored on your device in IndexedDB. No page content is ever transmitted to external servers without your opt-in.',
    },
  ];

  let currentStepData = $derived(steps[currentStep] || steps[0]!);

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      finishOnboarding();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }

  function finishOnboarding() {
    try {
      localStorage.setItem('acitya_onboarding_completed', 'true');
    } catch {}
    onComplete();
  }
</script>

{#if isOpen}
  <div class="onboarding-backdrop" role="presentation">
    <div class="onboarding-card" role="dialog" aria-modal="true" aria-label="Acitya Onboarding Tour" tabindex="-1">
      <!-- Progress Bar -->
      <div class="progress-bar-container">
        <div class="progress-fill" style="width: {((currentStep + 1) / steps.length) * 100}%;"></div>
      </div>

      <!-- Header with Step Indicator -->
      <div class="card-header">
        <span class="step-badge">Step {currentStep + 1} of {steps.length}</span>
        <button class="skip-btn" onclick={finishOnboarding}>Skip Tour</button>
      </div>

      <!-- Illustration -->
      <div class="illustration-box">
        <img
          src={currentStepData.illustration}
          alt={currentStepData.title}
          class="illustration-img"
        />
      </div>

      <!-- Step Content -->
      <div class="step-content">
        <h3 class="step-title">{currentStepData.title}</h3>
        <span class="step-subtitle">{currentStepData.subtitle}</span>
        <p class="step-description">{currentStepData.description}</p>
      </div>

      <!-- Dot Navigation Indicator -->
      <div class="dots-row">
        {#each steps as _, idx}
          <span class="dot {idx === currentStep ? 'active' : ''}"></span>
        {/each}
      </div>

      <!-- Footer Action Buttons -->
      <div class="card-footer">
        {#if currentStep > 0}
          <button class="nav-btn secondary" onclick={prevStep}>Back</button>
        {:else}
          <div></div>
        {/if}

        <button class="nav-btn primary" onclick={nextStep}>
          {currentStep === steps.length - 1 ? 'Get Started' : 'Next →'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .onboarding-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(9, 13, 22, 0.85);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
  }

  .onboarding-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-md);
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .progress-bar-container {
    width: 100%;
    height: 3px;
    background: #1e293b;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent-gradient);
    transition: width 0.3s ease;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 0 16px;
  }
  .step-badge {
    font-size: 10.5px;
    font-weight: 600;
    color: #818cf8;
    background: rgba(99, 102, 241, 0.15);
    padding: 2px 8px;
    border-radius: var(--radius-full);
  }
  .skip-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
  }
  .skip-btn:hover {
    color: var(--text-primary);
  }

  .illustration-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    height: 130px;
  }
  .illustration-img {
    max-width: 100%;
    max-height: 120px;
    object-fit: contain;
  }

  .step-content {
    padding: 0 20px 14px 20px;
    text-align: center;
  }
  .step-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .step-subtitle {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #818cf8;
    margin: 3px 0 10px 0;
  }
  .step-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.55;
    margin: 0;
  }

  .dots-row {
    display: flex;
    justify-content: center;
    gap: 5px;
    padding-bottom: 12px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #334155;
    transition: background 0.2s, width 0.2s;
  }
  .dot.active {
    background: var(--accent-primary);
    width: 16px;
    border-radius: 4px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #090d16;
    border-top: 1px solid var(--border-subtle);
  }
  .nav-btn {
    font-size: 11.5px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }
  .nav-btn.primary {
    background: var(--accent-gradient);
    color: white;
    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
  }
  .nav-btn.primary:hover {
    opacity: 0.95;
    transform: translateY(-1px);
  }
  .nav-btn.secondary {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
  .nav-btn.secondary:hover {
    color: var(--text-primary);
  }
</style>
