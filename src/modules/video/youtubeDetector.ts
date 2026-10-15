import type { VideoStatePayload } from '../../services/messaging/messages';

export function isYouTubePage(url: string = window.location.href): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname.includes('youtube.com') && (u.pathname === '/watch' || u.pathname.startsWith('/embed/'))) ||
      u.hostname === 'youtu.be'
    );
  } catch {
    return false;
  }
}

export function extractYouTubeVideoId(url: string = window.location.href): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/embed/')[1]?.split('?')[0] || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getYouTubeVideoElement(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video.html5-main-video') || document.querySelector<HTMLVideoElement>('video');
}

export function getCurrentVideoState(): VideoStatePayload | null {
  const videoId = extractYouTubeVideoId();
  if (!videoId) return null;

  const video = getYouTubeVideoElement();
  if (!video) return null;

  const title =
    document.querySelector<HTMLElement>('h1.style-scope.ytd-watch-metadata')?.textContent?.trim() ||
    document.title.replace(' - YouTube', '') ||
    'YouTube Video';

  return {
    videoId,
    currentTime: video.currentTime,
    duration: video.duration || 0,
    title,
    isPlaying: !video.paused,
  };
}

export function seekYouTubeVideo(seconds: number): boolean {
  const video = getYouTubeVideoElement();
  if (!video) return false;

  const target = Math.max(0, Math.min(video.duration || Infinity, seconds));
  video.currentTime = target;
  return true;
}
