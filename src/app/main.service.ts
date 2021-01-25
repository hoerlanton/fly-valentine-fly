import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import {Subject, Observable} from 'rxjs';
import { Http } from '@angular/http';

@Injectable({
  providedIn: 'root'
})
export class MainService {
  addNewScore$: Observable<any>;
  private addNewScoreSubject = new Subject<any>();

  constructor(private http: HttpClient) {
    this.addNewScore$ = this.addNewScoreSubject.asObservable();
  }

  // tslint:disable-next-line:typedef
  postScore(score) {
    const data = {
      score: score.score,
      name: score.name,
      dateTime: score.dateTime,
      age: score.age
    };

    this.http.post('/api/score', data).pipe(
        map(res => res)
    ).subscribe(response => {
      console.log('POST Response:', response);
    });
  }

  // tslint:disable-next-line:typedef
  getAllScores() {
    return new Promise(resolve => {
      this.http.get('/api/leaderboard/').subscribe(response => {
        console.log('GET Response:', JSON.parse(JSON.stringify(response)));
        JSON.parse(JSON.stringify(response));
        resolve(response);
      });
    });
  }

  // tslint:disable-next-line:typedef
  addNewScore(data) {
    console.log(data);
    this.addNewScoreSubject.next(data);
  }
}
