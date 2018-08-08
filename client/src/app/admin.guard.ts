import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { AuthService } from './auth.service';
import { AlbumsGuard } from './albums.guard';
import { map } from 'rxjs/operators';


@Injectable()
export class AdminGuard implements CanActivate {

  constructor(private authService: AuthService, private albumsGuard: AlbumsGuard, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return this.albumsGuard.canActivate(route, state)
      .pipe(
        map(isAuthenticated => {
          const isUserAdmin = this.authService.isUserAdmin();
          if (isAuthenticated && !isUserAdmin) {
            this.router.navigateByUrl('/');
          }
          return isUserAdmin;
        })
      );
  }
}
