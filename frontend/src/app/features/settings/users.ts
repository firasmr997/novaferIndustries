import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FrDateTimePipe, LabelPipe } from '../../core/format';
import { errorMessage } from '../../core/http';
import { ROLE_LABELS, entries } from '../../core/labels';
import { Role, User } from '../../core/models';
import { Feedback } from '../../shared/feedback';
import { Icon } from '../../shared/icon';

const ROLE_HELP: Record<Role, string> = {
  ADMIN: 'Tous les modules, les utilisateurs et les paramètres.',
  MANAGER: 'Tous les modules sauf les utilisateurs et les paramètres.',
  SALES: 'Devis, clients et réclamations.',
  ACCOUNTANT: 'Factures, règlements, clients et réclamations.',
  QUALITY: 'Réclamations ; consultation des autres modules.',
  WAREHOUSE: 'Produits, stock et réclamations.',
};

@Component({
  selector: 'app-users',
  imports: [FormsModule, Icon, LabelPipe, FrDateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page narrow-page">
      <header class="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <p class="lead">Comptes du personnel et rôles. Chaque rôle limite les modules modifiables ; tout le monde peut consulter.</p>
        </div>
        <div class="actions"><button type="button" class="btn btn-primary" (click)="open()"><app-icon name="plus" /> Nouvel utilisateur</button></div>
      </header>

      <section class="panel">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Nom</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th></th></tr></thead>
            <tbody>
              @for (u of users.value() ?? []; track u.id) {
                <tr>
                  <td class="primary-cell">{{ u.fullName }}<span class="secondary">{{ u.email }}</span></td>
                  <td>{{ u.role | label: roleLabels }}<span class="secondary">{{ help[u.role] }}</span></td>
                  <td><span class="badge" [class]="u.active ? 'badge tone-success' : 'badge tone-neutral'">{{ u.active ? 'Actif' : 'Désactivé' }}</span></td>
                  <td class="num muted">{{ u.lastLoginAt | frDateTime }}</td>
                  <td class="right"><button type="button" class="btn btn-ghost btn-sm" (click)="open(u)"><app-icon name="pencil" [size]="14" /> Modifier</button></td>
                </tr>
              } @empty {
                <tr><td colspan="5"><span class="skeleton"></span></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <dialog #dialog class="dialog" (cancel)="close()">
      <form (ngSubmit)="save()">
        <div class="dialog-head"><div><h2>{{ editing ? 'Modifier ' + editing.fullName : 'Nouvel utilisateur' }}</h2></div></div>
        <div class="dialog-body form-grid">
          <div class="field span-12"><label for="u-name">Nom complet</label><input id="u-name" class="input" name="fullName" [(ngModel)]="m.fullName" required /></div>
          <div class="field span-12"><label for="u-email">E-mail</label><input id="u-email" class="input" type="email" name="email" [(ngModel)]="m.email" required /></div>
          <div class="field span-12">
            <label for="u-role">Rôle</label>
            <select id="u-role" class="select" name="role" [(ngModel)]="m.role">
              @for (r of roles; track r.value) { <option [ngValue]="r.value">{{ r.label }}</option> }
            </select>
            <span class="hint">{{ help[m.role] }}</span>
          </div>
          <div class="field span-12">
            <label for="u-pw">{{ editing ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe' }}</label>
            <input id="u-pw" class="input" type="password" autocomplete="new-password" name="password" [(ngModel)]="m.password" minlength="8" />
            <span class="hint">8 caractères minimum. Communiquez-le à la personne par un canal sûr.</span>
          </div>
          @if (editing) {
            <div class="field span-12"><label class="check"><input type="checkbox" name="active" [(ngModel)]="m.active" /> Compte actif</label></div>
          }
          @if (error()) { <div class="alert span-12" role="alert"><app-icon name="circle-alert" /> {{ error() }}</div> }
        </div>
        <div class="dialog-foot">
          <button type="button" class="btn" (click)="close()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Enregistrer</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `.narrow-page { max-width: 1040px; }`,
})
export class UsersPage {
  private readonly api = inject(Api);
  private readonly feedback = inject(Feedback);
  protected readonly auth = inject(AuthService);
  protected readonly roles = entries(ROLE_LABELS);
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly help = ROLE_HELP;
  protected readonly users = rxResource({ stream: () => this.api.users() });
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected editing: User | null = null;
  protected m = { fullName: '', email: '', role: 'SALES' as Role, password: '', active: true };
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected open(u?: User): void {
    this.editing = u ?? null;
    this.m = u ? { fullName: u.fullName, email: u.email, role: u.role, password: '', active: u.active }
      : { fullName: '', email: '', role: 'SALES', password: '', active: true };
    this.error.set(null);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected save(): void {
    this.busy.set(true);
    const body = { ...this.m, password: this.m.password || undefined };
    const request = this.editing ? this.api.updateUser(this.editing.id, body) : this.api.createUser(body);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.feedback.success('Utilisateur enregistré');
        this.users.reload();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
