import { Pipe, PipeTransform } from '@angular/core';

/** TND amounts: three decimals (millimes), French grouping. */
const money3 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const money0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const qty = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const pct = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateLong = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

export function formatMoney(value: number | null | undefined, decimals = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return (decimals ? money3 : money0).format(value);
}

/** Compact amounts for KPI tiles: 1,24 M / 386 k. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${pct.format(value / 1_000_000)} M`;
  if (abs >= 10_000) return `${money0.format(value / 1000)} k`;
  return money0.format(value);
}

export function formatQty(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : qty.format(value);
}

export function formatPct(value: number | null | undefined): string {
  return value === null || value === undefined ? '–' : `${pct.format(value)} %`;
}

/** Parses an ISO date (yyyy-mm-dd) as a local calendar date, never shifted by time zone. */
export function parseDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function formatDate(iso: string | null | undefined, long = false): string {
  if (!iso) return '–';
  return (long ? dateLong : dateFmt).format(parseDate(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '–';
}

/** "2026-03" → "mars" (short) or "mars 2026" (long). */
export function formatMonth(ym: string, long = false): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return (long ? monthLong : monthShort).format(d).replace('.', '');
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « aujourd'hui », « hier », « il y a 12 j ». */
export function ago(days: number): string {
  return days <= 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} j`;
}

/** Percentage change, or null when there is no base to compare with. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = true): string {
    return formatMoney(value, decimals);
  }
}

@Pipe({ name: 'compact' })
export class CompactPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCompact(value);
  }
}

@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatQty(value);
  }
}

@Pipe({ name: 'pct' })
export class PctPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatPct(value);
  }
}

@Pipe({ name: 'frDate' })
export class FrDatePipe implements PipeTransform {
  transform(value: string | null | undefined, long = false): string {
    return formatDate(value, long);
  }
}

@Pipe({ name: 'frDateTime' })
export class FrDateTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDateTime(value);
  }
}

@Pipe({ name: 'label' })
export class LabelPipe implements PipeTransform {
  transform(value: string | null | undefined, labels: Record<string, string>): string {
    return value ? (labels[value] ?? value) : '–';
  }
}
