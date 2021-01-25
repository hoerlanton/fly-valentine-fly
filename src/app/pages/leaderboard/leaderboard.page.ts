import { Component, OnInit } from '@angular/core';
import {MainService} from '../../main.service';
import * as moment from 'moment';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.page.html',
  styleUrls: ['./leaderboard.page.scss'],
})
export class LeaderboardPage implements OnInit {

  allScores = [];
  constructor(private mainService: MainService) {
    // @ts-ignore
    this.mainService.getAllScores().then(response => {
      // @ts-ignore
      for (let i = 0; i < response.length; i++) {
        this.allScores.push(response[i]);
        console.log(this.allScores);
      }
    });
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {

  }
}
