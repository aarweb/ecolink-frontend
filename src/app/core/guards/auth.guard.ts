import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/services/AuthService.service';
import { User } from '../models/User';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authService.isAuthenticated().pipe(
      switchMap(isLogged => {
        const rutaActual = state.url;

        if (isLogged && (rutaActual === '/auth/login' || rutaActual === '/auth/register')) {
          this.router.navigate(['/']);
          return of(false);
        }

        if (!isLogged && rutaActual === '/profile') {
          this.router.navigate(['/auth/login']);
          return of(false);
        }

        if (rutaActual === '/challenges') {
          return this.authService.getCurrentUser().pipe(
            map((user: User) => {
              if (user.userType === 'CLIENT') {
                this.router.navigate(['/']);
                return false;
              }
              return true;
            }),
            catchError(() => {
              return of(true);
            })
          )
        }

        return of(true);
      })
    );
  };
}
