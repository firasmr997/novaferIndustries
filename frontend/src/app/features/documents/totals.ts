import { VatLine } from '../../core/models';

/** Client-side mirror of the API's DocumentCalculator, for the live preview while editing. */
export interface DraftLine {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
}

export interface DraftTotals {
  gross: number;
  discount: number;
  totalHt: number;
  fodec: number;
  vat: VatLine[];
  totalVat: number;
  stamp: number;
  totalTtc: number;
}

const r3 = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000;

export function lineTotal(l: DraftLine): number {
  const gross = (l.quantity || 0) * (l.unitPrice || 0);
  return r3(gross - (gross * (l.discountPct || 0)) / 100);
}

export function computeTotals(lines: DraftLine[], fodecRate: number, stamp: number): DraftTotals {
  let gross = 0;
  let ht = 0;
  const byRate = new Map<number, number>();
  for (const l of lines) {
    const lineHt = lineTotal(l);
    gross += r3((l.quantity || 0) * (l.unitPrice || 0));
    ht += lineHt;
    byRate.set(l.vatRate, (byRate.get(l.vatRate) ?? 0) + lineHt);
  }
  const fodec = r3((ht * fodecRate) / 100);
  const vat = [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([rate, base]) => {
    const b = r3(base + (base * fodecRate) / 100);
    return { rate, base: b, amount: r3((b * rate) / 100) };
  });
  const totalVat = r3(vat.reduce((s, v) => s + v.amount, 0));
  return {
    gross: r3(gross), discount: r3(Math.max(0, gross - ht)), totalHt: r3(ht), fodec, vat, totalVat, stamp,
    totalTtc: r3(ht + fodec + totalVat + stamp),
  };
}
