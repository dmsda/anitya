import type { Highlight, PageMetadata, TranscriptSegment } from '../../schemas/types';

export type MessageType =
  | 'GET_PAGE_METADATA'
  | 'CREATE_HIGHLIGHT'
  | 'RESTORE_HIGHLIGHTS'
  | 'SCROLL_TO_HIGHLIGHT'
  | 'DELETE_HIGHLIGHT_DOM'
  | 'GET_VIDEO_STATE'
  | 'SEEK_VIDEO'
  | 'CAPTURE_VIDEO_SCREENSHOT'
  | 'EXTRACT_TRANSCRIPT'
  | 'ACTIVE_TAB_CHANGED'
  | 'OPEN_SIDE_PANEL';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface VideoStatePayload {
  videoId: string;
  currentTime: number;
  duration: number;
  title: string;
  isPlaying: boolean;
}

export interface SeekVideoPayload {
  seconds: number;
}

export interface CaptureScreenshotResponse {
  success: boolean;
  dataUrl?: string;
  width?: number;
  height?: number;
  timestampSeconds?: number;
  error?: string;
}

export interface ExtractTranscriptResponse {
  success: boolean;
  segments?: TranscriptSegment[];
  error?: string;
}

/**
 * Safe helper to send message to the active tab's content script
 */
export async function sendToActiveTab<T = unknown, R = unknown>(message: ExtensionMessage<T>): Promise<R | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      return null;
    }
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response as R;
  } catch (err) {
    // Tab might not have content script loaded or restricted page
    return null;
  }
}

/**
 * Safe helper to send message to background or other extension contexts
 */
export async function sendExtensionMessage<T = unknown, R = unknown>(message: ExtensionMessage<T>): Promise<R | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime) return null;
    const response = await chrome.runtime.sendMessage(message);
    return response as R;
  } catch (err) {
    return null;
  }
}
