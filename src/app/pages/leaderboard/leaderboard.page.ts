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
          this.allScores.push(data); // And he have data here too!
          this.allScores.sort(this.compare);
      }
    );
  }

  compare( a, b ): number {
    if ( a.score < b.score ){
      return 1;
    }
    if ( a.score > b.score ){
      return -1;
    }
    return 0;
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.getLeaderboard();
  }

  // tslint:disable-next-line:typedef
  backToGame() {
    this.router.navigate(['/']);
  }

  getLeaderboard() {
    this.allScores = [];
    this.mainService.getAllScores().then(response => {
      // @ts-ignore
      for (let i = 0; i < response.length; i++) {
        this.allScores.push(response[i]);
        console.log(this.allScores);
      }
    });
  }

  ngAfterViewInit(): void {
  }
}
