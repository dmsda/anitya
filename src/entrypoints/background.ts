import { NoteRepository } from '../repositories/noteRepository';

export default defineBackground(() => {
  console.log('[Acitya Notes] Service worker started.');

  // Set side panel to open on action click
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('[Acitya] Failed to set side panel behavior:', err);
    });
  }

  // Set up context menus on install
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'acitya_open_sidepanel',
        title: 'Open Acitya Notes Panel',
        contexts: ['action', 'page'],
      });

      chrome.contextMenus.create({
        id: 'acitya_clip_selection',
        title: 'Save Selection to Acitya Notes',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: 'acitya_highlight',
        title: 'Highlight Selected Text',
        contexts: ['selection'],
      });
    });
  });

  // Handle context menu clicks
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'acitya_open_sidepanel') {
      if (tab?.id && chrome.sidePanel?.open) {
        chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
          chrome.sidePanel.open({ windowId: tab.windowId });
        });
      }
    } else if (info.menuItemId === 'acitya_clip_selection' && info.selectionText) {
      const sourceUrl = tab?.url || '';
      const sourceTitle = tab?.title || 'Web Clipping';
      let domain = '';
      try {
        if (sourceUrl) domain = new URL(sourceUrl).hostname;
      } catch {
        // ignore
      }

      await NoteRepository.create({
        title: `Selection: ${info.selectionText.slice(0, 45)}...`,
        contentMarkdown: `> ${info.selectionText}\n\n*Captured from [${sourceTitle}](${sourceUrl})*`,
        sourceUrl,
        sourceTitle,
        sourceDomain: domain,
        type: 'web',
        tags: ['web-clip', domain].filter(Boolean),
      });

      // Try opening side panel so user can see their note
      if (tab?.id && chrome.sidePanel?.open) {
        chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      }
    } else if (info.menuItemId === 'acitya_highlight' && tab?.id) {
      // Send message to content script to highlight current selection
      chrome.tabs.sendMessage(tab.id, { type: 'CREATE_HIGHLIGHT_FROM_SELECTION' }).catch(() => {});
    }
  });

  // Message router for runtime messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'OPEN_SIDE_PANEL') {
      if (!chrome.sidePanel?.open) {
        sendResponse({ success: false, error: 'SidePanel API unavailable' });
        return false;
      }

      const tabId = sender.tab?.id;
      const windowId = sender.tab?.windowId;

      if (tabId) {
        chrome.sidePanel
          .open({ tabId })
          .catch(() => {
            if (windowId) return chrome.sidePanel.open({ windowId });
          })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true;
      }

      // Handle non-tab context (e.g. extension popup)
      chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
        if (activeTab?.id) {
          chrome.sidePanel
            .open({ tabId: activeTab.id })
            .catch(() => {
              if (activeTab.windowId) return chrome.sidePanel.open({ windowId: activeTab.windowId });
            })
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      }).catch((err) => sendResponse({ success: false, error: String(err) }));

      return true;
    }
  });
});
