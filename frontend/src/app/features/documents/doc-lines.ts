import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MoneyPipe, QtyPipe } from '../../core/format';
import { Line, Totals } from '../../core/models';

/** Read-only lines table and tax summary of a devis or facture. */
@Component({
  selector: 'app-doc-lines',
  imports: [MoneyPipe, QtyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th class="right">Qté</th>
            <th class="right">PU HT</th>
            <th class="right">Remise</th>
            <th class="right">TVA</th>
            <th class="right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          @for (l of lines(); track l.id) {
            <tr>
              <td class="primary-cell">{{ l.description }}
                @if (l.reference) { <span class="secondary">Réf. {{ l.reference }}</span> }
              </td>
              <td class="right num">{{ l.quantity | qty }} <span class="subtle">{{ l.unit }}</span></td>
              <td class="right num">{{ l.unitPrice | money }}</td>
              <td class="right num" [class.subtle]="!l.discountPct">{{ l.discountPct ? (l.discountPct + ' %') : '–' }}</td>
              <td class="right num">{{ l.vatRate }} %</td>
              <td class="right num primary-cell">{{ l.totalHt | money }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="totals">
      <div class="vat">
        <span class="label">Récapitulatif TVA</span>
        <table class="table compact">
          <thead><tr><th>Taux</th><th class="right">Base</th><th class="right">Montant</th></tr></thead>
          <tbody>
            @for (v of totals().vatBreakdown; track v.rate) {
              <tr><td class="num">{{ v.rate }} %</td><td class="right num">{{ v.base | money }}</td><td class="right num">{{ v.amount | money }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <dl class="sum">
        @if (totals().totalDiscount > 0) {
          <div><dt>Remises accordées</dt><dd class="num">{{ totals().totalDiscount | money }}</dd></div>
        }
        <div><dt>Total HT</dt><dd class="num">{{ totals().totalHt | money }}</dd></div>
        @if (totals().totalFodec > 0) {
          <div><dt>FODEC {{ totals().fodecRate }} %</dt><dd class="num">{{ totals().totalFodec | money }}</dd></div>
        }
        <div><dt>Total TVA</dt><dd class="num">{{ totals().totalVat | money }}</dd></div>
        @if (totals().fiscalStamp > 0) {
          <div><dt>Timbre fiscal</dt><dd class="num">{{ totals().fiscalStamp | money }}</dd></div>
        }
        <div class="grand"><dt>Total TTC</dt><dd class="num">{{ totals().totalTtc | money }} <span class="currency">TND</span></dd></div>
      </dl>
    </div>
  `,
  styles: `
    .totals {
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 32px; align-items: start;
      padding: 18px 20px 22px; border-top: 1px solid var(--border);
    }
    .vat .label { display: block; margin-bottom: 8px; color: var(--text-2); font-size: 12.5px; font-weight: 500; }
    .vat .table { max-width: 380px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .sum { margin: 0; }
    .sum > div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 13.5px; }
    .sum dt { color: var(--text-2); }
    .sum dd { margin: 0; color: var(--ink); }
    .sum .grand { margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--border-strong); align-items: baseline; }
    .sum .grand dt { color: var(--ink); font-weight: 600; }
    .sum .grand dd { font-family: var(--font-display); font-size: 21px; font-weight: 600; letter-spacing: -0.02em; }
    @media (max-width: 760px) { .totals { grid-template-columns: 1fr; } }
  `,
})
export class DocLines {
  readonly lines = input.required<Line[]>();
  readonly totals = input.required<Totals>();
}
