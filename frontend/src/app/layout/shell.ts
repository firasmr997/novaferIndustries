import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Api } from '../core/api.service';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ROLE_LABELS } from '../core/labels';
import { FeedbackHost } from '../shared/feedback';
import { Icon } from '../shared/icon';
import { GlobalSearch } from './global-search';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
  admin?: boolean;
}

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { label: 'Tableau de bord', icon: 'dashboard', link: '/', exact: true },
      { label: 'Analyses', icon: 'bar-chart', link: '/analyses' },
    ],
  },
  {
    title: 'Ventes',
    items: [
      { label: 'Devis', icon: 'file-text', link: '/devis' },
      { label: 'Factures', icon: 'receipt', link: '/factures' },
      { label: 'Clients', icon: 'building', link: '/clients' },
    ],
  },
  {
    title: 'Qualité',
    items: [{ label: 'Réclamations', icon: 'complaint', link: '/reclamations' }],
  },
  {
    title: 'Production',
    items: [
      { label: 'Produits', icon: 'package', link: '/produits' },
      { label: 'Stock', icon: 'warehouse', link: '/stock' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Paramètres', icon: 'settings', link: '/parametres' },
      { label: 'Utilisateurs', icon: 'users', link: '/utilisateurs', admin: true },
    ],
  },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, GlobalSearch, FeedbackHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.nav-open]="navOpen()">
      <aside class="sidebar" aria-label="Navigation principale">
        <a routerLink="/" class="brand" (click)="navOpen.set(false)">
          <img src="brand/novafer-logo.svg" alt="Novafer Industries" width="160" height="38" />
        </a>
        <nav>
          @for (group of nav(); track group.title) {
            <div class="group">
              <span class="group-title">{{ group.title }}</span>
              @for (item of group.items; track item.link) {
                <a class="nav-item" [routerLink]="item.link" routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="navOpen.set(false)">
                  <app-icon [name]="item.icon" [size]="17" />
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>
        @if (auth.user(); as user) {
          <div class="me">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <div class="who">
              <strong>{{ user.fullName }}</strong>
              <span>{{ roleLabels[user.role] }}</span>
            </div>
            <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="auth.logout()" title="Se déconnecter"
                    aria-label="Se déconnecter">
              <app-icon name="logout" [size]="16" />
            </button>
          </div>
        }
      </aside>
      <div class="scrim" (click)="navOpen.set(false)"></div>

      <div class="main">
        <header class="topbar">
          <button type="button" class="btn btn-ghost btn-icon burger" (click)="navOpen.set(true)" aria-label="Ouvrir le menu">
            <app-icon name="menu" [size]="18" />
          </button>
          <app-global-search />
          <div class="spacer"></div>
          @if (settings.value()?.demo) {
            <span class="demo-chip" title="Clients, documents et montants sont fictifs : base de démonstration."><span class="long">Données de démonstration</span><span class="short">Démo</span></span>
          }
          <div class="create">
            <button type="button" class="btn btn-primary" (click)="createOpen.set(!createOpen())"
                    [attr.aria-expanded]="createOpen()" aria-haspopup="menu">
              <app-icon name="plus" [size]="16" /> Créer
              <app-icon name="chevron-down" [size]="14" />
            </button>
            @if (createOpen()) {
              <div class="menu" role="menu" (click)="createOpen.set(false)">
                @if (auth.can('quotes')) {
                  <a role="menuitem" routerLink="/devis/nouveau"><app-icon name="file-text" /> Devis</a>
                }
                @if (auth.can('invoices')) {
                  <a role="menuitem" routerLink="/factures/nouvelle"><app-icon name="receipt" /> Facture</a>
                }
                <a role="menuitem" routerLink="/reclamations/nouvelle"><app-icon name="complaint" /> Réclamation</a>
                @if (auth.can('clients')) {
                  <a role="menuitem" routerLink="/clients" [queryParams]="{ nouveau: 1 }"><app-icon name="building" /> Client</a>
                }
              </div>
              <div class="menu-scrim" (click)="createOpen.set(false)"></div>
            }
          </div>
        </header>
        <main id="contenu">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-feedback-host />
  `,
  styles: `
    .shell { display: grid; grid-template-columns: var(--sidebar-w) minmax(0, 1fr); min-height: 100vh; }
    .sidebar {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column;
      background: var(--surface); border-right: 1px solid var(--border); z-index: 40;
    }
    .brand { display: flex; align-items: center; height: 68px; padding: 0 20px; }
    .brand img { height: 34px; width: auto; }
    nav { flex: 1; overflow-y: auto; padding: 6px 12px 16px; }
    .group + .group { margin-top: 18px; }
    .group-title {
      display: block; padding: 0 10px 6px; color: var(--text-3); font-size: 11.5px; font-weight: 500; letter-spacing: 0.02em;
    }
    .nav-item {
      display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px; border-radius: 8px;
      color: var(--text-2); font-size: 14px; font-weight: 500; text-decoration: none;
    }
    .nav-item:hover { background: var(--surface-3); color: var(--ink); text-decoration: none; }
    .nav-item.active { background: var(--cobalt-50); color: var(--cobalt-700); }
    .nav-item.active app-icon { color: var(--cobalt-500); }
    .me {
      display: flex; align-items: center; gap: 10px; margin: 0 12px 12px; padding: 10px; border-radius: 10px;
      border: 1px solid var(--border);
    }
    .avatar {
      display: grid; place-items: center; width: 32px; height: 32px; flex: none; border-radius: 50%;
      background: var(--cobalt-900); color: #fff; font-size: 12px; font-weight: 600;
    }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .who strong { color: var(--ink); font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who span { color: var(--text-3); font-size: 12px; }
    .main { min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; height: var(--topbar-h);
      padding: 0 32px; background: rgba(246, 247, 249, 0.88); backdrop-filter: saturate(1.4) blur(10px);
      border-bottom: 1px solid var(--border);
    }
    .spacer { flex: 1; }
    .demo-chip {
      display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 99px; white-space: nowrap;
      background: var(--warning-bg); color: var(--warning); font-size: 12px; font-weight: 500;
    }
    .demo-chip .short { display: none; }
    @media (max-width: 760px) { .demo-chip .long { display: none; } .demo-chip .short { display: inline; } }
    .burger { display: none; }
    .create { position: relative; }
    .menu {
      position: absolute; right: 0; top: calc(100% + 6px); z-index: 31; min-width: 200px; padding: 4px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--shadow-overlay);
    }
    .menu a {
      display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px; border-radius: 6px;
      color: var(--text); font-size: 13.5px; font-weight: 500; text-decoration: none;
    }
    .menu a:hover { background: var(--cobalt-50); color: var(--cobalt-700); }
    .menu-scrim { position: fixed; inset: 0; z-index: 30; }
    .scrim { display: none; }
    main { flex: 1; }

    @media (max-width: 1024px) {
      .shell { grid-template-columns: minmax(0, 1fr); }
      .sidebar {
        position: fixed; left: 0; top: 0; width: var(--sidebar-w); transform: translateX(-100%);
        transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1); box-shadow: var(--shadow-overlay);
      }
      .nav-open .sidebar { transform: none; }
      .nav-open .scrim { display: block; position: fixed; inset: 0; z-index: 35; background: rgba(15, 23, 41, 0.3); }
      .burger { display: inline-flex; }
      .topbar { padding: 0 16px; }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  protected readonly settings = rxResource({ stream: () => this.api.settings() });
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly navOpen = signal(false);
  protected readonly createOpen = signal(false);

  protected readonly nav = computed(() => {
    const isAdmin = this.auth.can('admin');
    return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.admin || isAdmin) }));
  });

  protected readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase());

  constructor() {
    // Close menus on navigation.
    toSignal(inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd), map(() => {
      this.createOpen.set(false);
      return true;
    })));
  }
}
