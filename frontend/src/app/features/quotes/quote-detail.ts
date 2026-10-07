import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDatePipe, FrDateTimePipe, MoneyPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { QuoteDetail } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { StatusBadge } from '../../shared/status-badge';
import { DocLines } from '../documents/doc-lines';

@Component({
  selector: 'app-quote-detail',
  imports: [RouterLink, Icon, StatusBadge, DocLines, MoneyPipe, FrDatePipe, FrDateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="back-link" routerLink="/devis"><app-icon name="arrow-left" [size]="15" /> Devis</a>
      @if (quote.error()) {
        <div class="alert" role="alert"><app-icon name="circle-alert" /> Ce devis est introuvable ou n'a pas pu être chargé.</div>
      }
      @if (quote.value(); as q) {
        <header class="page-head">
          <div>
            <div class="title-row">
              <h1>Devis {{ q.number }}</h1>
              <app-status kind="quote" [value]="q.status" />
            </div>
            <p class="lead"><a [routerLink]="['/clients', q.client.id]">{{ q.client.companyName }}</a>
              @if (q.subject) { · {{ q.subject }} }</p>
          </div>
          <div class="actions">
            <a class="btn" [routerLink]="['/imprimer', 'devis', q.id]" target="_blank"><app-icon name="printer" /> Imprimer / PDF</a>
            @if (canEdit()) {
              <button type="button" class="btn" (click)="duplicate(q)" [disabled]="busy()"><app-icon name="copy" /> Dupliquer</button>
              @if (q.status === 'BROUILLON' || q.status === 'ENVOYE') {
                <a class="btn" [routerLink]="['/devis', q.id, 'modifier']"><app-icon name="pencil" /> Modifier</a>
              }
              @switch (q.status) {
                @case ('BROUILLON') {
                  <button type="button" class="btn btn-primary" (click)="act(q, 'SEND')" [disabled]="busy()"><app-icon name="send" /> Marquer comme envoyé</button>
                }
                @case ('ENVOYE') {
                  <button type="button" class="btn" (click)="act(q, 'REFUSE')" [disabled]="busy()"><app-icon name="x-circle" /> Refusé</button>
                  <button type="button" class="btn" (click)="act(q, 'ACCEPT')" [disabled]="busy()"><app-icon name="check" /> Accepté</button>
                  <button type="button" class="btn btn-primary" (click)="convert(q)" [disabled]="busy()"><app-icon name="receipt" /> Facturer</button>
                }
                @case ('ACCEPTE') {
                  <button type="button" class="btn btn-primary" (click)="convert(q)" [disabled]="busy()"><app-icon name="receipt" /> Facturer</button>
                }
                @case ('REFUSE') {
                  <button type="button" class="btn" (click)="act(q, 'REOPEN')" [disabled]="busy()"><app-icon name="undo" /> Rouvrir</button>
                }
                @case ('EXPIRE') {
                  <button type="button" class="btn" (click)="act(q, 'REOPEN')" [disabled]="busy()"><app-icon name="undo" /> Rouvrir</button>
                }
              }
            }
            @if (q.convertedInvoiceId) {
              <a class="btn btn-primary" [routerLink]="['/factures', q.convertedInvoiceId]"><app-icon name="receipt" />
                Voir la facture {{ q.convertedInvoiceNumber ?? '' }}</a>
            }
          </div>
        </header>

        <div class="grid-main">
          <section class="panel">
            <div class="panel-head"><h2>Détail du devis</h2><span class="subtle num">{{ q.lines.length }} ligne{{ q.lines.length > 1 ? 's' : '' }}</span></div>
            <app-doc-lines [lines]="q.lines" [totals]="q.totals" />
          </section>

          <div class="stack">
            <section class="panel">
              <div class="panel-head"><h2>Informations</h2></div>
              <div class="panel-body">
                <dl class="dl">
                  <dt>Client</dt><dd><a [routerLink]="['/clients', q.client.id]">{{ q.client.companyName }}</a></dd>
                  @if (q.client.matriculeFiscal) { <dt>Matricule fiscal</dt><dd class="num">{{ q.client.matriculeFiscal }}</dd> }
                  <dt>Date</dt><dd class="num">{{ q.issueDate | frDate: true }}</dd>
                  <dt>Valable jusqu'au</dt><dd class="num">{{ q.validUntil | frDate: true }}</dd>
                  <dt>Total HT</dt><dd class="num">{{ q.totals.totalHt | money }} TND</dd>
                  <dt>Créé par</dt><dd>{{ q.createdBy ?? '–' }}</dd>
                  <dt>Modifié le</dt><dd class="num">{{ q.updatedAt | frDateTime }}</dd>
                </dl>
              </div>
            </section>
            @if (q.notes) {
              <section class="panel">
                <div class="panel-head"><h2>Notes</h2></div>
                <div class="panel-body notes">{{ q.notes }}</div>
              </section>
            }
            @if (q.status === 'BROUILLON' && canEdit()) {
              <button type="button" class="btn btn-danger" (click)="remove(q)"><app-icon name="trash" /> Supprimer le brouillon</button>
            }
          </div>
        </div>
      } @else if (quote.isLoading()) {
        <div class="panel panel-body"><span class="skeleton"></span></div>
      }
    </div>
  `,
  styles: `
    .title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .notes { white-space: pre-line; color: var(--text); }
  `,
})
export class QuoteDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly feedback = inject(Feedback);
  private readonly auth = inject(AuthService);

  protected readonly busy = signal(false);
  protected readonly canEdit = computed(() => this.auth.can('quotes'));
  protected readonly quote = rxResource({ params: () => Number(this.id()), stream: ({ params }) => this.api.quote(params) });

  private run<T>(request: Observable<T>, done: (value: T) => void): void {
    this.busy.set(true);
    request.subscribe({
      next: (value) => {
        this.busy.set(false);
        done(value);
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.error(errorMessage(e));
      },
    });
  }

  protected act(q: QuoteDetail, action: 'SEND' | 'ACCEPT' | 'REFUSE' | 'REOPEN'): void {
    const messages = { SEND: 'Devis marqué comme envoyé', ACCEPT: 'Devis accepté', REFUSE: 'Devis marqué comme refusé', REOPEN: 'Devis rouvert en brouillon' };
    this.run(this.api.quoteAction(q.id, action), (updated) => {
      this.quote.set(updated);
      this.feedback.success(messages[action]);
    });
  }

  protected async convert(q: QuoteDetail): Promise<void> {
    const ok = await this.feedback.confirm({
      title: 'Facturer ce devis ?',
      message: `Une facture brouillon sera créée pour ${q.client.companyName} avec les ${q.lines.length} lignes du devis. Vous pourrez la vérifier avant de l'émettre.`,
      confirmLabel: 'Créer la facture',
    });
    if (!ok) return;
    this.run(this.api.convertQuote(q.id), (invoice) => {
      this.feedback.success('Facture brouillon créée');
      this.router.navigate(['/factures', invoice.id]);
    });
  }

  protected duplicate(q: QuoteDetail): void {
    this.run(this.api.duplicateQuote(q.id), (copy) => {
      this.feedback.success(`Devis dupliqué : ${copy.number}`);
      this.router.navigate(['/devis', copy.id]);
    });
  }

  protected async remove(q: QuoteDetail): Promise<void> {
    const ok = await this.feedback.confirm({
      title: `Supprimer le devis ${q.number} ?`,
      message: 'Ce brouillon sera définitivement supprimé.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.run(this.api.deleteQuote(q.id), () => {
      this.feedback.success('Devis supprimé');
      this.router.navigate(['/devis']);
    });
  }
}
