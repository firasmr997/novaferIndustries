import { AfterViewInit, ChangeDetectionStrategy, Component, inject, input, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Client } from '../../core/models';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { Pager } from '../../shared/pager';
import { ClientDialog } from './client-dialog';

@Component({
  selector: 'app-client-list',
  imports: [RouterLink, Icon, Pager, ClientDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Clients</h1>
          <p class="lead">Entreprises clientes, conditions de paiement et identifiants fiscaux.</p>
        </div>
        @if (auth.can('clients')) {
          <div class="actions">
            <button type="button" class="btn btn-primary" (click)="dialog().open()"><app-icon name="plus" /> Nouveau client</button>
          </div>
        }
      </header>

      <section class="panel">
        <div class="toolbar">
          <div class="input-group grow">
            <app-icon name="search" [size]="15" />
            <input class="input" type="search" placeholder="Nom, code ou ville" aria-label="Rechercher un client"
                   [value]="list.q()" (input)="list.search($any($event.target).value)" />
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('code')" (click)="list.toggleSort('code')">Code {{ list.arrow('code') }}</th>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('companyName')" (click)="list.toggleSort('companyName')">Raison sociale {{ list.arrow('companyName') }}</th>
                <th>Contact</th>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('city')" (click)="list.toggleSort('city')">Ville {{ list.arrow('city') }}</th>
                <th>Matricule fiscal</th>
                <th class="right">Délai</th>
              </tr>
            </thead>
            <tbody>
              @for (c of rows.value()?.content ?? []; track c.id) {
                <tr class="clickable" (click)="router.navigate(['/clients', c.id])">
                  <td><span class="code">{{ c.code }}</span></td>
                  <td class="primary-cell"><a [routerLink]="['/clients', c.id]" (click)="$event.stopPropagation()">{{ c.companyName }}</a>
                    <span class="secondary">{{ c.sector }}@if (c.vatExempt) { · suspension de TVA }</span></td>
                  <td>{{ c.contactName ?? '–' }}<span class="secondary">{{ c.phone }}</span></td>
                  <td>{{ c.city ?? '–' }}</td>
                  <td class="num muted">{{ c.matriculeFiscal ?? '–' }}</td>
                  <td class="right num">{{ c.paymentTermsDays }} j</td>
                </tr>
              } @empty {
                <tr><td colspan="6">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else { <div class="empty"><strong>Aucun client</strong>Aucun client ne correspond à cette recherche.</div> }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="list.page()" [size]="list.size" [total]="rows.value()?.totalElements ?? 0" (pageChange)="list.page.set($event)" />
      </section>
    </div>
    <app-client-dialog (saved)="onSaved($event)" />
  `,
})
export class ClientList implements AfterViewInit {
  private readonly api = inject(Api);
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  /** ?nouveau=1 (from the Créer menu) opens the creation dialog. */
  readonly nouveau = input<string>();
  protected readonly dialog = viewChild.required(ClientDialog);

  protected readonly list = new ListState('companyName', 'asc');
  protected readonly rows = rxResource({ params: () => this.list.params(), stream: ({ params }) => this.api.clients(params) });

  ngAfterViewInit(): void {
    if (this.nouveau() && this.auth.can('clients')) queueMicrotask(() => this.dialog().open());
  }

  protected onSaved(client: Client): void {
    this.router.navigate(['/clients', client.id]);
  }
}
