import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDateTimePipe, LabelPipe, MoneyPipe, QtyPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { MOVEMENT_TYPE, entries } from '../../core/labels';
import { Product, StockMovementType } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { Lookups } from '../../shared/lookups';
import { Pager } from '../../shared/pager';
import { PickItem, Picker } from '../../shared/picker';

@Component({
  selector: 'app-stock',
  imports: [FormsModule, Icon, Pager, Picker, QtyPipe, MoneyPipe, FrDateTimePipe, LabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Stock</h1>
          <p class="lead">Journal des mouvements : production, livraisons facturées et inventaires.</p>
        </div>
        @if (auth.can('catalogue')) {
          <div class="actions">
            <button type="button" class="btn btn-primary" (click)="openMovement()"><app-icon name="plus" /> Nouveau mouvement</button>
          </div>
        }
      </header>

      @if (selected()?.data; as p) {
        <section class="panel product-strip">
          <div><span class="label">Produit</span><strong>{{ p.name }}</strong><span class="subtle code">{{ p.reference }}</span></div>
          <div><span class="label">En stock</span><strong class="num" [class.warn]="p.lowStock">{{ p.stockQuantity | qty }} {{ p.unit }}</strong></div>
          <div><span class="label">Seuil d'alerte</span><strong class="num">{{ p.minStock | qty }} {{ p.unit }}</strong></div>
          <div><span class="label">Valeur au coût</span><strong class="num">{{ (p.stockQuantity * p.costPrice) | money: false }} TND</strong></div>
        </section>
      }

      <section class="panel">
        <div class="toolbar">
          <app-picker class="grow" [search]="lookups.products" [value]="selected()" (valueChange)="select($any($event))"
                      placeholder="Filtrer par produit…" />
          <div class="segmented" role="group" aria-label="Type de mouvement">
            <button type="button" [attr.aria-pressed]="type() === null" (click)="setType(null)">Tous</button>
            @for (t of types; track t.value) {
              <button type="button" [attr.aria-pressed]="type() === t.value" (click)="setType(t.value)">{{ t.label }}s</button>
            }
          </div>
        </div>
        <div class="table-wrap">
          <table class="table compact">
            <thead>
              <tr><th>Date</th><th>Produit</th><th>Type</th><th>Motif</th><th>Document</th><th class="right">Quantité</th><th class="right">Stock après</th><th>Par</th></tr>
            </thead>
            <tbody>
              @for (m of rows.value()?.content ?? []; track m.id) {
                <tr>
                  <td class="num">{{ m.movementDate | frDateTime }}</td>
                  <td class="primary-cell">{{ m.productName }}<span class="secondary">{{ m.productReference }}</span></td>
                  <td><span class="badge" [class]="'badge ' + tone(m.type)">{{ m.type | label: typeLabels }}</span></td>
                  <td class="muted">{{ m.reason ?? '–' }}</td>
                  <td class="num">{{ m.documentRef ?? '–' }}</td>
                  <td class="right num qty" [class.in]="m.quantity > 0" [class.out]="m.quantity < 0">
                    {{ m.quantity > 0 ? '+' : '' }}{{ m.quantity | qty }} <span class="subtle">{{ m.unit }}</span>
                  </td>
                  <td class="right num primary-cell">{{ m.stockAfter | qty }}</td>
                  <td class="muted">{{ m.createdBy ?? '–' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else { <div class="empty"><strong>Aucun mouvement</strong>Aucun mouvement ne correspond à ces critères.</div> }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="page()" [size]="30" [total]="rows.value()?.totalElements ?? 0" (pageChange)="page.set($event)" />
      </section>
    </div>

    <dialog #dialog class="dialog" (cancel)="closeMovement()">
      <form (ngSubmit)="saveMovement()">
        <div class="dialog-head">
          <div><h2>Nouveau mouvement de stock</h2><p>Les sorties liées aux factures sont enregistrées automatiquement à l'émission.</p></div>
        </div>
        <div class="dialog-body form-grid">
          <div class="field span-12">
            <label>Produit</label>
            <app-picker [search]="lookups.products" [value]="mv.product" (valueChange)="mv.product = $any($event)" placeholder="Référence ou désignation…" />
          </div>
          <div class="field span-12">
            <label>Type</label>
            <div class="segmented" role="group">
              @for (t of types; track t.value) {
                <button type="button" [attr.aria-pressed]="mv.type === t.value" (click)="mv.type = t.value">{{ t.label }}</button>
              }
            </div>
          </div>
          <div class="field span-6">
            <label for="mv-qty">{{ mv.type === 'AJUSTEMENT' ? 'Stock compté' : 'Quantité' }}</label>
            <input id="mv-qty" class="input num" type="number" min="0" step="0.001" name="quantity" [(ngModel)]="mv.quantity" required />
            @if (mv.type === 'AJUSTEMENT' && mv.product?.data; as p) {
              <span class="hint">Stock actuel : {{ p.stockQuantity | qty }} {{ p.unit }} ; l'écart sera enregistré.</span>
            }
          </div>
          <div class="field span-6">
            <label for="mv-ref">Document</label>
            <input id="mv-ref" class="input" name="documentRef" [(ngModel)]="mv.documentRef" maxlength="40" placeholder="OF, BL, bon de réception…" />
          </div>
          <div class="field span-12">
            <label for="mv-reason">Motif</label>
            <input id="mv-reason" class="input" name="reason" [(ngModel)]="mv.reason" maxlength="255"
                   [placeholder]="mv.type === 'ENTREE' ? 'Production atelier, réception fournisseur…' : mv.type === 'SORTIE' ? 'Consommation interne, rebut…' : 'Inventaire'" />
          </div>
          @if (mvError()) { <div class="alert span-12" role="alert"><app-icon name="circle-alert" /> {{ mvError() }}</div> }
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" (click)="closeMovement()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Enregistrer</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .grow { flex: 1 1 260px; max-width: 380px; }
    .product-strip { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; margin-bottom: 20px; }
    .product-strip > div { display: flex; flex-direction: column; gap: 4px; padding: 14px 20px; min-width: 0; }
    .product-strip > div + div { border-left: 1px solid var(--border); }
    .product-strip .label { color: var(--text-3); font-size: 12.5px; }
    .product-strip strong { color: var(--ink); font-size: 15px; font-weight: 600; }
    .product-strip strong.warn { color: var(--warning); }
    .qty.in { color: var(--success); font-weight: 500; }
    .qty.out { color: var(--ink); }
    @media (max-width: 800px) { .product-strip { grid-template-columns: 1fr 1fr; } .product-strip > div:nth-child(3) { border-left: 0; } }
  `,
})
export class StockPage implements OnInit {
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  protected readonly auth = inject(AuthService);
  protected readonly lookups = inject(Lookups);
  /** ?produit=12 filters on one product. */
  readonly produit = input<string>();

  protected readonly types = entries(MOVEMENT_TYPE);
  protected readonly typeLabels = MOVEMENT_TYPE;
  protected readonly selected = signal<PickItem<Product> | null>(null);
  protected readonly type = signal<StockMovementType | null>(null);
  protected readonly page = signal(0);
  private readonly productId = computed(() => this.selected()?.id ?? null);

  protected readonly rows = rxResource({
    params: () => ({ productId: this.productId(), type: this.type(), page: this.page(), size: 30 }),
    stream: ({ params }) => this.api.movements(params),
  });

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected mv: { product: PickItem<Product> | null; type: StockMovementType; quantity: number | null; reason: string; documentRef: string } =
    { product: null, type: 'ENTREE', quantity: null, reason: '', documentRef: '' };
  protected readonly mvError = signal<string | null>(null);
  protected readonly busy = signal(false);

  ngOnInit(): void {
    const id = this.produit() ? Number(this.produit()) : null;
    if (id) this.refreshProduct(id);
  }

  private refreshProduct(id: number): void {
    this.api.product(id).subscribe((p) => this.selected.set({ id: p.id, label: p.name, sub: p.reference, data: p }));
  }

  protected select(pick: PickItem<Product> | null): void {
    this.selected.set(pick);
    this.page.set(0);
  }

  protected setType(t: StockMovementType | null): void {
    this.type.set(t);
    this.page.set(0);
  }

  protected tone(t: StockMovementType): string {
    return t === 'ENTREE' ? 'tone-success' : t === 'SORTIE' ? 'tone-info' : 'tone-warning';
  }

  protected openMovement(): void {
    this.mv = { product: this.selected(), type: 'ENTREE', quantity: null, reason: '', documentRef: '' };
    this.mvError.set(null);
    this.dialog().nativeElement.showModal();
  }

  protected closeMovement(): void {
    this.dialog().nativeElement.close();
  }

  protected saveMovement(): void {
    if (!this.mv.product || this.mv.quantity === null || this.mv.quantity < 0) {
      this.mvError.set('Choisissez un produit et saisissez une quantité.');
      return;
    }
    this.busy.set(true);
    this.api.recordMovement({
      productId: this.mv.product.id, type: this.mv.type, quantity: Number(this.mv.quantity),
      reason: this.mv.reason.trim() || null, documentRef: this.mv.documentRef.trim() || null,
    }).subscribe({
      next: (m) => {
        this.busy.set(false);
        this.closeMovement();
        this.feedback.success(`Mouvement enregistré : stock ${m.productReference} = ${m.stockAfter}`);
        this.rows.reload();
        if (this.selected()?.id === m.productId) this.refreshProduct(m.productId);
      },
      error: (e) => {
        this.busy.set(false);
        this.mvError.set(errorMessage(e));
      },
    });
  }
}
