import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http';
import { ROLE_LABELS, VAT_RATES } from '../../core/labels';
import { Settings } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow-page">
      <header class="page-head">
        <div>
          <h1>Paramètres</h1>
          <p class="lead">Identité de l'entreprise imprimée sur les documents, règles fiscales et compte personnel.</p>
        </div>
        @if (isAdmin() && s) {
          <div class="actions">
            <button type="button" class="btn btn-primary" (click)="save()" [disabled]="saving()"><app-icon name="check" />
              {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          </div>
        }
      </header>

      @if (!isAdmin()) {
        <div class="alert info banner"><app-icon name="shield" /> Seul un administrateur peut modifier les paramètres de l'entreprise.</div>
      }

      @if (s) {
        <section class="panel">
          <div class="panel-body">
            <fieldset [disabled]="!isAdmin()">
              <div class="form-section">
                <h2>Entreprise</h2>
                <p class="section-lead">Ces informations apparaissent en en-tête et en pied des devis et factures.</p>
                <div class="form-grid">
                  <div class="field span-6"><label for="s-name">Raison sociale</label><input id="s-name" class="input" name="companyName" [(ngModel)]="s.companyName" required /></div>
                  <div class="field span-6"><label for="s-form">Forme juridique et capital</label><input id="s-form" class="input" name="legalForm" [(ngModel)]="s.legalForm" /></div>
                  <div class="field span-6"><label for="s-mf">Matricule fiscal</label><input id="s-mf" class="input" name="matriculeFiscal" [(ngModel)]="s.matriculeFiscal" /></div>
                  <div class="field span-6"><label for="s-rc">Registre du commerce</label><input id="s-rc" class="input" name="registreCommerce" [(ngModel)]="s.registreCommerce" /></div>
                  <div class="field span-12"><label for="s-addr">Adresse</label><input id="s-addr" class="input" name="address" [(ngModel)]="s.address" /></div>
                  <div class="field span-4"><label for="s-zip">Code postal</label><input id="s-zip" class="input" name="postalCode" [(ngModel)]="s.postalCode" /></div>
                  <div class="field span-4"><label for="s-city">Ville</label><input id="s-city" class="input" name="city" [(ngModel)]="s.city" /></div>
                  <div class="field span-4"><label for="s-country">Pays</label><input id="s-country" class="input" name="country" [(ngModel)]="s.country" /></div>
                  <div class="field span-4"><label for="s-phone">Téléphone</label><input id="s-phone" class="input" name="phone" [(ngModel)]="s.phone" /></div>
                  <div class="field span-4"><label for="s-email">E-mail</label><input id="s-email" class="input" type="email" name="email" [(ngModel)]="s.email" /></div>
                  <div class="field span-4"><label for="s-web">Site web</label><input id="s-web" class="input" name="website" [(ngModel)]="s.website" /></div>
                  <div class="field span-6"><label for="s-bank">Banque</label><input id="s-bank" class="input" name="bankName" [(ngModel)]="s.bankName" /></div>
                  <div class="field span-6"><label for="s-rib">RIB</label><input id="s-rib" class="input num" name="rib" [(ngModel)]="s.rib" /></div>
                </div>
              </div>

              <div class="form-section">
                <h2>Fiscalité</h2>
                <p class="section-lead">Appliquée aux nouveaux documents et aux brouillons recalculés ; les factures émises ne changent pas.</p>
                <div class="form-grid">
                  <div class="field span-4">
                    <label for="s-vat">Taux de TVA par défaut</label>
                    <select id="s-vat" class="select" name="defaultVatRate" [(ngModel)]="s.defaultVatRate">
                      @for (r of vatRates; track r) { <option [ngValue]="r">{{ r }} %</option> }
                    </select>
                  </div>
                  <div class="field span-4">
                    <label for="s-stamp">Timbre fiscal (TND)</label>
                    <input id="s-stamp" class="input num" type="number" min="0" step="0.001" name="fiscalStamp" [(ngModel)]="s.fiscalStamp" />
                  </div>
                  <div class="field span-4">
                    <label for="s-fodec">Taux FODEC (%)</label>
                    <input id="s-fodec" class="input num" type="number" min="0" max="10" step="0.01" name="fodecRate" [(ngModel)]="s.fodecRate" [disabled]="!s.fodecEnabled" />
                  </div>
                  <div class="field span-12">
                    <label class="check"><input type="checkbox" name="fodecEnabled" [(ngModel)]="s.fodecEnabled" />
                      Appliquer le FODEC (1 % sur le chiffre d'affaires des produits industriels, inclus dans la base de TVA)</label>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h2>Documents</h2>
                <div class="form-grid">
                  <div class="field span-6">
                    <label for="s-terms">Délai de paiement par défaut (jours)</label>
                    <input id="s-terms" class="input num" type="number" min="0" max="365" name="paymentTermsDays" [(ngModel)]="s.paymentTermsDays" />
                  </div>
                  <div class="field span-6">
                    <label for="s-valid">Validité des devis (jours)</label>
                    <input id="s-valid" class="input num" type="number" min="1" max="365" name="quoteValidityDays" [(ngModel)]="s.quoteValidityDays" />
                  </div>
                  <div class="field span-12">
                    <label for="s-ifoot">Mentions en pied de facture</label>
                    <textarea id="s-ifoot" class="textarea" rows="2" maxlength="500" name="invoiceFooter" [(ngModel)]="s.invoiceFooter"></textarea>
                  </div>
                  <div class="field span-12">
                    <label for="s-qfoot">Conditions des devis</label>
                    <textarea id="s-qfoot" class="textarea" rows="2" maxlength="500" name="quoteFooter" [(ngModel)]="s.quoteFooter"></textarea>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        </section>
      } @else {
        <div class="panel panel-body"><span class="skeleton"></span></div>
      }

      <section class="panel account">
        <div class="panel-head">
          <div><h2>Mon compte</h2><p>{{ auth.user()?.fullName }} · {{ auth.user()?.email }} · {{ roleLabel() }}</p></div>
        </div>
        <form class="panel-body form-grid" (ngSubmit)="changePassword()">
          <div class="field span-4"><label for="pw-cur">Mot de passe actuel</label>
            <input id="pw-cur" class="input" type="password" autocomplete="current-password" name="current" [(ngModel)]="pw.current" /></div>
          <div class="field span-4"><label for="pw-new">Nouveau mot de passe</label>
            <input id="pw-new" class="input" type="password" autocomplete="new-password" name="next" [(ngModel)]="pw.next" minlength="8" />
            <span class="hint">8 caractères minimum</span></div>
          <div class="field span-4 submit-cell">
            <button type="submit" class="btn" [disabled]="!pw.current || pw.next.length < 8">Changer le mot de passe</button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: `
    .narrow-page { max-width: 960px; }
    .banner { margin-bottom: 16px; }
    fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
    .account { margin-top: 20px; }
    .submit-cell { justify-content: flex-start; padding-top: 25px; }
  `,
})
export class SettingsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly auth = inject(AuthService);
  protected readonly vatRates = VAT_RATES;
  protected readonly isAdmin = computed(() => this.auth.can('admin'));
  protected readonly roleLabel = computed(() => (this.auth.user() ? ROLE_LABELS[this.auth.user()!.role] : ''));

  protected s: Settings | null = null;
  protected readonly saving = signal(false);
  protected pw = { current: '', next: '' };

  ngOnInit(): void {
    this.api.settings().subscribe((s) => {
      this.s = { ...s, defaultVatRate: Number(s.defaultVatRate) };
      this.cdr.markForCheck();
    });
  }

  protected save(): void {
    if (!this.s) return;
    this.saving.set(true);
    this.api.saveSettings(this.s).subscribe({
      next: (s) => {
        this.s = { ...s, defaultVatRate: Number(s.defaultVatRate) };
        this.saving.set(false);
        this.cdr.markForCheck();
        this.feedback.success('Paramètres enregistrés');
      },
      error: (e) => {
        this.saving.set(false);
        this.feedback.error(errorMessage(e));
      },
    });
  }

  protected changePassword(): void {
    this.api.changePassword(this.pw.current, this.pw.next).subscribe({
      next: () => {
        this.pw = { current: '', next: '' };
        this.cdr.markForCheck();
        this.feedback.success('Mot de passe modifié');
      },
      error: (e) => this.feedback.error(errorMessage(e)),
    });
  }
}
