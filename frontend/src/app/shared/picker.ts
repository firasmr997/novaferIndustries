import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, model, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { Icon } from './icon';

export interface PickItem<T = unknown> {
  id: number;
  label: string;
  sub?: string | null;
  data?: T;
}

let uid = 0;

/** Searchable combobox for clients, products and factures. */
@Component({
  selector: 'app-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:mousedown)': 'onOutside($event)' },
  template: `
    <div class="picker" [class.open]="open()">
      <div class="input-group">
        <app-icon name="search" [size]="15" />
        <input class="input" [class.input-sm]="small()" [class.invalid]="invalid()" type="text" role="combobox"
               [attr.aria-expanded]="open()" [attr.aria-controls]="listId" aria-autocomplete="list"
               [attr.aria-activedescendant]="active() >= 0 ? listId + '-' + active() : null"
               [placeholder]="placeholder()" [value]="text()" [disabled]="disabled()"
               (input)="onInput($any($event.target).value)" (focus)="onFocus()" (keydown)="onKey($event)" />
        @if (value() && !disabled()) {
          <button type="button" class="clear" (click)="clear()" aria-label="Effacer">
            <app-icon name="x" [size]="14" />
          </button>
        }
      </div>
      @if (open()) {
        <ul class="menu" role="listbox" [id]="listId">
          @for (item of results(); track item.id; let i = $index) {
            <li role="option" [id]="listId + '-' + i" [attr.aria-selected]="i === active()" [class.active]="i === active()"
                (mousedown)="$event.preventDefault(); select(item)" (mouseenter)="active.set(i)">
              <span class="label">{{ item.label }}</span>
              @if (item.sub) { <span class="sub">{{ item.sub }}</span> }
            </li>
          } @empty {
            <li class="none">{{ loading() ? 'Recherche…' : 'Aucun résultat' }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .picker { position: relative; }
    .input { padding-right: 32px; text-overflow: ellipsis; }
    .clear {
      position: absolute; right: 6px; display: grid; place-items: center; width: 24px; height: 24px;
      border: 0; border-radius: 6px; background: transparent; color: var(--text-3); cursor: pointer;
    }
    .clear:hover { background: var(--surface-3); color: var(--ink); }
    .menu {
      position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; right: 0; min-width: 260px; max-height: 288px;
      overflow-y: auto; margin: 0; padding: 4px; list-style: none; background: var(--surface);
      border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-overlay);
    }
    li { display: flex; flex-direction: column; gap: 1px; padding: 7px 10px; border-radius: 6px; cursor: pointer; }
    li.active { background: var(--cobalt-50); }
    .label { color: var(--ink); font-size: 13.5px; font-weight: 500; }
    .sub { color: var(--text-3); font-size: 12.5px; }
    li.none { color: var(--text-3); cursor: default; font-size: 13px; }
  `,
})
export class Picker {
  readonly search = input.required<(q: string) => Observable<PickItem[]>>();
  readonly value = model<PickItem | null>(null);
  readonly placeholder = input('Rechercher…');
  readonly small = input(false);
  readonly invalid = input(false);
  readonly disabled = input(false);

  protected readonly listId = `picker-${++uid}`;
  protected readonly open = signal(false);
  protected readonly results = signal<PickItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly active = signal(-1);
  private readonly query = signal<string | null>(null);
  protected readonly text = computed(() => this.query() ?? this.value()?.label ?? '');

  private readonly terms = new Subject<string>();
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    this.terms.pipe(
      debounceTime(180),
      distinctUntilChanged(),
      switchMap((q) => {
        this.loading.set(true);
        return this.search()(q);
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe((items) => {
      this.loading.set(false);
      this.results.set(items);
      this.active.set(items.length ? 0 : -1);
    });
  }

  protected onFocus(): void {
    this.open.set(true);
    this.terms.next(this.query() ?? '');
  }

  protected onInput(q: string): void {
    this.query.set(q);
    this.open.set(true);
    this.terms.next(q);
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.results().length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open.set(true);
      this.active.set(n ? (this.active() + 1) % n : -1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.set(n ? (this.active() - 1 + n) % n : -1);
    } else if (event.key === 'Enter' && this.open()) {
      const item = this.results()[this.active()];
      if (item) {
        event.preventDefault();
        this.select(item);
      }
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  protected select(item: PickItem): void {
    this.value.set(item);
    this.close();
  }

  protected clear(): void {
    this.value.set(null);
    this.query.set(null);
  }

  protected onOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private close(): void {
    this.open.set(false);
    this.query.set(null);
  }
}
