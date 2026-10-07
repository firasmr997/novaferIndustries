import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { errorMessage } from '../../core/http';
import { UNITS, VAT_RATES } from '../../core/labels';
import { Category, Product } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';

interface ProductModel {
  reference: string;
  name: string;
  description: string;
  categoryId: number | null;
  material: string;
  unit: string;
  unitPrice: number | null;
  costPrice: number | null;
  vatRate: number;
  minStock: number | null;
  initialStock: number | null;
}

@Component({
  selector: 'app-product-dialog',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="dialog wide" (cancel)="close()">
      <form (ngSubmit)="save()">
        <div class="dialog-head">
          <div>
            <h2>{{ editingId ? 'Modifier le produit' : 'Nouveau produit' }}</h2>
            <p>Le prix et le taux de TVA sont repris par défaut dans les devis et factures.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="close()" aria-label="Fermer"><app-icon name="x" /></button>
        </div>
        <div class="dialog-body form-grid">
          <div class="field span-4">
            <label for="p-ref">Référence</label>
            <input id="p-ref" class="input" name="reference" [(ngModel)]="m.reference" required maxlength="40" placeholder="VIS-TH-M10X40" />
          </div>
          <div class="field span-8">
            <label for="p-name">Désignation</label>
            <input id="p-name" class="input" name="name" [(ngModel)]="m.name" required maxlength="160" />
          </div>
          <div class="field span-6">
            <label for="p-cat">Catégorie</label>
            <select id="p-cat" class="select" name="categoryId" [(ngModel)]="m.categoryId">
              <option [ngValue]="null">Sans catégorie</option>
              @for (c of categories(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="field span-6">
            <label for="p-mat">Matière / nuance</label>
            <input id="p-mat" class="input" name="material" [(ngModel)]="m.material" maxlength="80" placeholder="S235JR, inox 304L…" />
          </div>
          <div class="field span-3">
            <label for="p-unit">Unité</label>
            <select id="p-unit" class="select" name="unit" [(ngModel)]="m.unit">
              @for (u of units; track u) { <option [ngValue]="u">{{ u }}</option> }
            </select>
          </div>
          <div class="field span-3">
            <label for="p-price">Prix de vente HT</label>
            <input id="p-price" class="input num" type="number" min="0" step="0.001" name="unitPrice" [(ngModel)]="m.unitPrice" required />
          </div>
          <div class="field span-3">
            <label for="p-cost">Prix de revient</label>
            <input id="p-cost" class="input num" type="number" min="0" step="0.001" name="costPrice" [(ngModel)]="m.costPrice" />
          </div>
          <div class="field span-3">
            <label for="p-vat">TVA</label>
            <select id="p-vat" class="select" name="vatRate" [(ngModel)]="m.vatRate">
              @for (r of vatRates; track r) { <option [ngValue]="r">{{ r }} %</option> }
            </select>
          </div>
          <div class="field span-3">
            <label for="p-min">Seuil d'alerte</label>
            <input id="p-min" class="input num" type="number" min="0" step="1" name="minStock" [(ngModel)]="m.minStock" />
          </div>
          @if (!editingId) {
            <div class="field span-3">
              <label for="p-init">Stock initial</label>
              <input id="p-init" class="input num" type="number" min="0" step="1" name="initialStock" [(ngModel)]="m.initialStock" />
            </div>
          }
          <div class="field span-12">
            <label for="p-desc">Description</label>
            <textarea id="p-desc" class="textarea" rows="2" name="description" [(ngModel)]="m.description" maxlength="1000"></textarea>
          </div>
          @if (error()) { <div class="alert span-12" role="alert"><app-icon name="circle-alert" /> {{ error() }}</div> }
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" (click)="close()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ busy() ? 'Enregistrement…' : 'Enregistrer' }}</button>
        </div>
      </form>
    </dialog>
  `,
})
export class ProductDialog {
  readonly categories = input.required<Category[]>();
  readonly saved = output<Product>();
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly units = UNITS;
  protected readonly vatRates = VAT_RATES;
  protected m: ProductModel = this.blank();
  protected editingId: number | null = null;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private blank(): ProductModel {
    return { reference: '', name: '', description: '', categoryId: null, material: '', unit: 'pièce', unitPrice: null,
      costPrice: null, vatRate: 19, minStock: 0, initialStock: null };
  }

  open(p?: Product): void {
    this.editingId = p?.id ?? null;
    this.m = p ? {
      reference: p.reference, name: p.name, description: p.description ?? '', categoryId: p.categoryId,
      material: p.material ?? '', unit: p.unit, unitPrice: p.unitPrice, costPrice: p.costPrice, vatRate: Number(p.vatRate),
      minStock: p.minStock, initialStock: null,
    } : this.blank();
    this.error.set(null);
    this.cdr.markForCheck();
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected save(): void {
    if (!this.m.reference.trim() || !this.m.name.trim() || this.m.unitPrice === null) {
      this.error.set('Référence, désignation et prix de vente sont obligatoires.');
      return;
    }
    this.busy.set(true);
    this.api.saveProduct({ ...this.m, description: this.m.description || null, material: this.m.material || null },
      this.editingId ?? undefined).subscribe({
      next: (p) => {
        this.busy.set(false);
        this.close();
        this.feedback.success(this.editingId ? 'Produit mis à jour' : `Produit ${p.reference} créé`);
        this.saved.emit(p);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
