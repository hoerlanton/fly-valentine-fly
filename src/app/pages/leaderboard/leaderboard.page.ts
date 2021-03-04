import { Component, OnInit, AfterViewInit } from '@angular/core';
import {MainService} from '../../main.service';
import * as moment from 'moment';
import {NavigationEnd, Router} from '@angular/router';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.page.html',
  styleUrls: ['./leaderboard.page.scss'],
})
export class LeaderboardPage implements OnInit, AfterViewInit {

  allScores = [];
  constructor(private mainService: MainService,
              private router: Router) {
    this.mainService.addNewScore$.subscribe((data) => {
          this.getLeaderboard();
    });
    this.getLeaderboard();
  }

  ngOnInit(): void {

  }

  // tslint:disable-next-line:typedef
  backToGame() {
    this.router.navigate(['/']);
    this.mainService.resetGame();
  }

  // tslint:disable-next-line:typedef
  compare(a, b) {
    if (a.score < b.score ) {
      return 1;
    }
    if (a.score > b.score) {
      return -1;
    }
    // a muss gleich b sein
    return 0;
  }

  getLeaderboard(): void {
    this.allScores = [];
    this.mainService.getAllScores().then(response => {
      // @ts-ignore
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < response.length; i++) {
        this.allScores.push(response[i]);
        // console.log(this.allScores);
        this.allScores.sort(this.compare);
      }
    });
  }

  ngAfterViewInit(): void {
  }
}
