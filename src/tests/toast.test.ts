import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from '../lib/toast';

describe('ToastService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('publishes and dismisses toasts accurately', () => {
    let capturedToasts: any[] = [];
    const unsub = toast.subscribe((t) => {
      capturedToasts = t;
    });

    toast.success('Test success message', 2000);
    expect(capturedToasts.length).toBe(1);
    expect(capturedToasts[0].message).toBe('Test success message');
    expect(capturedToasts[0].type).toBe('success');

    // Fast-forward timer past duration
    vi.advanceTimersByTime(2100);
    expect(capturedToasts.length).toBe(0);

    unsub();
  });

  it('limits max concurrent toasts to prevent viewport clutter', () => {
    let capturedToasts: any[] = [];
    const unsub = toast.subscribe((t) => {
      capturedToasts = t;
    });

    toast.info('Toast 1', 10000);
    toast.info('Toast 2', 10000);
    toast.info('Toast 3', 10000);
    toast.info('Toast 4', 10000);

    // Max 3 retained
    expect(capturedToasts.length).toBe(3);
    expect(capturedToasts.map((t) => t.message)).toEqual(['Toast 2', 'Toast 3', 'Toast 4']);

    unsub();
  });
});
