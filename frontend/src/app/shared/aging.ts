import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MoneyPipe } from '../core/format';
import { AgingBucket } from '../core/models';

/** Lateness heat level (0 = not due … 4 = over 90 days) for an overdue day count. */
export function heatOf(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  if (daysOverdue <= 30) return 1;
  if (daysOverdue <= 60) return 2;
  if (daysOverdue <= 90) return 3;
  return 4;
}

/** The receivables aging bar: one bar segmented by lateness, with its bucket legend. */
@Component({
  selector: 'app-aging',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aging-bar" role="img" [attr.aria-label]="summary()">
      @for (b of buckets(); track b.key) {
        @if (b.amount > 0) {
          <span [class]="'heat-' + b.heat" [style.flex-grow]="b.amount" [title]="b.label + ' : ' + (b.amount | money) + ' TND'"></span>
        }
      }
    </div>
    <ul class="legend">
      @for (b of buckets(); track b.key) {
        <li [class.zero]="b.amount === 0">
          <span class="age-dot" [class]="'age-dot heat-' + b.heat"></span>
          <span class="name">{{ b.label }}</span>
          <span class="count num" [title]="b.count + ' factures'">{{ b.count }}</span>
          <span class="share num">{{ share(b) }}</span>
          <span class="amount num">{{ b.amount | money }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    .legend { margin: 16px 0 0; padding: 0; list-style: none; }
    li {
      display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 36px auto; align-items: center; gap: 8px;
      padding: 9px 0; border-top: 1px solid var(--border); font-size: 13.5px;
    }
    li:first-child { border-top: 0; }
    .name { color: var(--ink); font-weight: 500; white-space: nowrap; }
    .count, .share { color: var(--text-3); font-size: 12px; text-align: right; white-space: nowrap; }
    .amount { color: var(--ink); font-weight: 500; text-align: right; }
    li.zero .name, li.zero .amount { color: var(--text-3); font-weight: 400; }
  `,
})
export class Aging {
  readonly buckets = input.required<AgingBucket[]>();
  private readonly total = computed(() => this.buckets().reduce((s, b) => s + b.amount, 0));

  protected share(b: AgingBucket): string {
    const t = this.total();
    return t ? `${Math.round((b.amount / t) * 100)} %` : '–';
  }

  protected readonly summary = computed(() =>
    'Antériorité des créances : ' + this.buckets().map((b) => `${b.label} ${Math.round(b.amount)} TND`).join(', '));
}
