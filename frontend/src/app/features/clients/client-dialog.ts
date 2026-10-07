import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { errorMessage } from '../../core/http';
import { Client } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';

const EMPTY: Partial<Client> = {
  code: '', companyName: '', contactName: '', email: '', phone: '', address: '', city: '', matriculeFiscal: '',
  sector: '', paymentTermsDays: undefined, vatExempt: false, notes: '',
};

/** Create or edit a client in a dialog. */
@Component({
  selector: 'app-client-dialog',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="dialog wide" (cancel)="close()">
      <form (ngSubmit)="save()" #f="ngForm">
        <div class="dialog-head">
          <div>
            <h2>{{ editingId ? 'Modifier le client' : 'Nouveau client' }}</h2>
            <p>Les coordonnées et le matricule fiscal figurent sur les devis et factures.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="close()" aria-label="Fermer"><app-icon name="x" /></button>
        </div>
        <div class="dialog-body form-grid">
          <div class="field span-8">
            <label for="c-name">Raison sociale</label>
            <input id="c-name" class="input" name="companyName" [(ngModel)]="model.companyName" required maxlength="160" />
          </div>
          <div class="field span-4">
            <label for="c-code">Code client</label>
            <input id="c-code" class="input" name="code" [(ngModel)]="model.code" maxlength="20" placeholder="Automatique" />
          </div>
          <div class="field span-6">
            <label for="c-mf">Matricule fiscal</label>
            <input id="c-mf" class="input" name="matriculeFiscal" [(ngModel)]="model.matriculeFiscal" maxlength="40" placeholder="1234567A/A/M/000" />
          </div>
          <div class="field span-6">
            <label for="c-sector">Secteur</label>
            <input id="c-sector" class="input" name="sector" [(ngModel)]="model.sector" maxlength="80" />
          </div>
          <div class="field span-6">
            <label for="c-contact">Contact</label>
            <input id="c-contact" class="input" name="contactName" [(ngModel)]="model.contactName" maxlength="120" />
          </div>
          <div class="field span-6">
            <label for="c-phone">Téléphone</label>
            <input id="c-phone" class="input" name="phone" [(ngModel)]="model.phone" maxlength="40" />
          </div>
          <div class="field span-6">
            <label for="c-email">E-mail</label>
            <input id="c-email" class="input" type="email" name="email" [(ngModel)]="model.email" maxlength="160" />
          </div>
          <div class="field span-6">
            <label for="c-city">Ville</label>
            <input id="c-city" class="input" name="city" [(ngModel)]="model.city" maxlength="80" />
          </div>
          <div class="field span-12">
            <label for="c-address">Adresse</label>
            <input id="c-address" class="input" name="address" [(ngModel)]="model.address" maxlength="255" />
          </div>
          <div class="field span-4">
            <label for="c-terms">Délai de paiement (jours)</label>
            <input id="c-terms" class="input num" type="number" min="0" max="365" name="paymentTermsDays" [(ngModel)]="model.paymentTermsDays"
                   placeholder="Par défaut" />
          </div>
          <div class="field span-8 check-field">
            <label class="check"><input type="checkbox" name="vatExempt" [(ngModel)]="model.vatExempt" />
              En suspension de TVA (entreprise totalement exportatrice)</label>
          </div>
          <div class="field span-12">
            <label for="c-notes">Notes</label>
            <textarea id="c-notes" class="textarea" rows="2" name="notes" [(ngModel)]="model.notes" maxlength="1000"></textarea>
          </div>
          @if (error()) { <div class="alert span-12" role="alert"><app-icon name="circle-alert" /> {{ error() }}</div> }
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" (click)="close()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy() || !model.companyName?.trim()">
            {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
  styles: `.check-field { justify-content: flex-end; padding-bottom: 8px; }`,
})
export class ClientDialog {
  readonly saved = output<Client>();
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected model: Partial<Client> = { ...EMPTY };
  protected editingId: number | null = null;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  open(client?: Client): void {
    this.editingId = client?.id ?? null;
    this.model = client ? { ...client } : { ...EMPTY };
    this.error.set(null);
    this.cdr.markForCheck();
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected save(): void {
    this.busy.set(true);
    this.error.set(null);
    const body = { ...this.model, code: this.model.code?.trim() || null } as Partial<Client>;
    this.api.saveClient(body, this.editingId ?? undefined).subscribe({
      next: (client) => {
        this.busy.set(false);
        this.close();
        this.feedback.success(this.editingId ? 'Client mis à jour' : `Client ${client.code} créé`);
        this.saved.emit(client);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
