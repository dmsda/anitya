import { FloatingToolbar } from '../modules/highlighter/floatingToolbar';
import { restorePageHighlights, removeHighlightFromDom, scrollToHighlight } from '../modules/highlighter/domHighlighter';
import { HighlightRepository } from '../repositories/highlightRepository';
import { PageExtractor } from '../modules/clipper/pageExtractor';
import { getCurrentVideoState, seekYouTubeVideo, isYouTubePage } from '../modules/video/youtubeDetector';
import { captureVideoFrame } from '../modules/video/frameCapture';
import { YouTubeTranscriptAdapter } from '../modules/transcript/youtubeTranscript';
import type { ExtensionMessage } from '../services/messaging/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[Acitya Notes] Content script active on:', window.location.href);

    // Initialize non-intrusive floating highlight toolbar
    const toolbar = new FloatingToolbar();

    // Auto-restore highlights for this URL
    async function initHighlights() {
      try {
        const highlights = await HighlightRepository.getBySourceUrl(window.location.href);
        if (highlights.length > 0) {
          const { restored, unresolved } = restorePageHighlights(highlights);
          // Update status of unresolved ones
          for (const un of unresolved) {
            if (un.anchorStatus !== 'unresolved') {
              await HighlightRepository.updateStatus(un.id, 'unresolved');
            }
          }
        }
      } catch (err) {
        console.warn('[Acitya] Failed to restore highlights:', err);
      }
    }

    if (document.readyState === 'complete') {
      initHighlights();
    } else {
      window.addEventListener('load', initHighlights);
    }

    // Handle SPA navigation (e.g. YouTube, Twitter, GitHub)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(initHighlights, 1000);
      }
    });
    observer.observe(document, { subtree: true, childList: true });

    // Listen for extension messages
    chrome.runtime.onMessage.addListener((message: ExtensionMessage<any>, sender, sendResponse) => {
      if (!message || !message.type) return false;

      switch (message.type) {
        case 'GET_PAGE_METADATA': {
          const meta = PageExtractor.extractMetadata();
          sendResponse(meta);
          return true;
        }

        case 'GET_VIDEO_STATE': {
          const state = getCurrentVideoState();
          sendResponse(state);
          return true;
        }

        case 'SEEK_VIDEO': {
          const seconds = message.payload?.seconds ?? 0;
          const success = seekYouTubeVideo(seconds);
          sendResponse({ success });
          return true;
        }

        case 'CAPTURE_VIDEO_SCREENSHOT': {
          captureVideoFrame().then((res) => {
            sendResponse(res);
          });
          return true; // async response
        }

        case 'EXTRACT_TRANSCRIPT': {
          YouTubeTranscriptAdapter.extractTranscript(message.payload?.videoId).then((res) => {
            sendResponse(res);
          });
          return true; // async response
        }

        case 'SCROLL_TO_HIGHLIGHT': {
          const hlId = message.payload?.highlightId;
          const success = hlId ? scrollToHighlight(hlId) : false;
          sendResponse({ success });
          return true;
        }

        case 'DELETE_HIGHLIGHT_DOM': {
          const hlId = message.payload?.highlightId;
          if (hlId) removeHighlightFromDom(hlId);
          sendResponse({ success: true });
          return true;
        }

        case 'RESTORE_HIGHLIGHTS': {
          initHighlights().then(() => sendResponse({ success: true }));
          return true;
        }

        default:
          return false;
      }
    });
  },
});
