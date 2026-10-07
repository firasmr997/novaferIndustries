import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDatePipe, MoneyPipe } from '../../core/format';
import { InvoiceStatus } from '../../core/models';
import { heatOf } from '../../shared/aging';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';

type Filter = InvoiceStatus | 'RETARD' | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: null, label: 'Toutes' },
  { value: 'RETARD', label: 'En retard' },
  { value: 'EMISE', label: 'Émises' },
  { value: 'PARTIELLEMENT_PAYEE', label: 'Partiellement payées' },
  { value: 'PAYEE', label: 'Payées' },
  { value: 'BROUILLON', label: 'Brouillons' },
  { value: 'ANNULEE', label: 'Annulées' },
];

@Component({
  selector: 'app-invoice-list',
  imports: [RouterLink, Icon, Pager, StatusBadge, MoneyPipe, FrDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Factures</h1>
          <p class="lead">Factures clients, règlements et suivi des échéances.</p>
        </div>
        @if (auth.can('invoices')) {
          <div class="actions">
            <a class="btn btn-primary" routerLink="/factures/nouvelle"><app-icon name="plus" /> Nouvelle facture</a>
          </div>
        }
      </header>

      <section class="panel">
        <div class="toolbar">
          <div class="input-group grow">
            <app-icon name="search" [size]="15" />
            <input class="input" type="search" placeholder="N°, client ou objet" aria-label="Rechercher une facture"
                   [value]="list.q()" (input)="list.search($any($event.target).value)" />
          </div>
          <div class="segmented" role="group" aria-label="Filtrer par statut">
            @for (f of filters; track f.label) {
              <button type="button" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button>
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
                <th class="sortable" [attr.aria-sort]="list.ariaSort('dueDate')" (click)="list.toggleSort('dueDate')">Échéance {{ list.arrow('dueDate') }}</th>
                <th>Statut</th>
                <th class="sortable right" [attr.aria-sort]="list.ariaSort('totalTtc')" (click)="list.toggleSort('totalTtc')">Total TTC {{ list.arrow('totalTtc') }}</th>
                <th class="right">Reste à payer</th>
                <th><span class="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (i of rows.value()?.content ?? []; track i.id) {
                <tr class="clickable" (click)="router.navigate(['/factures', i.id])">
                  <td>
                    <a class="code" [routerLink]="['/factures', i.id]" (click)="$event.stopPropagation()">{{ i.number ?? 'Brouillon' }}</a>
                  </td>
                  <td class="primary-cell">{{ i.client.label }}<span class="secondary">{{ i.subject }}</span></td>
                  <td class="num hide-sm">{{ i.issueDate | frDate }}</td>
                  <td class="num">
                    @if (i.overdue) {
                      <span class="due"><span class="age-dot" [class]="'age-dot heat-' + heat(i.daysOverdue)"></span>
                        {{ i.dueDate | frDate }} <span class="overdue-text">+{{ i.daysOverdue }} j</span></span>
                    } @else { {{ i.dueDate | frDate }} }
                  </td>
                  <td><app-status kind="invoice" [value]="i.status" [overdue]="i.overdue" /></td>
                  <td class="right num hide-sm">{{ i.totalTtc | money }}</td>
                  <td class="right num primary-cell" [class.subtle]="i.balanceDue === 0 || i.status === 'ANNULEE'">
                    {{ i.status === 'ANNULEE' ? '–' : (i.balanceDue | money) }}
                  </td>
                  <td class="right actions-cell">
                    @if (i.overdue) {
                      <div class="row-actions nowrap">
                        @if (auth.can('invoices')) {
                          <a class="btn btn-sm" [routerLink]="['/factures', i.id]" [queryParams]="{ encaisser: 1 }" (click)="$event.stopPropagation()">Encaisser</a>
                        }
                        <a class="btn btn-sm btn-ghost" [routerLink]="['/imprimer', 'relance', i.id]" target="_blank" (click)="$event.stopPropagation()">Relancer</a>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else {
                    <div class="empty">
                      <strong>Aucune facture</strong>
                      {{ list.query() || filter() ? 'Aucune facture ne correspond à ces critères.' : 'Les factures créées apparaîtront ici.' }}
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
  styles: `.due { display: inline-flex; align-items: center; gap: 7px; } .nowrap { flex-wrap: nowrap; justify-content: flex-end; gap: 4px; } .actions-cell { width: 1%; }`,
})
export class InvoiceList implements OnInit {
  private readonly api = inject(Api);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  /** ?retard=1 opens on overdue factures, ?statut=… on a status. */
  readonly retard = input<string>();
  readonly statut = input<string>();

  protected readonly filters = FILTERS;
  protected readonly list = new ListState('issueDate');
  protected readonly filter = signal<Filter>(null);
  private readonly apiFilter = computed(() => {
    const f = this.filter();
    return f === 'RETARD' ? { overdue: true, status: null } : { overdue: false, status: f };
  });

  protected readonly rows = rxResource({
    params: () => ({ ...this.list.params(), ...this.apiFilter() }),
    stream: ({ params }) => this.api.invoices(params),
  });

  ngOnInit(): void {
    if (this.retard()) {
      this.filter.set('RETARD');
      this.list.sort.set('dueDate');
      this.list.dir.set('asc');
    } else if (this.statut() && FILTERS.some((f) => f.value === this.statut())) {
      this.filter.set(this.statut() as InvoiceStatus);
    }
  }

  protected setFilter(value: Filter): void {
    this.filter.set(value);
    this.list.page.set(0);
  }

  protected heat(days: number): number {
    return heatOf(days);
  }
}
