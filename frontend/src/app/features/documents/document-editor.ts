import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { Api } from '../../core/api.service';
import { MoneyPipe, todayIso } from '../../core/format';
import { errorMessage } from '../../core/http';
import { UNITS, VAT_RATES } from '../../core/labels';
import { Client, DocumentRequest, InvoiceDetail, Product, QuoteDetail, Settings } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { Lookups } from '../../shared/lookups';
import { PickItem, Picker } from '../../shared/picker';
import { computeTotals, lineTotal } from './totals';

interface LineDraft {
  key: number;
  product: PickItem<Product> | null;
  reference: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
}

let lineKey = 0;

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Creates or edits a devis or a facture (route data `kind`). */
@Component({
  selector: 'app-document-editor',
  imports: [FormsModule, RouterLink, Icon, Picker, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './document-editor.html',
  styleUrl: './document-editor.scss',
})
export class DocumentEditor implements OnInit {
  readonly kind = input.required<'quote' | 'invoice'>();
  readonly id = input<string>();
  /** ?client=12 preselects a client (from its page). */
  readonly client = input<string>();

  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  protected readonly lookups = inject(Lookups);

  protected readonly units = UNITS;
  protected readonly vatRates = VAT_RATES;

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly settings = signal<Settings | null>(null);
  protected readonly number = signal<string | null>(null);

  protected readonly clientPick = signal<PickItem<Client> | null>(null);
  protected readonly issueDate = signal(todayIso());
  protected readonly endDate = signal('');
  protected readonly endTouched = signal(false);
  protected readonly subject = signal('');
  protected readonly notes = signal('');
  protected readonly lines = signal<LineDraft[]>([]);

  protected readonly isQuote = computed(() => this.kind() === 'quote');
  protected readonly isEdit = computed(() => !!this.id());
  protected readonly vatExempt = computed(() => !!this.clientPick()?.data?.vatExempt);

  protected readonly totals = computed(() => {
    const s = this.settings();
    const fodec = s?.fodecEnabled && !this.vatExempt() ? s.fodecRate : 0;
    const stamp = this.isQuote() ? 0 : (s?.fiscalStamp ?? 0);
    return computeTotals(this.lines().map((l) => ({ ...l, vatRate: this.vatExempt() ? 0 : l.vatRate })), fodec, stamp);
  });

  protected readonly title = computed(() => {
    if (this.isEdit()) return `${this.isQuote() ? 'Modifier le devis' : 'Modifier la facture'} ${this.number() ?? ''}`.trim();
    return this.isQuote() ? 'Nouveau devis' : 'Nouvelle facture';
  });

  protected readonly backLink = computed(() =>
    this.isEdit() ? [this.isQuote() ? '/devis' : '/factures', this.id()] : [this.isQuote() ? '/devis' : '/factures']);

  protected readonly lineErrors = computed(() =>
    this.lines().some((l) => !l.description.trim() || !(l.quantity > 0) || l.unitPrice < 0));

  ngOnInit(): void {
    const id = this.id() ? Number(this.id()) : null;
    const doc$: Observable<QuoteDetail | InvoiceDetail | null> = id
      ? (this.isQuote() ? this.api.quote(id) : this.api.invoice(id))
      : of(null);
    const preset$ = !id && this.client() ? this.api.client(Number(this.client())) : of(null);
    forkJoin({ settings: this.api.settings(), doc: doc$, preset: preset$ }).subscribe({
      next: ({ settings, doc, preset }) => {
        this.settings.set(settings);
        if (doc) {
          this.fill(doc);
        } else {
          if (preset) this.selectClient({ id: preset.client.id, label: preset.client.companyName, data: preset.client });
          this.updateEndDate();
          this.addLine();
        }
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }

  private fill(doc: QuoteDetail | InvoiceDetail): void {
    this.number.set(doc.number);
    const c = doc.client;
    this.clientPick.set({ id: c.id, label: c.companyName, data: { ...c, paymentTermsDays: 30 } as unknown as Client });
    this.issueDate.set(doc.issueDate);
    this.endDate.set('validUntil' in doc ? doc.validUntil : doc.dueDate);
    this.endTouched.set(true);
    this.subject.set(doc.subject ?? '');
    this.notes.set(doc.notes ?? '');
    this.lines.set(doc.lines.map((l) => ({
      key: ++lineKey,
      product: l.productId ? { id: l.productId, label: l.description } : null,
      reference: l.reference,
      description: l.description,
      unit: l.unit ?? 'pièce',
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      discountPct: Number(l.discountPct),
      vatRate: Number(l.vatRate),
    })));
  }

  protected selectClient(pick: PickItem<Client> | null): void {
    this.clientPick.set(pick);
    if (!this.endTouched()) this.updateEndDate();
  }

  protected setIssueDate(value: string): void {
    this.issueDate.set(value);
    if (!this.endTouched()) this.updateEndDate();
  }

  protected setEndDate(value: string): void {
    this.endDate.set(value);
    this.endTouched.set(true);
  }

  private updateEndDate(): void {
    const s = this.settings();
    const days = this.isQuote() ? (s?.quoteValidityDays ?? 30)
      : (this.clientPick()?.data?.paymentTermsDays ?? s?.paymentTermsDays ?? 30);
    this.endDate.set(addDays(this.issueDate() || todayIso(), days));
  }

  protected addLine(): void {
    this.lines.update((ls) => [...ls, {
      key: ++lineKey, product: null, reference: null, description: '', unit: 'pièce', quantity: 1, unitPrice: 0,
      discountPct: 0, vatRate: this.settings()?.defaultVatRate ?? 19,
    }]);
  }

  protected removeLine(key: number): void {
    this.lines.update((ls) => ls.filter((l) => l.key !== key));
  }

  protected moveLine(key: number, step: -1 | 1): void {
    this.lines.update((ls) => {
      const i = ls.findIndex((l) => l.key === key);
      const j = i + step;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  protected patch(key: number, change: Partial<LineDraft>): void {
    this.lines.update((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
  }

  protected pickProduct(key: number, pick: PickItem<Product> | null): void {
    const p = pick?.data;
    this.patch(key, p ? {
      product: pick, reference: p.reference, description: p.name, unit: p.unit, unitPrice: Number(p.unitPrice),
      vatRate: Number(p.vatRate),
    } : { product: null });
  }

  protected num(value: string): number {
    const n = Number(String(value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  protected lineHt(l: LineDraft): number {
    return lineTotal(l);
  }

  protected save(): void {
    this.submitted.set(true);
    const client = this.clientPick();
    if (!client || !this.lines().length || this.lineErrors()) {
      this.error.set(!client ? 'Choisissez un client.' : !this.lines().length ? 'Ajoutez au moins une ligne.'
        : 'Chaque ligne doit avoir une désignation et une quantité positive.');
      return;
    }
    const body: DocumentRequest = {
      clientId: client.id,
      issueDate: this.issueDate() || null,
      subject: this.subject().trim() || null,
      notes: this.notes().trim() || null,
      lines: this.lines().map((l) => ({
        productId: l.product?.id ?? null,
        reference: l.reference,
        description: l.description.trim(),
        unit: l.unit,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        vatRate: l.vatRate,
      })),
      ...(this.isQuote() ? { validUntil: this.endDate() || null } : { dueDate: this.endDate() || null }),
    };
    this.saving.set(true);
    this.error.set(null);
    const id = this.id() ? Number(this.id()) : undefined;
    const request$: Observable<{ id: number }> = this.isQuote() ? this.api.saveQuote(body, id) : this.api.saveInvoice(body, id);
    request$.subscribe({
      next: (doc) => {
        this.feedback.success(this.isQuote() ? 'Devis enregistré' : 'Facture enregistrée en brouillon');
        this.router.navigate([this.isQuote() ? '/devis' : '/factures', doc.id]);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
