import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { COMPLAINT_TYPE } from '../../core/labels';
import {
  FrDatePipe, LabelPipe, MoneyPipe, QtyPipe, ago, delta, formatMoney, formatMonth, parseDate,
} from '../../core/format';
import { Aging, heatOf } from '../../shared/aging';
import { ChartDirective, compactTick } from '../../shared/chart';
import { Icon } from '../../shared/icon';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, MoneyPipe, QtyPipe, FrDatePipe, LabelPipe, ChartDirective, Aging, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly complaintType = COMPLAINT_TYPE;

  protected readonly data = rxResource({ stream: () => this.api.home() });

  protected readonly today = new Date();
  protected readonly todayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(this.today);
  protected readonly monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(this.today);
  protected readonly prevMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
    .format(new Date(this.today.getFullYear(), this.today.getMonth() - 1, 1));
  protected readonly year = this.today.getFullYear();

  protected readonly greeting = computed(() => {
    const first = this.auth.user()?.fullName.split(' ')[0] ?? '';
    return `${this.today.getHours() < 18 ? 'Bonjour' : 'Bonsoir'} ${first}`.trim();
  });

  protected readonly dayOfMonth = this.today.getDate();

  /** Month to date against the same days of last month, so early-month figures compare like for like. */
  protected readonly monthDelta = computed(() => {
    const k = this.data.value()?.kpis;
    return k ? delta(k.revenueMonth, k.revenuePrevMonthToDate) : null;
  });

  protected readonly ytdDelta = computed(() => {
    const k = this.data.value()?.kpis;
    return k ? delta(k.revenueYtd, k.revenuePrevYtd) : null;
  });

  protected readonly openInvoicesTotal = computed(() =>
    (this.data.value()?.aging ?? []).reduce((s, b) => s + b.count, 0));

  protected readonly chart = computed<ChartConfiguration | null>(() => {
    const monthly = this.data.value()?.monthly;
    if (!monthly) return null;
    return {
      type: 'bar',
      data: {
        labels: monthly.map((m) => formatMonth(m.month)),
        datasets: [
          {
            type: 'bar', label: 'Facturé HT', data: monthly.map((m) => m.invoiced),
            backgroundColor: monthly.map((_, i) => (i === monthly.length - 1 ? '#8fa2ea' : '#2b4acb')),
            borderRadius: 4, maxBarThickness: 26, order: 2,
          },
          {
            type: 'line', label: 'Encaissé TTC', data: monthly.map((m) => m.collected),
            borderColor: '#14a38b', backgroundColor: '#14a38b', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4,
            tension: 0.35, order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
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

  protected ago(days: number): string {
    return ago(days);
  }

  protected heat(days: number): number {
    return heatOf(days);
  }

  protected daysLeft(iso: string): number {
    const end = parseDate(iso).getTime();
    const start = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()).getTime();
    return Math.round((end - start) / 86_400_000);
  }

  protected open(path: string, id: number): void {
    this.router.navigate([path, id]);
  }
}
