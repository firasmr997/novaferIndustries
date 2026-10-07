import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, Role, User } from './models';

const STORAGE_KEY = 'novafer.session';

interface Session {
  token: string;
  expiresAt: string;
  user: User;
}

/** Module write permissions, matching the role matrix in the API's SecurityConfig. */
const WRITERS = {
  catalogue: ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  clients: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'],
  quotes: ['ADMIN', 'MANAGER', 'SALES'],
  invoices: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  complaints: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'QUALITY', 'WAREHOUSE'],
  admin: ['ADMIN'],
} satisfies Record<string, Role[]>;

export type Module = keyof typeof WRITERS;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
      tap((response) => this.store({ token: response.token, expiresAt: response.expiresAt, user: response.user })),
    );
  }

  logout(redirect = true): void {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: nothing to clear */
    }
    if (redirect) {
      this.router.navigate(['/connexion']);
    }
  }

  can(module: Module): boolean {
    const role = this.user()?.role;
    return !!role && (WRITERS[module] as Role[]).includes(role);
  }

  private store(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* private mode: the session lasts for this tab only */
    }
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;
      return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
    } catch {
      return null;
    }
  }
}
