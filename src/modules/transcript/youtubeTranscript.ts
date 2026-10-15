import type { TranscriptSegment } from '../../schemas/types';
import { extractYouTubeVideoId } from '../video/youtubeDetector';

interface CaptionTrackInfo {
  baseUrl: string;
  name: { simpleText?: string; runs?: Array<{ text: string }> };
  vssId: string;
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

export class YouTubeTranscriptAdapter {
  /**
   * Fetches transcript segments for the current YouTube video.
   */
  static async extractTranscript(videoId?: string): Promise<{
    success: boolean;
    segments?: TranscriptSegment[];
    language?: string;
    error?: string;
  }> {
    const id = videoId || extractYouTubeVideoId();
    if (!id) {
      return { success: false, error: 'No YouTube video ID detected on this page.' };
    }

    try {
      // 1. Try finding caption tracks from page context / DOM
      const tracks = await this.findCaptionTracks(id);
      if (!tracks || tracks.length === 0) {
        // Fallback: check DOM text tracks
        const domSegments = this.extractFromDomTextTracks(id);
        if (domSegments.length > 0) {
          return { success: true, segments: domSegments, language: 'Auto-detected' };
        }
        return {
          success: false,
          error: 'No subtitles or captions available for this video.',
        };
      }

      // Prioritize English or first available track
      const selectedTrack =
        tracks.find((t) => t.languageCode.startsWith('en') || t.languageCode.startsWith('id')) || tracks[0];

      if (!selectedTrack) {
        return {
          success: false,
          error: 'No valid caption track found for this video.',
        };
      }

      // Fetch timedtext JSON3
      const jsonUrl = selectedTrack.baseUrl.includes('fmt=json3')
        ? selectedTrack.baseUrl
        : `${selectedTrack.baseUrl}&fmt=json3`;

      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Timedtext fetch failed with HTTP status ${response.status}`);
      }

      const data = await response.json();
      const segments: TranscriptSegment[] = [];

      if (data && Array.isArray(data.events)) {
        let segIdx = 0;
        for (const ev of data.events) {
          if (!ev.segs || !Array.isArray(ev.segs)) continue;
          const text = ev.segs
            .map((s: { utf8?: string }) => s.utf8 || '')
            .join('')
            .trim();
          if (!text || text === '\n') continue;

          const startMs = ev.tStartMs || 0;
          const durationMs = ev.dDurationMs || 2000;
          const endMs = startMs + durationMs;

          segments.push({
            id: `ts_${id}_${segIdx++}`,
            videoId: id,
            startMs,
            endMs,
            text,
          });
        }
      }

      if (segments.length === 0) {
        return {
          success: false,
          error: 'Captions track was found, but contained no readable text events.',
        };
      }

      return {
        success: true,
        segments,
        language: selectedTrack.languageCode,
      };
    } catch (err) {
      console.warn('[Acitya] YouTube transcript extraction failed:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unable to extract transcript from YouTube.',
      };
    }
  }

  /**
   * Discovers caption tracks from YouTube's page scripts or window objects.
   */
  private static async findCaptionTracks(videoId: string): Promise<CaptionTrackInfo[]> {
    // Check if ytInitialPlayerResponse is accessible on page window
    try {
      const anyWin = window as unknown as { ytInitialPlayerResponse?: { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrackInfo[] } } } };
      const tracks = anyWin.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(tracks) && tracks.length > 0) {
        return tracks;
      }
    } catch {
      // Content script isolated world might not read window globals directly
    }

    // Inspect script tags in the page for ytInitialPlayerResponse
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      if (content.includes('playerCaptionsTracklistRenderer') && content.includes('captionTracks')) {
        try {
          const match = content.match(/"captionTracks":\s*(\[[^\]]+\])/);
          if (match && match[1]) {
            const parsed = JSON.parse(match[1]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        } catch {
          // ignore parse error, continue
        }
      }
    }

    // Fallback: fetch YouTube watch page HTML directly
    try {
      const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { credentials: 'omit' });
      if (resp.ok) {
        const text = await resp.text();
        const match = text.match(/"captionTracks":\s*(\[[^\]]+\])/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // ignore
    }

    return [];
  }

  private static extractFromDomTextTracks(videoId: string): TranscriptSegment[] {
    const video = document.querySelector('video');
    if (!video || !video.textTracks || video.textTracks.length === 0) return [];

    const segments: TranscriptSegment[] = [];
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track && track.cues && track.cues.length > 0) {
        for (let j = 0; j < track.cues.length; j++) {
          const cue = track.cues[j] as VTTCue | undefined;
          if (!cue) continue;
          segments.push({
            id: `ts_${videoId}_${j}`,
            videoId,
            startMs: Math.round(cue.startTime * 1000),
            endMs: Math.round(cue.endTime * 1000),
            text: cue.text || '',
          });
        }
        break;
      }
    }
    return segments;
  }
}
