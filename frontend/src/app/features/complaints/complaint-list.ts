import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { FrDatePipe, LabelPipe } from '../../core/format';
import { COMPLAINT_PRIORITY, COMPLAINT_TYPE, entries } from '../../core/labels';
import { ComplaintPriority, ComplaintStatus, ComplaintType } from '../../core/models';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';

type Filter = 'ACTIVE' | ComplaintStatus | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ACTIVE', label: 'À traiter' },
  { value: 'OUVERTE', label: 'Ouvertes' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESOLUE', label: 'Résolues' },
  { value: 'CLOTUREE', label: 'Clôturées' },
  { value: null, label: 'Toutes' },
];

@Component({
  selector: 'app-complaint-list',
  imports: [RouterLink, Icon, Pager, StatusBadge, FrDatePipe, LabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Réclamations</h1>
          <p class="lead">Réclamations clients, liées aux factures et aux produits concernés.</p>
        </div>
        <div class="actions">
          <a class="btn btn-primary" routerLink="/reclamations/nouvelle"><app-icon name="plus" /> Nouvelle réclamation</a>
        </div>
      </header>

      <section class="panel">
        <div class="toolbar">
          <div class="input-group grow">
            <app-icon name="search" [size]="15" />
            <input class="input" type="search" placeholder="N°, objet ou client" aria-label="Rechercher une réclamation"
                   [value]="list.q()" (input)="list.search($any($event.target).value)" />
          </div>
          <div class="segmented" role="group" aria-label="Filtrer par statut">
            @for (f of filters; track f.label) {
              <button type="button" [attr.aria-pressed]="filter() === f.value" (click)="setFilter(f.value)">{{ f.label }}</button>
            }
          </div>
          <select class="select narrow" aria-label="Type" (change)="type.set($any($event.target).value || null); list.page.set(0)">
            <option value="">Tous les types</option>
            @for (t of types; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
          </select>
          <select class="select narrow" aria-label="Priorité" (change)="priority.set($any($event.target).value || null); list.page.set(0)">
            <option value="">Toutes priorités</option>
            @for (p of priorities; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
          </select>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('number')" (click)="list.toggleSort('number')">N° {{ list.arrow('number') }}</th>
                <th>Objet</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Responsable</th>
                <th class="sortable right" [attr.aria-sort]="list.ariaSort('openedAt')" (click)="list.toggleSort('openedAt')">Ouverte le {{ list.arrow('openedAt') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (c of rows.value()?.content ?? []; track c.id) {
                <tr class="clickable" (click)="router.navigate(['/reclamations', c.id])">
                  <td><a class="code" [routerLink]="['/reclamations', c.id]" (click)="$event.stopPropagation()">{{ c.number }}</a></td>
                  <td class="primary-cell">{{ c.subject }}
                    <span class="secondary">{{ c.client.label }}@if (c.invoiceNumber) { · {{ c.invoiceNumber }} }@if (c.productReference) { · {{ c.productReference }} }</span>
                  </td>
                  <td>{{ c.type | label: typeLabels }}</td>
                  <td><app-status kind="priority" [value]="c.priority" /></td>
                  <td><app-status kind="complaint" [value]="c.status" /></td>
                  <td class="muted">{{ c.assignee?.label ?? '–' }}</td>
                  <td class="right num">{{ c.openedAt | frDate }}<span class="secondary">{{ c.ageDays }} j</span></td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else { <div class="empty"><strong>Aucune réclamation</strong>Rien ne correspond à ces critères.</div> }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="list.page()" [size]="list.size" [total]="rows.value()?.totalElements ?? 0" (pageChange)="list.page.set($event)" />
      </section>
    </div>
  `,
  styles: `.narrow { width: auto; min-width: 150px; }`,
})
export class ComplaintList {
  private readonly api = inject(Api);
  protected readonly router = inject(Router);
  protected readonly filters = FILTERS;
  protected readonly types = entries(COMPLAINT_TYPE);
  protected readonly priorities = entries(COMPLAINT_PRIORITY);
  protected readonly typeLabels = COMPLAINT_TYPE;

  protected readonly list = new ListState('openedAt');
  protected readonly filter = signal<Filter>('ACTIVE');
  protected readonly type = signal<ComplaintType | null>(null);
  protected readonly priority = signal<ComplaintPriority | null>(null);

  protected readonly rows = rxResource({
    params: () => {
      const f = this.filter();
      return {
        ...this.list.params(), active: f === 'ACTIVE', status: f === 'ACTIVE' ? null : f,
        type: this.type(), priority: this.priority(),
      };
    },
    stream: ({ params }) => this.api.complaints(params),
  });

  protected setFilter(value: Filter): void {
    this.filter.set(value);
    this.list.page.set(0);
  }
}
