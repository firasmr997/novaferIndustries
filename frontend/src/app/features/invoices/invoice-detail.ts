import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDatePipe, FrDateTimePipe, LabelPipe, MoneyPipe, formatMoney, todayIso } from '../../core/format';
import { errorMessage } from '../../core/http';
import { PAYMENT_METHOD, entries } from '../../core/labels';
import { InvoiceDetail, PaymentMethod } from '../../core/models';
import { heatOf } from '../../shared/aging';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { StatusBadge } from '../../shared/status-badge';
import { DocLines } from '../documents/doc-lines';

@Component({
  selector: 'app-invoice-detail',
  imports: [RouterLink, FormsModule, Icon, StatusBadge, DocLines, MoneyPipe, FrDatePipe, FrDateTimePipe, LabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-detail.html',
  styleUrl: './invoice-detail.scss',
})
export class InvoiceDetailPage {
  readonly id = input.required<string>();
  /** ?encaisser=1 (from an overdue row) opens the payment dialog once the facture has loaded. */
  readonly encaisser = input<string>();
  private autoOpened = false;
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly methods = entries(PAYMENT_METHOD);
  protected readonly methodLabels = PAYMENT_METHOD;
  protected readonly busy = signal(false);
  protected readonly canEdit = computed(() => this.auth.can('invoices'));
  protected readonly invoice = rxResource({ params: () => Number(this.id()), stream: ({ params }) => this.api.invoice(params) });

  protected readonly paidPct = computed(() => {
    const i = this.invoice.value();
    return i && i.totals.totalTtc > 0 ? Math.min(100, (i.amountPaid / i.totals.totalTtc) * 100) : 0;
  });

  // Payment dialog
  private readonly payDialog = viewChild<ElementRef<HTMLDialogElement>>('payDialog');
  /** The amount is typed in French format (« 18 433,192 ») and parsed on submit. */
  protected pay = { paymentDate: todayIso(), amount: '', method: 'VIREMENT' as PaymentMethod, reference: '', notes: '' };
  protected readonly payError = signal<string | null>(null);

  // Cancel dialog
  private readonly cancelDialog = viewChild<ElementRef<HTMLDialogElement>>('cancelDialog');
  protected cancelReason = '';

  constructor() {
    effect(() => {
      const i = this.invoice.value();
      if (i && this.encaisser() && !this.autoOpened && this.canEdit() && i.status !== 'BROUILLON' && i.balanceDue > 0
          && (i.status === 'EMISE' || i.status === 'PARTIELLEMENT_PAYEE')) {
        this.autoOpened = true;
        queueMicrotask(() => this.openPayment(i));
      }
    });
  }

  protected heat(days: number): number {
    return heatOf(days);
  }

  private run<T>(request: Observable<T>, done: (value: T) => void, onError?: (message: string) => void): void {
    this.busy.set(true);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        done(value);
      },
      error: (e) => {
        this.busy.set(false);
        const message = errorMessage(e);
        if (onError) onError(message);
        else this.feedback.error(message);
      },
    });
  }

  protected async issue(i: InvoiceDetail): Promise<void> {
    const ok = await this.feedback.confirm({
      title: 'Émettre cette facture ?',
      message: `Un numéro légal lui sera attribué et elle ne pourra plus être modifiée. Les quantités livrées sortiront du stock. Total : ${i.totals.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND TTC.`,
      confirmLabel: 'Émettre la facture',
    });
    if (!ok) return;
    this.run(this.api.issueInvoice(i.id), (updated) => {
      this.invoice.set(updated);
      this.feedback.success(`Facture ${updated.number} émise`);
    });
  }

  protected openPayment(i: InvoiceDetail): void {
    this.pay = { paymentDate: todayIso(), amount: formatMoney(i.balanceDue), method: 'VIREMENT', reference: '', notes: '' };
    this.payError.set(null);
    this.cdr.markForCheck();
    this.payDialog()?.nativeElement.showModal();
  }

  protected closePayment(): void {
    this.payDialog()?.nativeElement.close();
  }

  protected submitPayment(i: InvoiceDetail): void {
    const amount = Number(this.pay.amount.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      this.payError.set('Saisissez un montant positif, par exemple 1 250,500.');
      return;
    }
    this.run(this.api.addPayment(i.id, {
      paymentDate: this.pay.paymentDate,
      amount,
      method: this.pay.method,
      reference: this.pay.reference.trim() || null,
      notes: this.pay.notes.trim() || null,
    }), (updated) => {
      this.invoice.set(updated);
      this.closePayment();
      this.feedback.success(updated.status === 'PAYEE' ? 'Règlement enregistré : facture soldée' : 'Règlement enregistré');
    }, (message) => this.payError.set(message));
  }

  protected async removePayment(i: InvoiceDetail, paymentId: number): Promise<void> {
    const ok = await this.feedback.confirm({
      title: 'Supprimer ce règlement ?',
      message: 'Le reste à payer de la facture sera recalculé.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.run(this.api.deletePayment(i.id, paymentId), (updated) => {
      this.invoice.set(updated);
      this.feedback.success('Règlement supprimé');
    });
  }

  protected openCancel(): void {
    this.cancelReason = '';
    this.cancelDialog()?.nativeElement.showModal();
  }

  protected closeCancel(): void {
    this.cancelDialog()?.nativeElement.close();
  }

  protected submitCancel(i: InvoiceDetail): void {
    this.run(this.api.cancelInvoice(i.id, this.cancelReason.trim()), (updated) => {
      this.invoice.set(updated);
      this.closeCancel();
      this.feedback.success(`Facture ${updated.number} annulée, marchandise réintégrée au stock`);
    });
  }

  protected async remove(i: InvoiceDetail): Promise<void> {
    const ok = await this.feedback.confirm({
      title: 'Supprimer ce brouillon ?',
      message: i.quoteNumber ? `Le devis ${i.quoteNumber} repassera au statut « accepté ».` : 'Ce brouillon sera définitivement supprimé.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.run(this.api.deleteInvoice(i.id), () => {
      this.feedback.success('Brouillon supprimé');
      this.router.navigate(['/factures']);
    });
  }
}
