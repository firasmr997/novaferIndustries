import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { Api } from '../core/api.service';
import { formatMoney } from '../core/format';
import { Client, InvoiceSummary, Product } from '../core/models';
import { PickItem } from './picker';

/** Search functions for the pickers, shared by every form. */
@Injectable({ providedIn: 'root' })
export class Lookups {
  private readonly api = inject(Api);

  readonly clients = (q: string) => this.api.clients({ q, size: 12 }).pipe(
    map((page) => page.content.map((c): PickItem<Client> => ({
      id: c.id, label: c.companyName, sub: [c.code, c.city].filter(Boolean).join(' · '), data: c,
    }))));

  readonly products = (q: string) => this.api.products({ q, size: 12 }).pipe(
    map((page) => page.content.map((p): PickItem<Product> => ({
      id: p.id, label: p.name, sub: `${p.reference} · ${formatMoney(p.unitPrice)} TND / ${p.unit}`, data: p,
    }))));

  invoicesOf(clientId: number | null) {
    return (q: string) => this.api.invoices({ q, clientId, size: 12 }).pipe(
      map((page) => page.content.filter((i) => i.number).map((i): PickItem<InvoiceSummary> => ({
        id: i.id, label: i.number!, sub: `${i.client.label} · ${formatMoney(i.totalTtc)} TND`, data: i,
      }))));
  }
}
