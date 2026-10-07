import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { Api } from '../../core/api.service';
import { errorMessage } from '../../core/http';
import { COMPLAINT_PRIORITY, COMPLAINT_TYPE, entries } from '../../core/labels';
import { Client, ComplaintPriority, ComplaintType, InvoiceSummary, Product } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { Lookups } from '../../shared/lookups';
import { PickItem, Picker } from '../../shared/picker';

@Component({
  selector: 'app-complaint-form',
  imports: [RouterLink, Icon, Picker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow-page">
      <a class="back-link" [routerLink]="id() ? ['/reclamations', id()] : ['/reclamations']"><app-icon name="arrow-left" [size]="15" /> Réclamations</a>
      <header class="page-head">
        <div>
          <h1>{{ id() ? 'Modifier la réclamation ' + (number() ?? '') : 'Nouvelle réclamation' }}</h1>
          <p class="lead">Rattachez la réclamation à sa facture et au produit concerné pour suivre le coût de la non-qualité.</p>
        </div>
      </header>

      @if (error()) { <div class="alert banner" role="alert"><app-icon name="circle-alert" /> {{ error() }}</div> }

      <section class="panel">
        <div class="panel-body">
          <div class="form-section">
            <h2>Client et origine</h2>
            <p class="section-lead">La facture et le produit sont facultatifs mais facilitent l'analyse.</p>
            <div class="form-grid">
              <div class="field span-12">
                <label>Client</label>
                <app-picker [search]="lookups.clients" [value]="client()" (valueChange)="setClient($any($event))"
                            placeholder="Rechercher un client…" [invalid]="submitted() && !client()" />
              </div>
              <div class="field span-6">
                <label>Facture concernée</label>
                <app-picker [search]="invoiceSearch()" [value]="invoice()" (valueChange)="invoice.set($any($event))"
                            [disabled]="!client()" [placeholder]="client() ? 'N° de facture…' : 'Choisissez d\\'abord le client'" />
              </div>
              <div class="field span-6">
                <label>Produit concerné</label>
                <app-picker [search]="lookups.products" [value]="product()" (valueChange)="product.set($any($event))" placeholder="Référence ou désignation…" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Réclamation</h2>
            <div class="form-grid">
              <div class="field span-12">
                <label for="subject">Objet</label>
                <input id="subject" class="input" maxlength="200" [class.invalid]="submitted() && !subject().trim()"
                       [value]="subject()" (input)="subject.set($any($event.target).value)" placeholder="Ex. Défaut de planéité sur tôles" />
              </div>
              <div class="field span-12">
                <label for="description">Description</label>
                <textarea id="description" class="textarea" rows="5" maxlength="4000" [class.invalid]="submitted() && !description().trim()"
                          [value]="description()" (input)="description.set($any($event.target).value)"
                          placeholder="Constat du client, quantités touchées, photos reçues, attentes…"></textarea>
              </div>
              <div class="field span-4">
                <label for="type">Type</label>
                <select id="type" class="select" (change)="type.set($any($event.target).value)">
                  @for (t of types; track t.value) { <option [value]="t.value" [selected]="t.value === type()">{{ t.label }}</option> }
                </select>
              </div>
              <div class="field span-4">
                <label for="priority">Priorité</label>
                <select id="priority" class="select" (change)="priority.set($any($event.target).value)">
                  @for (p of priorities; track p.value) { <option [value]="p.value" [selected]="p.value === priority()">{{ p.label }}</option> }
                </select>
              </div>
              <div class="field span-4">
                <label for="assignee">Responsable</label>
                <select id="assignee" class="select" (change)="assigneeId.set(+$any($event.target).value || null)">
                  <option value="">Non attribuée</option>
                  @for (u of team.value() ?? []; track u.id) { <option [value]="u.id" [selected]="u.id === assigneeId()">{{ u.label }}</option> }
                </select>
              </div>
              <div class="field span-4">
                <label for="cost">Coût estimé (TND)</label>
                <input id="cost" class="input num" type="number" min="0" step="0.001" [value]="estimatedCost() ?? ''"
                       (input)="estimatedCost.set($any($event.target).value === '' ? null : +$any($event.target).value)" />
                <span class="hint">Remplacement, transport, avoir…</span>
              </div>
            </div>
          </div>
        </div>
        <div class="panel-foot">
          <span></span>
          <div class="row-actions">
            <a class="btn" [routerLink]="id() ? ['/reclamations', id()] : ['/reclamations']">Annuler</a>
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()">
              <app-icon name="check" /> {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `.narrow-page { max-width: 880px; } .banner { margin-bottom: 16px; }`,
})
export class ComplaintForm implements OnInit {
  readonly id = input<string>();
  /** Prefill from a facture page: ?client=…&facture=… */
  readonly clientParam = input<string>(undefined, { alias: 'client' });
  readonly facture = input<string>();

  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  protected readonly lookups = inject(Lookups);

  protected readonly types = entries(COMPLAINT_TYPE);
  protected readonly priorities = entries(COMPLAINT_PRIORITY);
  protected readonly team = rxResource({ stream: () => this.api.team() });

  protected readonly number = signal<string | null>(null);
  protected readonly client = signal<PickItem<Client> | null>(null);
  protected readonly invoice = signal<PickItem<InvoiceSummary> | null>(null);
  protected readonly product = signal<PickItem<Product> | null>(null);
  protected readonly subject = signal('');
  protected readonly description = signal('');
  protected readonly type = signal<ComplaintType>('QUALITE');
  protected readonly priority = signal<ComplaintPriority>('MOYENNE');
  protected readonly assigneeId = signal<number | null>(null);
  protected readonly estimatedCost = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly invoiceSearch = computed(() => this.lookups.invoicesOf(this.client()?.id ?? null));

  ngOnInit(): void {
    if (this.id()) {
      this.api.complaint(Number(this.id())).subscribe((c) => {
        this.number.set(c.number);
        this.client.set({ id: c.client.id, label: c.client.label });
        this.invoice.set(c.invoiceId ? { id: c.invoiceId, label: c.invoiceNumber ?? '' } : null);
        this.product.set(c.productId ? { id: c.productId, label: c.productName ?? c.productReference ?? '' } : null);
        this.subject.set(c.subject);
        this.description.set(c.description);
        this.type.set(c.type);
        this.priority.set(c.priority);
        this.assigneeId.set(c.assignee?.id ?? null);
        this.estimatedCost.set(c.estimatedCost);
      });
      return;
    }
    const clientId = this.clientParam() ? Number(this.clientParam()) : null;
    const invoiceId = this.facture() ? Number(this.facture()) : null;
    forkJoin({
      client: clientId ? this.api.client(clientId) : of(null),
      invoice: invoiceId ? this.api.invoice(invoiceId) : of(null),
    }).subscribe(({ client, invoice }) => {
      if (client) this.client.set({ id: client.client.id, label: client.client.companyName, data: client.client });
      if (invoice?.number) {
        this.invoice.set({ id: invoice.id, label: invoice.number });
        const first = invoice.lines.find((l) => l.productId);
        if (first?.productId) this.product.set({ id: first.productId, label: first.description });
      }
    });
  }

  protected setClient(pick: PickItem<Client> | null): void {
    if (pick?.id !== this.client()?.id) this.invoice.set(null);
    this.client.set(pick);
  }

  protected save(): void {
    this.submitted.set(true);
    const client = this.client();
    if (!client || !this.subject().trim() || !this.description().trim()) {
      this.error.set('Renseignez le client, l\'objet et la description.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const id = this.id() ? Number(this.id()) : undefined;
    this.api.saveComplaint({
      clientId: client.id,
      invoiceId: this.invoice()?.id ?? null,
      productId: this.product()?.id ?? null,
      subject: this.subject().trim(),
      description: this.description().trim(),
      type: this.type(),
      priority: this.priority(),
      assigneeId: this.assigneeId(),
      estimatedCost: this.estimatedCost(),
    }, id).subscribe({
      next: (c) => {
        this.feedback.success(id ? 'Réclamation mise à jour' : `Réclamation ${c.number} enregistrée`);
        this.router.navigate(['/reclamations', c.id]);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
