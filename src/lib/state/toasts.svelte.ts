export interface Toast {
  id: number;
  message: string;
  tone: "info" | "error";
  action?: { label: string; run: () => void };
}

let nextId = 1;

class ToastStore {
  items = $state.raw<Toast[]>([]);

  show(toast: Omit<Toast, "id">, timeout = toast.action ? 10_000 : 5_000): number {
    const id = nextId++;
    this.items = [...this.items.slice(-3), { ...toast, id }];
    if (timeout > 0) setTimeout(() => this.dismiss(id), timeout);
    return id;
  }

  dismiss(id: number): void {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new ToastStore();
