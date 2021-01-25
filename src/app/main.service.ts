import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Http } from '@angular/http';

@Injectable({
  providedIn: 'root'
})
export class MainService {

  constructor(private http: HttpClient) {
  }

  // tslint:disable-next-line:typedef
  postScore(score) {
    const data = {
      score: score.score,
      name: score.name,
      dateTime: score.dateTime,
      age: score.age
    };

    this.http.post('http://localhost:8080/api/score', data).pipe(
        map(res => res)
    ).subscribe(response => {
      console.log('POST Response:', response);
      return response;
    });
  }

  // tslint:disable-next-line:typedef
  getAllScores() {
    return new Promise(resolve => {
      this.http.get('http://localhost:8080/api/leaderboard/').subscribe(response => {
        console.log('GET Response:', JSON.parse(JSON.stringify(response)));
        JSON.parse(JSON.stringify(response));
        resolve(response);
      });
    });
  }
}
