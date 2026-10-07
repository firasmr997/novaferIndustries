import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDatePipe, MoneyPipe } from '../../core/format';
import { QuoteStatus, QuoteSummary } from '../../core/models';
import { errorMessage } from '../../core/http';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';

const FILTERS: { value: QuoteStatus | null; label: string }[] = [
  { value: null, label: 'Tous' },
  { value: 'BROUILLON', label: 'Brouillons' },
  { value: 'ENVOYE', label: 'Envoyés' },
  { value: 'ACCEPTE', label: 'Acceptés' },
  { value: 'FACTURE', label: 'Facturés' },
  { value: 'REFUSE', label: 'Refusés' },
  { value: 'EXPIRE', label: 'Expirés' },
];

@Component({
  selector: 'app-quote-list',
  imports: [RouterLink, Icon, Pager, StatusBadge, MoneyPipe, FrDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `.actions-cell { width: 1%; }`,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Devis</h1>
          <p class="lead">Offres de prix adressées aux clients, de la rédaction à la facturation.</p>
        </div>
        @if (auth.can('quotes')) {
          <div class="actions">
            <a class="btn btn-primary" routerLink="/devis/nouveau"><app-icon name="plus" /> Nouveau devis</a>
          </div>
        }
      </header>

      <section class="panel">
        <div class="toolbar">
          <div class="input-group grow">
            <app-icon name="search" [size]="15" />
            <input class="input" type="search" placeholder="N°, client ou objet" aria-label="Rechercher un devis"
                   [value]="list.q()" (input)="list.search($any($event.target).value)" />
          </div>
          <div class="segmented" role="group" aria-label="Filtrer par statut">
            @for (f of filters; track f.label) {
              <button type="button" [attr.aria-pressed]="status() === f.value" (click)="setStatus(f.value)">{{ f.label }}</button>
            }
          </div>
        </div>
        <div class="table-wrap">
          <table class="table stack-sm">
            <thead>
              <tr>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('number')" (click)="list.toggleSort('number')">N° {{ list.arrow('number') }}</th>
                <th>Client</th>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('issueDate')" (click)="list.toggleSort('issueDate')">Date {{ list.arrow('issueDate') }}</th>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('validUntil')" (click)="list.toggleSort('validUntil')">Validité {{ list.arrow('validUntil') }}</th>
                <th>Statut</th>
                <th class="right">Montant HT</th>
                <th class="sortable right" [attr.aria-sort]="list.ariaSort('totalTtc')" (click)="list.toggleSort('totalTtc')">Total TTC {{ list.arrow('totalTtc') }}</th>
                <th><span class="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (q of rows.value()?.content ?? []; track q.id) {
                <tr class="clickable" (click)="router.navigate(['/devis', q.id])">
                  <td><a class="code" [routerLink]="['/devis', q.id]" (click)="$event.stopPropagation()">{{ q.number }}</a></td>
                  <td class="primary-cell">{{ q.client.label }}<span class="secondary">{{ q.subject }}</span></td>
                  <td class="num hide-sm">{{ q.issueDate | frDate }}</td>
                  <td class="num hide-sm">{{ q.validUntil | frDate }}</td>
                  <td><app-status kind="quote" [value]="q.status" /></td>
                  <td class="right num hide-sm">{{ q.totalHt | money }}</td>
                  <td class="right num primary-cell">{{ q.totalTtc | money }}</td>
                  <td class="right actions-cell">
                    @if (q.status === 'ACCEPTE' && auth.can('quotes')) {
                      <button type="button" class="btn btn-sm" [disabled]="converting() === q.id" (click)="$event.stopPropagation(); convert(q)">Facturer</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else {
                    <div class="empty">
                      <strong>Aucun devis</strong>
                      {{ list.query() || status() ? 'Aucun devis ne correspond à ces critères.' : 'Les devis créés apparaîtront ici.' }}
                    </div>
                  }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="list.page()" [size]="list.size" [total]="rows.value()?.totalElements ?? 0" (pageChange)="list.page.set($event)" />
      </section>
    </div>
  `,
})
export class QuoteList implements OnInit {
  private readonly api = inject(Api);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly feedback = inject(Feedback);
  /** Query parameter ?statut=ENVOYE preselects a filter. */
  readonly statut = input<string>();

  protected readonly filters = FILTERS;
  protected readonly list = new ListState('issueDate');
  protected readonly status = signal<QuoteStatus | null>(null);

  protected readonly rows = rxResource({
    params: () => ({ ...this.list.params(), status: this.status() }),
    stream: ({ params }) => this.api.quotes(params),
  });

  ngOnInit(): void {
    const s = this.statut();
    if (s && FILTERS.some((f) => f.value === s)) this.status.set(s as QuoteStatus);
  }

  protected readonly converting = signal<number | null>(null);

  /** Turns an accepted devis into a draft facture and opens it. */
  protected convert(q: QuoteSummary): void {
    this.converting.set(q.id);
    this.api.convertQuote(q.id).subscribe({
      next: (invoice) => {
        this.feedback.success(`Facture brouillon créée depuis ${q.number}`);
        this.router.navigate(['/factures', invoice.id]);
      },
      error: (e) => {
        this.converting.set(null);
        this.feedback.error(errorMessage(e));
      },
    });
  }

  protected setStatus(value: QuoteStatus | null): void {
    this.status.set(value);
    this.list.page.set(0);
  }
}
