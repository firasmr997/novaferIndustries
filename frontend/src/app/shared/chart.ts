import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import {
  BarController, BarElement, CategoryScale, Chart, ChartConfiguration, DoughnutController, Filler, Legend,
  LineController, LineElement, LinearScale, PointElement, Tooltip, ArcElement,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, DoughnutController, ArcElement,
  CategoryScale, LinearScale, Tooltip, Legend, Filler);

Chart.defaults.font.family = "'Inter Variable', system-ui, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#667085';
Chart.defaults.borderColor = '#eef0f3';
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#0f1729';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { weight: 600, size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
Chart.defaults.plugins.tooltip.boxPadding = 4;
Chart.defaults.plugins.tooltip.usePointStyle = true;
Chart.defaults.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 450 };

/** Renders a Chart.js configuration on a canvas and rebuilds it whenever the configuration changes. */
@Directive({ selector: 'canvas[appChart]' })
export class ChartDirective implements OnDestroy {
  readonly config = input.required<ChartConfiguration>({ alias: 'appChart' });
  private readonly canvas = inject(ElementRef<HTMLCanvasElement>);
  private chart?: Chart;

  constructor() {
    effect(() => {
      const config = this.config();
      this.chart?.destroy();
      this.chart = new Chart(this.canvas.nativeElement, config);
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

/** Shared money-axis formatting: 120 k, 1,2 M. */
export function compactTick(value: number | string): string {
  const v = Number(value);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000).toLocaleString('fr-FR')} k`;
  return v.toLocaleString('fr-FR');
}
