import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MoneyPipe, PctPipe, QtyPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { Category, Product } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';
import { ListState } from '../../shared/list-state';
import { Pager } from '../../shared/pager';
import { ProductDialog } from './product-dialog';

@Component({
  selector: 'app-product-list',
  imports: [FormsModule, RouterLink, Icon, Pager, ProductDialog, MoneyPipe, QtyPipe, PctPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Produits</h1>
          <p class="lead">Catalogue des pièces fabriquées et négociées, avec prix, marge et niveau de stock.</p>
        </div>
        @if (auth.can('catalogue')) {
          <div class="actions">
            <button type="button" class="btn" (click)="openCategories()"><app-icon name="boxes" /> Catégories</button>
            <button type="button" class="btn btn-primary" (click)="dialog().open()"><app-icon name="plus" /> Nouveau produit</button>
          </div>
        }
      </header>

      <section class="panel">
        <div class="toolbar">
          <div class="input-group grow">
            <app-icon name="search" [size]="15" />
            <input class="input" type="search" placeholder="Référence ou désignation" aria-label="Rechercher un produit"
                   [value]="list.q()" (input)="list.search($any($event.target).value)" />
          </div>
          <select class="select narrow" aria-label="Catégorie" (change)="categoryId.set(+$any($event.target).value || null); list.page.set(0)">
            <option value="">Toutes catégories</option>
            @for (c of categories.value() ?? []; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          <label class="check"><input type="checkbox" [checked]="lowOnly()" (change)="lowOnly.set($any($event.target).checked); list.page.set(0)" />
            Sous le seuil d'alerte</label>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('reference')" (click)="list.toggleSort('reference')">Référence {{ list.arrow('reference') }}</th>
                <th class="sortable" [attr.aria-sort]="list.ariaSort('name')" (click)="list.toggleSort('name')">Désignation {{ list.arrow('name') }}</th>
                <th>Catégorie</th>
                <th class="sortable right" [attr.aria-sort]="list.ariaSort('unitPrice')" (click)="list.toggleSort('unitPrice')">Prix HT {{ list.arrow('unitPrice') }}</th>
                <th class="right">Marge</th>
                <th class="sortable right" [attr.aria-sort]="list.ariaSort('stockQuantity')" (click)="list.toggleSort('stockQuantity')">Stock {{ list.arrow('stockQuantity') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of rows.value()?.content ?? []; track p.id) {
                <tr>
                  <td><span class="code">{{ p.reference }}</span></td>
                  <td class="primary-cell">{{ p.name }}<span class="secondary">{{ p.material }}</span></td>
                  <td class="muted">{{ p.categoryName ?? '–' }}</td>
                  <td class="right num">{{ p.unitPrice | money }}<span class="secondary">/ {{ p.unit }}</span></td>
                  <td class="right num" [class.low-margin]="p.marginPct < 15">{{ p.marginPct | pct }}</td>
                  <td class="right num">
                    <span class="stock" [class.low]="p.lowStock" [class.negative]="p.stockQuantity < 0">{{ p.stockQuantity | qty }}</span>
                    <span class="secondary">seuil {{ p.minStock | qty }}</span>
                  </td>
                  <td class="right">
                    <div class="row-actions end">
                      <a class="btn btn-ghost btn-sm" routerLink="/stock" [queryParams]="{ produit: p.id }">Mouvements</a>
                      @if (auth.can('catalogue')) {
                        <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="dialog().open(p)" [attr.aria-label]="'Modifier ' + p.reference">
                          <app-icon name="pencil" [size]="14" />
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7">
                  @if (rows.isLoading()) { <span class="skeleton"></span> }
                  @else { <div class="empty"><strong>Aucun produit</strong>Aucun produit ne correspond à ces critères.</div> }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="list.page()" [size]="list.size" [total]="rows.value()?.totalElements ?? 0" (pageChange)="list.page.set($event)" />
      </section>
    </div>

    <app-product-dialog [categories]="categories.value() ?? []" (saved)="rows.reload()" />

    <dialog #catDialog class="dialog wide" (cancel)="closeCategories()">
      <div class="dialog-head">
        <div><h2>Catégories</h2><p>Familles de produits utilisées pour les analyses de chiffre d'affaires.</p></div>
        <button type="button" class="btn btn-ghost btn-icon" (click)="closeCategories()" aria-label="Fermer"><app-icon name="x" /></button>
      </div>
      <div class="dialog-body">
        <table class="table compact cats">
          <thead><tr><th>Code</th><th>Nom</th><th class="right">Produits</th><th></th></tr></thead>
          <tbody>
            @for (c of categories.value() ?? []; track c.id) {
              <tr>
                <td class="code">{{ c.code }}</td>
                <td>{{ c.name }}<span class="secondary">{{ c.description }}</span></td>
                <td class="right num">{{ c.productCount }}</td>
                <td class="right">
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="editCategory(c)" aria-label="Modifier"><app-icon name="pencil" [size]="14" /></button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" [disabled]="c.productCount > 0" (click)="deleteCategory(c)" aria-label="Supprimer"
                          [title]="c.productCount > 0 ? 'Catégorie utilisée par des produits' : 'Supprimer'"><app-icon name="trash" [size]="14" /></button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <form class="cat-form" (ngSubmit)="saveCategory()">
          <input class="input" name="code" [(ngModel)]="cat.code" placeholder="Code" maxlength="20" aria-label="Code" />
          <input class="input" name="name" [(ngModel)]="cat.name" placeholder="Nom de la catégorie" maxlength="120" aria-label="Nom" />
          <button type="submit" class="btn btn-primary" [disabled]="!cat.code.trim() || !cat.name.trim()">{{ catId ? 'Mettre à jour' : 'Ajouter' }}</button>
          @if (catId) { <button type="button" class="btn" (click)="resetCategory()">Annuler</button> }
        </form>
      </div>
    </dialog>
  `,
  styles: `
    .narrow { width: auto; min-width: 190px; }
    .stock { color: var(--ink); font-weight: 500; }
    .stock.low { color: var(--warning); font-weight: 600; }
    .stock.negative { color: var(--danger); }
    .low-margin { color: var(--warning); }
    .end { justify-content: flex-end; flex-wrap: nowrap; }
    .cats { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .cat-form { display: grid; grid-template-columns: 120px 1fr auto auto; gap: 8px; margin-top: 14px; }
  `,
})
export class ProductList implements OnInit {
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  protected readonly auth = inject(AuthService);
  /** ?alerte=1 shows products under their alert threshold. */
  readonly alerte = input<string>();
  protected readonly dialog = viewChild.required(ProductDialog);
  private readonly catDialog = viewChild.required<ElementRef<HTMLDialogElement>>('catDialog');

  protected readonly list = new ListState('reference', 'asc');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly lowOnly = signal(false);
  protected readonly categories = rxResource({ stream: () => this.api.categories() });
  protected readonly rows = rxResource({
    params: () => ({ ...this.list.params(), categoryId: this.categoryId(), lowStock: this.lowOnly() }),
    stream: ({ params }) => this.api.products(params),
  });

  protected cat = { code: '', name: '' };
  protected catId: number | null = null;

  ngOnInit(): void {
    if (this.alerte()) this.lowOnly.set(true);
  }

  protected openCategories(): void {
    this.resetCategory();
    this.catDialog().nativeElement.showModal();
  }

  protected closeCategories(): void {
    this.catDialog().nativeElement.close();
  }

  protected editCategory(c: Category): void {
    this.catId = c.id;
    this.cat = { code: c.code, name: c.name };
  }

  protected resetCategory(): void {
    this.catId = null;
    this.cat = { code: '', name: '' };
  }

  protected saveCategory(): void {
    this.api.saveCategory(this.cat, this.catId ?? undefined).subscribe({
      next: () => {
        this.feedback.success('Catégorie enregistrée');
        this.resetCategory();
        this.categories.reload();
      },
      error: (e) => this.feedback.error(errorMessage(e)),
    });
  }

  protected deleteCategory(c: Category): void {
    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.feedback.success('Catégorie supprimée');
        this.categories.reload();
      },
      error: (e) => this.feedback.error(errorMessage(e)),
    });
  }
}
