import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { FrDateTimePipe, LabelPipe, MoneyPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { COMPLAINT_STATUS, COMPLAINT_TYPE } from '../../core/labels';
import { ComplaintDetail, ComplaintStatus } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { StatusBadge } from '../../shared/status-badge';

/** The next steps offered from each status. */
const NEXT: Record<ComplaintStatus, { to: ComplaintStatus; label: string; primary?: boolean }[]> = {
  OUVERTE: [{ to: 'EN_COURS', label: 'Prendre en charge', primary: true }, { to: 'RESOLUE', label: 'Résoudre' }],
  EN_COURS: [{ to: 'RESOLUE', label: 'Résoudre', primary: true }],
  RESOLUE: [{ to: 'CLOTUREE', label: 'Clôturer', primary: true }, { to: 'EN_COURS', label: 'Rouvrir' }],
  CLOTUREE: [],
};

@Component({
  selector: 'app-complaint-detail',
  imports: [RouterLink, Icon, StatusBadge, FrDateTimePipe, LabelPipe, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <a class="back-link" routerLink="/reclamations"><app-icon name="arrow-left" [size]="15" /> Réclamations</a>
      @if (complaint.error()) { <div class="alert" role="alert"><app-icon name="circle-alert" /> Réclamation introuvable.</div> }
      @if (complaint.value(); as c) {
        <header class="page-head">
          <div>
            <div class="title-row">
              <h1>{{ c.subject }}</h1>
              <app-status kind="complaint" [value]="c.status" />
              <app-status kind="priority" [value]="c.priority" />
            </div>
            <p class="lead"><span class="code">{{ c.number }}</span> · <a [routerLink]="['/clients', c.client.id]">{{ c.client.label }}</a>
              · ouverte le {{ c.openedAt | frDateTime }}</p>
          </div>
          <div class="actions">
            @if (c.status !== 'CLOTUREE') {
              <a class="btn" [routerLink]="['/reclamations', c.id, 'modifier']"><app-icon name="pencil" /> Modifier</a>
            }
            @for (n of next(); track n.to) {
              <button type="button" class="btn" [class.btn-primary]="n.primary" (click)="startTransition(n.to)">{{ n.label }}</button>
            }
          </div>
        </header>

        <div class="grid-main">
          <div class="stack">
            <section class="panel">
              <div class="panel-head"><h2>Description</h2></div>
              <div class="panel-body prose">{{ c.description }}</div>
            </section>

            @if (transition(); as t) {
              <section class="panel transition">
                <div class="panel-head">
                  <h2>{{ t === 'RESOLUE' || t === 'CLOTUREE' ? 'Solution apportée' : 'Changer le statut' }}</h2>
                  <span>Nouveau statut : {{ t | label: statusLabels }}</span>
                </div>
                <div class="panel-body form-grid">
                  @if (t === 'RESOLUE' || t === 'CLOTUREE') {
                    <div class="field span-12">
                      <label for="resolution">Solution</label>
                      <textarea id="resolution" class="textarea" rows="3" [value]="resolution()" (input)="resolution.set($any($event.target).value)"
                                placeholder="Action corrective, remplacement, avoir…"></textarea>
                    </div>
                  }
                  <div class="field span-12">
                    <label for="comment">Commentaire (facultatif)</label>
                    <input id="comment" class="input" [value]="comment()" (input)="comment.set($any($event.target).value)" />
                  </div>
                </div>
                <div class="panel-foot">
                  <span></span>
                  <div class="row-actions">
                    <button type="button" class="btn" (click)="transition.set(null)">Annuler</button>
                    <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirmTransition(c, t)">Valider</button>
                  </div>
                </div>
              </section>
            }

            <section class="panel">
              <div class="panel-head"><h2>Historique</h2><span class="subtle num">{{ c.events.length }}</span></div>
              <ol class="timeline">
                @for (e of c.events; track e.id) {
                  <li>
                    <span class="node" [class.status]="e.toStatus"></span>
                    <div class="entry">
                      <div class="meta"><strong>{{ e.author }}</strong>
                        @if (e.toStatus) {
                          <span>{{ e.fromStatus ? (e.fromStatus | label: statusLabels) + ' → ' : '' }}{{ e.toStatus | label: statusLabels }}</span>
                        }
                        <time class="num">{{ e.createdAt | frDateTime }}</time>
                      </div>
                      @if (e.message) { <p>{{ e.message }}</p> }
                    </div>
                  </li>
                }
              </ol>
              @if (c.status !== 'CLOTUREE') {
                <form class="comment-box" (submit)="$event.preventDefault(); addComment(c)">
                  <input class="input" placeholder="Ajouter un commentaire…" aria-label="Ajouter un commentaire"
                         [value]="note()" (input)="note.set($any($event.target).value)" />
                  <button type="submit" class="btn" [disabled]="!note().trim() || busy()">Publier</button>
                </form>
              }
            </section>
          </div>

          <div class="stack">
            <section class="panel">
              <div class="panel-head"><h2>Informations</h2></div>
              <div class="panel-body">
                <dl class="dl">
                  <dt>Client</dt><dd><a [routerLink]="['/clients', c.client.id]">{{ c.client.label }}</a></dd>
                  <dt>Type</dt><dd>{{ c.type | label: typeLabels }}</dd>
                  <dt>Responsable</dt><dd>{{ c.assignee?.label ?? 'Non attribuée' }}</dd>
                  <dt>Facture</dt><dd>@if (c.invoiceId) { <a [routerLink]="['/factures', c.invoiceId]">{{ c.invoiceNumber }}</a> } @else { – }</dd>
                  <dt>Produit</dt><dd>{{ c.productName ?? '–' }} @if (c.productReference) { <span class="subtle">· {{ c.productReference }}</span> }</dd>
                  <dt>Coût estimé</dt><dd class="num">{{ c.estimatedCost !== null ? (c.estimatedCost | money) + ' TND' : '–' }}</dd>
                  <dt>{{ c.resolvedAt ? 'Résolue en' : 'Ouverte depuis' }}</dt><dd class="num">{{ c.ageDays }} jour{{ c.ageDays > 1 ? 's' : '' }}</dd>
                  <dt>Saisie par</dt><dd>{{ c.createdBy ?? '–' }}</dd>
                </dl>
              </div>
            </section>
            @if (c.resolution) {
              <section class="panel">
                <div class="panel-head"><h2>Solution</h2></div>
                <div class="panel-body prose">{{ c.resolution }}</div>
              </section>
            }
          </div>
        </div>
      } @else if (complaint.isLoading()) {
        <div class="panel panel-body"><span class="skeleton"></span></div>
      }
    </div>
  `,
  styles: `
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .prose { white-space: pre-line; max-width: 72ch; }
    .transition { border-color: var(--cobalt-200); box-shadow: var(--ring); }
    .transition .panel-head span { color: var(--cobalt-600); font-weight: 500; font-size: 13px; }
    .timeline { margin: 0; padding: 16px 20px 4px; list-style: none; }
    .timeline li { position: relative; display: flex; gap: 14px; padding-bottom: 18px; }
    .timeline li:not(:last-child)::before {
      content: ''; position: absolute; left: 5px; top: 16px; bottom: 0; width: 1px; background: var(--border);
    }
    .node { flex: none; width: 11px; height: 11px; margin-top: 4px; border-radius: 50%; background: var(--surface); border: 2px solid var(--border-strong); }
    .node.status { background: var(--cobalt-500); border-color: var(--cobalt-500); }
    .entry { min-width: 0; }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; font-size: 13px; }
    .meta strong { color: var(--ink); font-weight: 600; }
    .meta span { color: var(--cobalt-700); font-weight: 500; }
    .meta time { color: var(--text-3); font-size: 12.5px; }
    .entry p { margin-top: 3px; color: var(--text); max-width: 70ch; }
    .comment-box { display: flex; gap: 8px; padding: 14px 20px 18px; border-top: 1px solid var(--border); }
  `,
})
export class ComplaintDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);

  protected readonly statusLabels = COMPLAINT_STATUS;
  protected readonly typeLabels = COMPLAINT_TYPE;
  protected readonly complaint = rxResource({ params: () => Number(this.id()), stream: ({ params }) => this.api.complaint(params) });
  protected readonly next = computed(() => NEXT[this.complaint.value()?.status ?? 'CLOTUREE']);

  protected readonly transition = signal<ComplaintStatus | null>(null);
  protected readonly resolution = signal('');
  protected readonly comment = signal('');
  protected readonly note = signal('');
  protected readonly busy = signal(false);

  protected startTransition(to: ComplaintStatus): void {
    this.resolution.set(this.complaint.value()?.resolution ?? '');
    this.comment.set('');
    this.transition.set(to);
  }

  protected confirmTransition(c: ComplaintDetail, to: ComplaintStatus): void {
    this.busy.set(true);
    this.api.complaintStatus(c.id, to, this.comment().trim() || null, this.resolution().trim() || null).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.transition.set(null);
        this.complaint.set(updated);
        this.feedback.success(`Réclamation ${COMPLAINT_STATUS[to].toLowerCase()}`);
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.error(errorMessage(e));
      },
    });
  }

  protected addComment(c: ComplaintDetail): void {
    const text = this.note().trim();
    if (!text) return;
    this.busy.set(true);
    this.api.complaintComment(c.id, text).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.note.set('');
        this.complaint.set(updated);
      },
      error: (e) => {
        this.busy.set(false);
        this.feedback.error(errorMessage(e));
      },
    });
  }
}
