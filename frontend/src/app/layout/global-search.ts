import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, of, switchMap } from 'rxjs';
import { Api } from '../core/api.service';
import { formatMoney } from '../core/format';
import { Icon } from '../shared/icon';

interface Hit {
  group: string;
  label: string;
  sub: string;
  link: string[];
}

/** One box to find a client, a devis or a facture by name or number. Ctrl+K focuses it. */
@Component({
  selector: 'app-global-search',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onGlobalKey($event)',
    '(document:mousedown)': 'onOutside($event)',
  },
  template: `
    <div class="search">
      <div class="input-group">
        <app-icon name="search" [size]="15" />
        <input #box class="input" type="search" placeholder="Rechercher un client, un devis, une facture…"
               aria-label="Recherche globale" [value]="q()" (input)="onInput($any($event.target).value)"
               (focus)="open.set(q().length > 1)" (keydown)="onKey($event)" />
        <kbd>Ctrl K</kbd>
      </div>
      @if (open()) {
        <div class="results" role="listbox">
          @for (hit of hits(); track hit.link.join('/'); let i = $index) {
            @if (i === 0 || hits()[i - 1].group !== hit.group) {
              <div class="group">{{ hit.group }}</div>
            }
            <button type="button" role="option" [class.active]="i === active()" [attr.aria-selected]="i === active()"
                    (mousedown)="$event.preventDefault(); go(hit)" (mouseenter)="active.set(i)">
              <span class="label">{{ hit.label }}</span>
              <span class="sub">{{ hit.sub }}</span>
            </button>
          } @empty {
            <p class="none">{{ loading() ? 'Recherche…' : 'Aucun résultat pour « ' + q() + ' »' }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { flex: 1 1 auto; max-width: 460px; min-width: 0; }
    .search { position: relative; }
    .input { background: var(--surface); padding-right: 64px; }
    .input::-webkit-search-cancel-button { display: none; }
    kbd {
      position: absolute; right: 8px; padding: 2px 6px; border: 1px solid var(--border); border-radius: 5px;
      background: var(--surface-2); color: var(--text-3); font: 500 11px var(--font-ui);
    }
    .results {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 30; max-height: 420px; overflow-y: auto;
      padding: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: var(--shadow-overlay);
    }
    .group { padding: 8px 10px 4px; color: var(--text-3); font-size: 12px; font-weight: 500; }
    button {
      display: flex; width: 100%; align-items: baseline; justify-content: space-between; gap: 12px; padding: 8px 10px;
      border: 0; border-radius: 6px; background: transparent; text-align: left; cursor: pointer; font: inherit;
    }
    button.active { background: var(--cobalt-50); }
    .label { color: var(--ink); font-weight: 500; font-size: 13.5px; }
    .sub { color: var(--text-3); font-size: 12.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .none { padding: 14px 10px; color: var(--text-3); font-size: 13px; }
    @media (max-width: 640px) { kbd { display: none; } .input { padding-right: 11px; } }
  `,
})
export class GlobalSearch {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly q = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly hits = signal<Hit[]>([]);
  protected readonly active = signal(0);
  private readonly terms = new Subject<string>();

  constructor() {
    this.terms.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) => {
        this.loading.set(true);
        const none = { content: [] };
        return forkJoin({
          clients: this.api.clients({ q, size: 4 }).pipe(catchError(() => of(none))),
          quotes: this.api.quotes({ q, size: 4 }).pipe(catchError(() => of(none))),
          invoices: this.api.invoices({ q, size: 4 }).pipe(catchError(() => of(none))),
        });
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(({ clients, quotes, invoices }) => {
      this.loading.set(false);
      this.active.set(0);
      this.hits.set([
        ...clients.content.map((c: any) => ({ group: 'Clients', label: c.companyName, sub: c.city ?? c.code, link: ['/clients', c.id] })),
        ...invoices.content.map((i: any) => ({
          group: 'Factures', label: i.number ?? 'Brouillon', sub: `${i.client.label} · ${formatMoney(i.totalTtc)} TND`, link: ['/factures', i.id],
        })),
        ...quotes.content.map((d: any) => ({
          group: 'Devis', label: d.number, sub: `${d.client.label} · ${formatMoney(d.totalTtc)} TND`, link: ['/devis', d.id],
        })),
      ]);
    });
  }

  protected onInput(value: string): void {
    this.q.set(value);
    const ready = value.trim().length > 1;
    this.open.set(ready);
    if (ready) this.terms.next(value.trim());
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.hits().length;
    if (event.key === 'ArrowDown' && n) {
      event.preventDefault();
      this.active.set((this.active() + 1) % n);
    } else if (event.key === 'ArrowUp' && n) {
      event.preventDefault();
      this.active.set((this.active() - 1 + n) % n);
    } else if (event.key === 'Enter' && this.hits()[this.active()]) {
      this.go(this.hits()[this.active()]);
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected go(hit: Hit): void {
    this.open.set(false);
    this.q.set('');
    this.router.navigate(hit.link);
  }

  protected onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.host.nativeElement.querySelector('input')?.focus();
    }
  }

  protected onOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
