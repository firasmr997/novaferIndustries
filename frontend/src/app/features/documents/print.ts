import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { Api } from '../../core/api.service';
import { FrDatePipe, MoneyPipe, QtyPipe, todayIso } from '../../core/format';
import { InvoiceDetail, QuoteDetail, Settings } from '../../core/models';
import { amountInWords } from '../../core/words';
import { Icon } from '../../shared/icon';

interface Printable {
  settings: Settings;
  doc: QuoteDetail | InvoiceDetail;
}

/** A4 devis / facture, printed or saved as PDF from the browser's print dialog. */
@Component({
  selector: 'app-print-document',
  imports: [Icon, MoneyPipe, QtyPipe, FrDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './print.html',
  styleUrl: './print.scss',
})
export class PrintDocument {
  readonly kind = input.required<string>();
  readonly id = input.required<string>();
  private readonly api = inject(Api);

  /** 'facture', 'devis', or 'relance' (a payment reminder letter for an overdue facture). */
  protected readonly isReminder = computed(() => this.kind() === 'relance');
  protected readonly isInvoice = computed(() => this.kind() === 'facture' || this.isReminder());
  protected readonly today = todayIso();

  protected readonly data = rxResource({
    params: () => ({ kind: this.kind(), id: Number(this.id()) }),
    stream: ({ params }) => forkJoin({
      settings: this.api.settings(),
      doc: params.kind === 'devis' ? this.api.quote(params.id) : this.api.invoice(params.id),
    }).pipe(map((r): Printable => {
      const label = params.kind === 'relance' ? 'Relance' : params.kind === 'facture' ? 'Facture' : 'Devis';
      document.title = `${label} ${r.doc.number ?? 'brouillon'} · ${r.doc.client.companyName}`;
      return r;
    })),
  });

  protected readonly invoice = computed(() => (this.isInvoice() ? (this.data.value()?.doc as InvoiceDetail) : null));
  protected readonly quote = computed(() => (!this.isInvoice() ? (this.data.value()?.doc as QuoteDetail) : null));
  protected readonly draft = computed(() => {
    const d = this.data.value()?.doc;
    return !this.isReminder() && !!d && (d.status === 'BROUILLON' || d.status === 'ANNULEE');
  });
  protected readonly words = computed(() => amountInWords(this.data.value()?.doc.totals.totalTtc ?? 0));

  protected print(): void {
    window.print();
  }
}
