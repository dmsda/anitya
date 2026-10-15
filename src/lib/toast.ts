export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
}

class ToastService {
  private toasts: ToastItem[] = [];
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();

  public subscribe(fn: (toasts: ToastItem[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.toasts);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.toasts);
    }
  }

  public show(message: string, type: ToastType = 'info', durationMs = 2800): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const item: ToastItem = { id, message, type, durationMs };
    
    // Keep max 3 toasts visible at once to prevent cluttering narrow sidepanel
    this.toasts = [...this.toasts.slice(-2), item];
    this.notify();

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }

    return id;
  }

  public success(message: string, durationMs = 2800): string {
    return this.show(message, 'success', durationMs);
  }

  public error(message: string, durationMs = 4000): string {
    return this.show(message, 'error', durationMs);
  }

  public info(message: string, durationMs = 2800): string {
    return this.show(message, 'info', durationMs);
  }

  public warning(message: string, durationMs = 3500): string {
    return this.show(message, 'warning', durationMs);
  }

  public dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toast = new ToastService();
