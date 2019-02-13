import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AlbumsManagerComponent } from './albums-manager/albums-manager.component';
import { AlbumsResolver } from '../albums.resolver';
import { AlbumDetailsComponent } from './album-details/album-details.component';
import { AlbumDetailsResolver } from './album-details.resolver';
import { LibraryUploadComponent } from './library-manager/library-upload/library-upload.component';
import { AdminGuard } from '../core/auth/admin.guard';
import { UsersComponent } from './users/users.component';
import { LibraryManagerComponent } from './library-manager/library-manager.component';

const adminRoutes: Routes = [
  { path: '', children: [
      { path: 'albums', component: AlbumsManagerComponent, resolve: { albums: AlbumsResolver }, runGuardsAndResolvers: 'always' },
      { path: 'albums/:id', component: AlbumDetailsComponent, resolve: { album: AlbumDetailsResolver, albums: AlbumsResolver }, runGuardsAndResolvers: 'always' },
      { path: 'library', component: LibraryManagerComponent },
      { path: 'library/upload', component: LibraryUploadComponent },
      { path: 'users', component: UsersComponent },
      { path: '**', redirectTo: 'albums'}
    ], canActivate: [ AdminGuard ]},
];

@NgModule({
  imports: [
    RouterModule.forChild(adminRoutes)
  ],
  exports: [
    RouterModule
  ]
})
export class AdminRoutingModule {
}
