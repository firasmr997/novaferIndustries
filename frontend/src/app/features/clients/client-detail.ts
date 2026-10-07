import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDatePipe, MoneyPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { StatusBadge } from '../../shared/status-badge';
import { ClientDialog } from './client-dialog';

type Tab = 'factures' | 'devis' | 'reclamations';

@Component({
  selector: 'app-client-detail',
  imports: [RouterLink, Icon, StatusBadge, MoneyPipe, FrDatePipe, ClientDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="back-link" routerLink="/clients"><app-icon name="arrow-left" [size]="15" /> Clients</a>
      @if (detail.error()) { <div class="alert" role="alert"><app-icon name="circle-alert" /> Client introuvable.</div> }
      @if (detail.value(); as d) {
        @let c = d.client;
        @let s = d.stats;
        <header class="page-head">
          <div>
            <div class="title-row">
              <h1>{{ c.companyName }}</h1>
              @if (!c.active) { <span class="badge tone-neutral">Archivé</span> }
              @if (c.vatExempt) { <span class="badge tone-ember no-dot">Suspension de TVA</span> }
            </div>
            <p class="lead"><span class="code">{{ c.code }}</span>@if (c.sector) { · {{ c.sector }} }@if (c.city) { · {{ c.city }} }</p>
          </div>
          <div class="actions">
            @if (auth.can('clients')) {
              <button type="button" class="btn" (click)="dialog().open(c)"><app-icon name="pencil" /> Modifier</button>
            }
            <a class="btn" routerLink="/reclamations/nouvelle" [queryParams]="{ client: c.id }"><app-icon name="complaint" /> Réclamation</a>
            @if (auth.can('invoices')) {
              <a class="btn" routerLink="/factures/nouvelle" [queryParams]="{ client: c.id }"><app-icon name="receipt" /> Facture</a>
            }
            @if (auth.can('quotes')) {
              <a class="btn btn-primary" routerLink="/devis/nouveau" [queryParams]="{ client: c.id }"><app-icon name="file-text" /> Nouveau devis</a>
            }
          </div>
        </header>

        <section class="panel kpis">
          <div><span class="label">CA {{ year }} (HT)</span><span class="amount-lg num">{{ s.revenueYtd | money: false }}<span class="currency">TND</span></span></div>
          <div><span class="label">Encours (TTC)</span><span class="amount-lg num">{{ s.openBalance | money: false }}<span class="currency">TND</span></span></div>
          <div><span class="label">Dont en retard</span><span class="amount-lg num" [class.danger]="s.overdueBalance > 0">{{ s.overdueBalance | money: false }}<span class="currency">TND</span></span></div>
          <div><span class="label">Délai moyen de paiement</span><span class="amount-lg num">{{ s.averagePaymentDays ?? '–' }}<span class="currency">jours</span></span>
            <span class="sub">Conditions : {{ c.paymentTermsDays }} j</span></div>
        </section>

        <div class="grid-main row">
          <section class="panel">
            <div class="toolbar">
              <div class="segmented" role="tablist">
                <button type="button" role="tab" [attr.aria-pressed]="tab() === 'factures'" (click)="tab.set('factures')">Factures · {{ s.invoiceCount }}</button>
                <button type="button" role="tab" [attr.aria-pressed]="tab() === 'devis'" (click)="tab.set('devis')">Devis · {{ s.quoteCount }}</button>
                <button type="button" role="tab" [attr.aria-pressed]="tab() === 'reclamations'" (click)="tab.set('reclamations')">Réclamations</button>
              </div>
            </div>
            <div class="table-wrap">
              @switch (tab()) {
                @case ('factures') {
                  <table class="table compact">
                    <thead><tr><th>N°</th><th>Date</th><th>Échéance</th><th>Statut</th><th class="right">Total TTC</th><th class="right">Reste</th></tr></thead>
                    <tbody>
                      @for (i of invoices.value()?.content ?? []; track i.id) {
                        <tr class="clickable" (click)="router.navigate(['/factures', i.id])">
                          <td><span class="code">{{ i.number ?? 'Brouillon' }}</span></td>
                          <td class="num">{{ i.issueDate | frDate }}</td>
                          <td class="num" [class.overdue-text]="i.overdue">{{ i.dueDate | frDate }}</td>
                          <td><app-status kind="invoice" [value]="i.status" [overdue]="i.overdue" /></td>
                          <td class="right num">{{ i.totalTtc | money }}</td>
                          <td class="right num primary-cell">{{ i.status === 'ANNULEE' ? '–' : (i.balanceDue | money) }}</td>
                        </tr>
                      } @empty { <tr><td colspan="6"><div class="empty">Aucune facture.</div></td></tr> }
                    </tbody>
                  </table>
                }
                @case ('devis') {
                  <table class="table compact">
                    <thead><tr><th>N°</th><th>Objet</th><th>Date</th><th>Statut</th><th class="right">Total HT</th></tr></thead>
                    <tbody>
                      @for (q of quotes.value()?.content ?? []; track q.id) {
                        <tr class="clickable" (click)="router.navigate(['/devis', q.id])">
                          <td><span class="code">{{ q.number }}</span></td>
                          <td>{{ q.subject ?? '–' }}</td>
                          <td class="num">{{ q.issueDate | frDate }}</td>
                          <td><app-status kind="quote" [value]="q.status" /></td>
                          <td class="right num primary-cell">{{ q.totalHt | money }}</td>
                        </tr>
                      } @empty { <tr><td colspan="5"><div class="empty">Aucun devis.</div></td></tr> }
                    </tbody>
                  </table>
                }
                @case ('reclamations') {
                  <table class="table compact">
                    <thead><tr><th>N°</th><th>Objet</th><th>Priorité</th><th>Statut</th><th class="right">Ouverte le</th></tr></thead>
                    <tbody>
                      @for (r of complaints.value()?.content ?? []; track r.id) {
                        <tr class="clickable" (click)="router.navigate(['/reclamations', r.id])">
                          <td><span class="code">{{ r.number }}</span></td>
                          <td class="primary-cell">{{ r.subject }}</td>
                          <td><app-status kind="priority" [value]="r.priority" /></td>
                          <td><app-status kind="complaint" [value]="r.status" /></td>
                          <td class="right num">{{ r.openedAt | frDate }}</td>
                        </tr>
                      } @empty { <tr><td colspan="5"><div class="empty">Aucune réclamation.</div></td></tr> }
                    </tbody>
                  </table>
                }
              }
            </div>
          </section>

          <div class="stack">
            <section class="panel">
              <div class="panel-head"><h2>Coordonnées</h2></div>
              <div class="panel-body">
                <dl class="dl">
                  <dt>Contact</dt><dd>{{ c.contactName ?? '–' }}</dd>
                  <dt>Téléphone</dt><dd class="num">{{ c.phone ?? '–' }}</dd>
                  <dt>E-mail</dt><dd>@if (c.email) { <a [href]="'mailto:' + c.email">{{ c.email }}</a> } @else { – }</dd>
                  <dt>Adresse</dt><dd>{{ c.address ?? '–' }}@if (c.city) { <br />{{ c.city }} }</dd>
                  <dt>Matricule fiscal</dt><dd class="num">{{ c.matriculeFiscal ?? '–' }}</dd>
                  <dt>CA cumulé</dt><dd class="num">{{ s.revenueTotal | money }} TND HT</dd>
                  <dt>Réclamations</dt><dd class="num">{{ s.openComplaintCount }} ouverte{{ s.openComplaintCount > 1 ? 's' : '' }}</dd>
                </dl>
              </div>
            </section>
            @if (c.notes) {
              <section class="panel"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body notes">{{ c.notes }}</div></section>
            }
            @if (auth.can('clients') && c.active) {
              <button type="button" class="btn btn-danger" (click)="archive()"><app-icon name="trash" /> Archiver le client</button>
            }
          </div>
        </div>
        <app-client-dialog (saved)="detail.reload()" />
      } @else if (detail.isLoading()) {
        <div class="panel panel-body"><span class="skeleton"></span></div>
      }
    </div>
  `,
  styles: `
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .row { margin-top: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .kpis > div { display: flex; flex-direction: column; gap: 6px; padding: 16px 20px; }
    .kpis > div + div { border-left: 1px solid var(--border); }
    .kpis .label { color: var(--text-2); font-size: 13px; font-weight: 500; }
    .kpis .amount-lg { font-size: 22px; }
    .kpis .amount-lg.danger { color: var(--danger); }
    .kpis .sub { color: var(--text-3); font-size: 12.5px; }
    .notes { white-space: pre-line; }
    @media (max-width: 900px) {
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .kpis > div:nth-child(3) { border-left: 0; }
      .kpis > div:nth-child(n + 3) { border-top: 1px solid var(--border); }
    }
  `,
})
export class ClientDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly dialog = viewChild.required(ClientDialog);
  protected readonly year = new Date().getFullYear();
  protected readonly tab = signal<Tab>('factures');

  private readonly clientId = computed(() => Number(this.id()));
  protected readonly detail = rxResource({ params: () => this.clientId(), stream: ({ params }) => this.api.client(params) });
  protected readonly invoices = rxResource({
    params: () => this.clientId(), stream: ({ params }) => this.api.invoices({ clientId: params, size: 50 }),
  });
  protected readonly quotes = rxResource({
    params: () => (this.tab() === 'devis' ? this.clientId() : undefined),
    stream: ({ params }) => this.api.quotes({ clientId: params, size: 50 }),
  });
  protected readonly complaints = rxResource({
    params: () => (this.tab() === 'reclamations' ? this.clientId() : undefined),
    stream: ({ params }) => this.api.complaints({ clientId: params, size: 50 }),
  });

  protected async archive(): Promise<void> {
    const name = this.detail.value()?.client.companyName;
    const ok = await this.feedback.confirm({
      title: `Archiver ${name} ?`,
      message: 'Le client n\'apparaîtra plus dans les recherches. Ses documents restent consultables.',
      confirmLabel: 'Archiver',
      danger: true,
    });
    if (!ok) return;
    this.api.archiveClient(this.clientId()).subscribe({
      next: () => {
        this.feedback.success('Client archivé');
        this.detail.reload();
      },
      error: (e) => this.feedback.error(errorMessage(e)),
    });
  }
}
