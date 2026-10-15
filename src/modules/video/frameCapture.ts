import { getYouTubeVideoElement } from './youtubeDetector';

export interface FrameCaptureResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  width?: number;
  height?: number;
  timestampSeconds?: number;
  error?: string;
}

/**
 * Captures the current frame of the video element into an optimized JPEG Blob.
 */
export async function captureVideoFrame(
  videoElement?: HTMLVideoElement | null
): Promise<FrameCaptureResult> {
  const video = videoElement || getYouTubeVideoElement();
  if (!video) {
    return {
      success: false,
      error: 'No active video player element found on this page.',
    };
  }

  if (video.readyState < 2) {
    return {
      success: false,
      error: 'Video is not yet loaded or ready to capture.',
    };
  }

  try {
    const rawWidth = video.videoWidth || video.clientWidth || 640;
    const rawHeight = video.videoHeight || video.clientHeight || 360;

    // Constrain max dimension to 1280px to save storage while keeping crisp readability
    const maxDimension = 1280;
    let targetWidth = rawWidth;
    let targetHeight = rawHeight;

    if (targetWidth > maxDimension) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Could not create 2D canvas context.' };
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Convert to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
    });

    if (!blob) {
      return { success: false, error: 'Canvas failed to generate image Blob.' };
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    return {
      success: true,
      blob,
      dataUrl,
      width: targetWidth,
      height: targetHeight,
      timestampSeconds: Math.floor(video.currentTime),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('tainted') || message.includes('SecurityError')) {
      return {
        success: false,
        error: 'Video frame could not be captured due to DRM protection or cross-origin restrictions.',
      };
    }
    return {
      success: false,
      error: `Frame capture failed: ${message}`,
    };
  }
}
