import {NgModule} from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {path: '', loadChildren: () => import('./posenet/posenet.module').then(m => m.PosenetPageModule)},
  {
    path: 'leaderboard',
    loadChildren: () => import('./pages/leaderboard/leaderboard.module').then( m => m.LeaderboardPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash: true, relativeLinkResolution: 'legacy' })],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
