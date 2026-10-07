import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Api } from '../../core/api.service';
import { LabelPipe, MoneyPipe, PctPipe, QtyPipe, formatMoney, formatMonth } from '../../core/format';
import { COMPLAINT_TYPE, PAYMENT_METHOD } from '../../core/labels';
import { ChartDirective, compactTick } from '../../shared/chart';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-analytics',
  imports: [RouterLink, Icon, ChartDirective, MoneyPipe, PctPipe, QtyPipe, LabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics {
  private readonly api = inject(Api);
  protected readonly typeLabels = COMPLAINT_TYPE;
  protected readonly methodLabels = PAYMENT_METHOD;
  protected readonly periods = [6, 12, 24];
  protected readonly months = signal(12);

  protected readonly data = rxResource({ params: () => this.months(), stream: ({ params }) => this.api.analytics(params) });

  protected readonly maxCategory = computed(() => Math.max(1, ...(this.data.value()?.revenueByCategory ?? []).map((c) => c.revenue)));
  protected readonly maxMethod = computed(() => Math.max(1, ...(this.data.value()?.paymentMethods ?? []).map((m) => m.amount)));

  protected readonly funnel = computed(() => {
    const f = this.data.value()?.quoteFunnel;
    if (!f) return [];
    const top = Math.max(1, f.created);
    return [
      { label: 'Devis créés', value: f.created, pct: 100 },
      { label: 'Envoyés', value: f.sent, pct: (f.sent / top) * 100 },
      { label: 'Acceptés', value: f.accepted, pct: (f.accepted / top) * 100 },
      { label: 'Facturés', value: f.invoiced, pct: (f.invoiced / top) * 100 },
    ];
  });

  protected readonly revenueChart = computed<ChartConfiguration | null>(() => {
    const monthly = this.data.value()?.monthly;
    if (!monthly) return null;
    return {
      type: 'bar',
      data: {
        labels: monthly.map((m) => formatMonth(m.month)),
        datasets: [
          { type: 'bar', label: 'Facturé HT', data: monthly.map((m) => m.invoiced), backgroundColor: '#2b4acb', borderRadius: 4, maxBarThickness: 22, order: 2 },
          { type: 'bar', label: 'Devis émis HT', data: monthly.map((m) => m.quoted), backgroundColor: '#dce3fa', borderRadius: 4, maxBarThickness: 22, order: 3 },
          {
            type: 'line', label: 'Marge brute', data: monthly.map((m) => m.margin), borderColor: '#e8833a', backgroundColor: '#e8833a',
            borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.35, order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { border: { display: false }, ticks: { callback: compactTick, maxTicksLimit: 5 }, grid: { color: '#eef0f3' } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => formatMonth(monthly[items[0].dataIndex].month, true),
              label: (item) => ` ${item.dataset.label} : ${formatMoney(item.parsed.y ?? 0)} TND`,
            },
          },
        },
      },
    };
  });

  protected readonly complaintsChart = computed<ChartConfiguration | null>(() => {
    const monthly = this.data.value()?.monthly;
    if (!monthly) return null;
    return {
      type: 'bar',
      data: {
        labels: monthly.map((m) => formatMonth(m.month)),
        datasets: [{ label: 'Réclamations', data: monthly.map((m) => m.complaints), backgroundColor: '#98a2b3', borderRadius: 3, maxBarThickness: 16 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
          y: { border: { display: false }, ticks: { precision: 0, maxTicksLimit: 4 }, grid: { color: '#eef0f3' } },
        },
      },
    };
  });

  protected marginRate(revenue: number, margin: number): number {
    return revenue ? (margin / revenue) * 100 : 0;
  }
}
