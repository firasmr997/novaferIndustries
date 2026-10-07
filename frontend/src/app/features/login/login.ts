import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <section class="pane">
        <img class="logo" src="brand/novafer-logo.svg" alt="Novafer Industries" width="180" height="43" />
        <div class="form-wrap">
          <h1>Connexion</h1>
          <p class="lead">Accédez à l'ERP de Novafer Industries.</p>
          <form (ngSubmit)="submit()" #f="ngForm" novalidate>
            <div class="field">
              <label for="email">E-mail professionnel</label>
              <input id="email" class="input" type="email" name="email" autocomplete="username" required
                     [(ngModel)]="email" placeholder="prenom.nom@novafer.tn" />
            </div>
            <div class="field">
              <label for="password">Mot de passe</label>
              <input id="password" class="input" type="password" name="password" autocomplete="current-password" required
                     [(ngModel)]="password" />
            </div>
            @if (error()) {
              <div class="alert" role="alert"><app-icon name="circle-alert" /> {{ error() }}</div>
            }
            <button class="btn btn-primary submit" type="submit" [disabled]="busy() || !email || !password">
              {{ busy() ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>
        </div>
        <p class="foot">© {{ year }} Novafer Industries · Ben Arous, Tunisie</p>
      </section>
      <aside class="side" aria-hidden="true">
        <div class="side-inner">
          <img src="brand/novafer-mark.svg" alt="" width="56" height="56" class="side-mark" />
          <p class="claim">Devis, factures, réclamations et stock&nbsp;: toute l'activité de l'atelier, chiffrée au millime.</p>
          <dl class="facts">
            <div><dt>TVA</dt><dd>19 · 13 · 7 %</dd></div>
            <div><dt>FODEC</dt><dd>1 %</dd></div>
            <div><dt>Timbre fiscal</dt><dd>1,000 TND</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  `,
  styles: `
    .login { display: grid; grid-template-columns: minmax(380px, 520px) 1fr; min-height: 100vh; background: var(--surface); }
    .pane { display: flex; flex-direction: column; padding: 36px 56px; }
    .logo { height: 40px; width: auto; align-self: flex-start; }
    .form-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; max-width: 380px; }
    h1 { font-size: 28px; }
    .lead { margin: 8px 0 28px; color: var(--text-2); }
    form { display: flex; flex-direction: column; gap: 16px; }
    .input { height: 40px; }
    .submit { height: 40px; margin-top: 4px; }
    .foot { color: var(--text-3); font-size: 12.5px; }
    .side {
      position: relative; overflow: hidden; display: flex; align-items: flex-end; padding: 56px;
      background: var(--cobalt-900); color: #fff;
    }
    .side-inner { position: relative; max-width: 520px; }
    .side-mark { filter: brightness(0) invert(1); opacity: .95; }
    .claim { margin: 22px 0 32px; font-family: var(--font-display); font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; text-wrap: balance; }
    .facts { display: flex; gap: 36px; margin: 0; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.16); }
    .facts dt { color: #aab6e6; font-size: 12.5px; }
    .facts dd { margin: 4px 0 0; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
    @media (max-width: 900px) {
      .login { grid-template-columns: 1fr; }
      .side { display: none; }
      .pane { padding: 28px 20px; }
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly year = new Date().getFullYear();

  protected submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
