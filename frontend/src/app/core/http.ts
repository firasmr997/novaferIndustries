import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiError } from './models';

/** Adds the bearer token and signs out on 401 (expired or revoked session). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const request = token && req.url.startsWith('/api/') ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/api/auth/login')) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? true : inject(Router).createUrlTree(['/connexion']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.can('admin') ? true : inject(Router).createUrlTree(['/']);
};

/** The user-facing message of an API failure. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
    const body = error.error as ApiError | null;
    if (body?.errors?.length) return `${body.message} : ${body.errors.map((e) => e.message).join(', ')}`;
    if (body?.message) return body.message;
  }
  return 'Une erreur inattendue est survenue.';
}
