import {
  ChangeDetectionStrategy, Component, ElementRef, Injectable, effect, inject, signal, viewChild,
} from '@angular/core';
import { Icon } from './icon';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

/** Toasts and confirmation prompts, rendered once by {@link FeedbackHost} in the shell. */
@Injectable({ providedIn: 'root' })
export class Feedback {
  readonly toasts = signal<Toast[]>([]);
  readonly confirmation = signal<ConfirmRequest | null>(null);
  private nextId = 1;

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text, 6000);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  confirm(options: { title: string; message: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
    return new Promise((resolve) => this.confirmation.set({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirmer',
      danger: options.danger ?? false,
      resolve,
    }));
  }

  private push(kind: Toast['kind'], text: string, ttl = 3800): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list.slice(-3), { id, kind, text }]);
    setTimeout(() => this.dismiss(id), ttl);
  }
}

@Component({
  selector: 'app-feedback-host',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of feedback.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.kind" role="status">
          <app-icon [name]="t.kind === 'error' ? 'circle-alert' : t.kind === 'success' ? 'check' : 'inbox'" [size]="16" />
          <span>{{ t.text }}</span>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="feedback.dismiss(t.id)" aria-label="Fermer">
            <app-icon name="x" [size]="14" />
          </button>
        </div>
      }
    </div>

    <dialog #dialog class="dialog" (close)="answer(false)" (cancel)="answer(false)">
      @if (feedback.confirmation(); as c) {
        <div class="dialog-head">
          <div>
            <h2>{{ c.title }}</h2>
            <p>{{ c.message }}</p>
          </div>
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" (click)="answer(false)">Annuler</button>
          <button type="button" class="btn" [class.btn-primary]="!c.danger" [class.btn-danger]="c.danger"
                  (click)="answer(true)">{{ c.confirmLabel }}</button>
        </div>
      }
    </dialog>
  `,
  styles: `
    .toasts { position: fixed; right: 20px; bottom: 20px; z-index: 100; display: flex; flex-direction: column; gap: 8px; }
    .toast {
      display: flex; align-items: center; gap: 10px; min-width: 280px; max-width: 420px; padding: 10px 8px 10px 14px;
      border-radius: 10px; background: var(--ink); color: #fff; font-size: 13.5px; box-shadow: var(--shadow-overlay);
      animation: toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast span { flex: 1; }
    .toast.success app-icon { color: #5fd3a5; }
    .toast.error app-icon { color: #ff8a80; }
    .toast .btn-ghost { color: #c6cbd4; }
    .toast .btn-ghost:hover { background: rgba(255,255,255,.1); color: #fff; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    .dialog-head { padding-bottom: 20px; }
  `,
})
export class FeedbackHost {
  protected readonly feedback = inject(Feedback);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.feedback.confirmation() && !el.open) el.showModal();
    });
  }

  protected answer(ok: boolean): void {
    const c = this.feedback.confirmation();
    if (!c) return;
    this.feedback.confirmation.set(null);
    const el = this.dialog().nativeElement;
    if (el.open) el.close();
    c.resolve(ok);
  }
}
