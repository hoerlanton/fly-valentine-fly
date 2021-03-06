import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterModule, Routes} from '@angular/router';

import {IonicModule} from '@ionic/angular';

import {LeaderboardPage} from '../pages/leaderboard/leaderboard.page';
import {PosenetPage} from './posenet.page';

const routes: Routes = [
  {
    path: '',
    component: PosenetPage
  },
  {
    path: 'leaderboard',
    component: LeaderboardPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes)
  ],
  declarations: [PosenetPage]
})
export class PosenetPageModule {
}
