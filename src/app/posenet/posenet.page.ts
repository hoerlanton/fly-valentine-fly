import {Component, ElementRef, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {getAdjacentKeyPoints, load, PoseNet} from '@tensorflow-models/posenet';
import {LoadingController} from '@ionic/angular';
import Speech from 'speak-tts';
import {MainService} from '../main.service';
import * as moment from 'moment';
import {Router} from '@angular/router';
import {Score} from '../score';

@Component({
  selector: 'app-posenet',
  templateUrl: './posenet.page.html',
  styleUrls: ['./posenet.page.scss'],
})
export class PosenetPage implements OnInit, AfterViewInit {

  @ViewChild('canvas', {static: true}) canvas!: ElementRef;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef;
  ratio: number | null = null;
  modelPromise: Promise<PoseNet>;
  private ctx!: CanvasRenderingContext2D;
  hasGetUserMedia = false;
  handsUp = 0;
  handsDown = 0;
  showInstructions = false;
  showResult = false;
  handsDownInSeconds = 0;
  handsUpInSeconds = 0;
  points = 0;
  showRulesToggle = false;
  speechCounter = 0;
  counter = 0;
  increaseCounter = false;
  showCountdown = true;
  result = '';
  objects = {
    Flugzeug: true,
    Katze: false,
    Vogel: true,
    Haus: false,
    Wolke: true,
    Baum: false,
    Stuhl: false,
    Brot: false,
    Smartphone: false,
    Geldtasche: false,
    Kuh: false,
    Papagei: true,
    Huhn: false,
    Schneeball: false,
    Adler: true,
    Fliege: true,
    Mücke: true,
    Helikopter: true,
    Kampfjet: true,
    Rakete: true
  };
  objectChosen = this.chooseOne(this.objects);
  text = this.objectChosen.key;
  interval = 0;
  speech = new Speech();
  gameFinished = false;
  counterCountdown = 5;
  running = false;
  refreshIntervalId = null;
  mistakes = 0;
  pace = 4;
  score: Score = new Score();
  pointsToReach = 5;
  scoreToDisplay = 0;
  mobileAccess = false;

  constructor(private readonly loadingController: LoadingController,
              private mainService: MainService,
              private router: Router) {
    this.modelPromise = load({
      architecture: 'MobileNetV1',
      outputStride: 8,
      inputResolution: 400,
      multiplier: 0.5
    });
    this.mainService.resetGame$.subscribe(() => {
      this.gameFinished = false;
    });
  }

  ngOnInit(): void {
    this.detectMob();
    window.addEventListener("DOMContentLoaded", event => {
      const audio = document.querySelector("audio");
      audio.volume = 0.2;
      audio.play();
    });
    // will throw an exception if not browser supported
    if (this.speech.hasBrowserSupport()) { // returns a boolean
      console.log('speech synthesis supported');
    }
    this.speech.init({
      volume: 1,
      lang: 'de-DE',
      rate: 1,
      pitch: 1,
      splitSentences: true,
      listeners: {
        onvoiceschanged: (voices) => {
          console.log('Event voiceschanged', voices);
        }
      }
    }).then((data) => {
      // The "data" object contains the list of available voices and the voice synthesis params
      console.log('Speech is ready, voices are available', data);
    }).catch(e => {
      console.error('An error occured while initializing : ', e);
    });
    this.ctx = this.canvas.nativeElement.getContext('2d');
  }

  // tslint:disable-next-line:typedef
  myLoop() {
    // tslint:disable-next-line:prefer-const
    const root = this;
    // tslint:disable-next-line:typedef only-arrow-functions
    setTimeout(function() {
      root.counterCountdown--;
      if (root.counterCountdown >= 0) {
        if (root.counterCountdown === 0) {
          root.showCountdown = false;
        } else {
          root.myLoop();
        }
      }
    }, 1000);
  }

  play(): void {
    this.running = true;
    this.gameFinished = false;
    this.showResult = false;
    this.counterCountdown = 3;
    this.points = 0;
    this.showCountdown = true;
    this.myLoop();
    const video = document.querySelector('#videoElement') as HTMLVideoElement;
    if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: true})
            .then((stream) => {
              video.srcObject = stream;
              const FPS = 50;
              this.refreshIntervalId = setInterval(() => {
                const type = 'image/png';
                const videoElement = document.getElementById('videoElement');
                const frame = this.capture(videoElement, 1);
                if (frame.width !== 0) {
                  this.drawImageScaled(frame);
                  this.estimate(frame);
                }
              }, 10000 / FPS); // 200 ms is good video quality
            })
            .catch((error) => {
              console.log('Something went wrong!');
            });
      } else {
        alert('getUserMedia() is not supported by your browser');
      }
  }

  chooseOne(obj: any): any {
    let k = '';
    let n = 0;
    JSON.stringify(obj, (key, value) => (key && ++n || value));
    n *= Math.random();
    JSON.stringify(obj, (key, value) => (key && --n | 0 || (k = key) || value));
    return {key: k, value: obj[k]};
  }

  showRules(): void {
    if (this.showRulesToggle === false) {
      this.showRulesToggle = true;
    } else {
      this.showRulesToggle = false;
    }
  }

  capture(video, scaleFactor): HTMLCanvasElement {
    if (scaleFactor == null) {
      scaleFactor = 1;
    }
    const w = video.videoWidth * scaleFactor;
    const h = video.videoHeight * scaleFactor;
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if ('drawImage' in ctx) {
      ctx.drawImage(video, 0, 0, w, h);
    } else {
      console.log('no imgae drawn');
    }
    return canvas;
  }

  onFileCange(event: Event): void {
    // @ts-ignore
    const url = URL.createObjectURL(event.target.files[0]);
    const img = new Image();
    img.onload = async () => {
      this.drawImageScaled(img);
      const loading = await this.loadingController.create({
        message: 'Estimating...'
      });
      await loading.present();
      await this.estimate(img);
      await loading.dismiss();
    };
    img.src = url;
  }

  // tslint:disable-next-line:no-any
  drawImageScaled(img: any): void {
    const width = this.canvasContainer.nativeElement.clientWidth;
    const height = this.canvasContainer.nativeElement.clientHeight;

    const hRatio = width / img.width;
    const vRatio = height / img.height;
    this.ratio = Math.min(hRatio, vRatio);
    if (this.ratio > 1) {
      this.ratio = 1;
    }

    this.canvas.nativeElement.width = img.width * this.ratio;
    this.canvas.nativeElement.height = img.height * this.ratio;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(img, 0, 0, img.width, img.height,
      0, 0, img.width * this.ratio, img.height * this.ratio);
  }

  speakText(textToSpeak): void {
    this.speech.speak({
      text: textToSpeak,
    }).then(() => {
      console.log('Success !');
    }).catch(e => {
      console.error('An error occurred :', e);
    });
  }

  processRight(){
    this.points++;
    this.result = 'Richtig 😊';
    this.handsUp = 0;
    this.handsDown = 0;
    this.showResult = true;
    this.increaseCounter = true;
    this.objectChosen = this.chooseOne(this.objects);
    this.speechCounter = 0;
  }

  processWrong(){
    this.result = 'Falsch 😔';
    this.handsUp = 0;
    this.handsDown = 0;
    this.showResult = true;
    this.increaseCounter = true;
    this.objectChosen = this.chooseOne(this.objects);
    this.speechCounter = 0;
    this.mistakes++;
  }

  // tslint:disable-next-line:no-any
  private async estimate(img: any): Promise<void> {
    const flipHorizontal = false;
    const model = await this.modelPromise;
    const poses = await model.estimatePoses(img, {
      flipHorizontal,
      decodingMethod: 'single-person'
    });
    // Find out if hands are up

    if (poses && poses[0].keypoints[0]) {
      if (poses[0].keypoints[0].position.y > poses[0].keypoints[7].position.y) {
        this.handsUp++;
        this.handsDown = 0;
      } else if (poses[0].keypoints[0].position.y > poses[0].keypoints[8].position.y) {
        this.handsUp++;
        this.handsDown = 0;
      } else if (poses[0].keypoints[0].position.y > poses[0].keypoints[9].position.y) {
        this.handsUp++;
        this.handsDown = 0;
      } else if (poses[0].keypoints[0].position.y > poses[0].keypoints[10].position.y) {
        this.handsUp++;
        this.handsDown = 0;
      } else {
        this.handsDown++;
        this.handsUp = 0;
      }
    }
    this.handsDownInSeconds = Math.floor(this.handsDown / 5);
    this.handsUpInSeconds = Math.floor(this.handsUp / 5);

    if (this.counter <= 10 && this.increaseCounter) {
      this.counter++;
    } else {
      if (this.points === this.pointsToReach) {
        this.points = 0;
      }
      this.counter = 0;
      this.showResult = false;
      this.increaseCounter = false;
    }

    this.showInstructions = true;
    // Different scenarios can occur. Adjust Feedback and points according to scenario
    if (this.handsUp > 5 * this.pace && this.objectChosen.value === true) {
      this.processRight();
    } else if (this.handsDown > 5 * this.pace && this.objectChosen.value === false) {
      this.processRight();
    } else if (this.handsUp > 5 * this.pace && this.objectChosen.value === false) {
      this.processWrong();
    } else if (this.handsDown > 5 * this.pace && this.objectChosen.value === true) {
      this.processWrong();
    }

    if (this.points === this.pointsToReach) {
      this.result = 'Gratulation - Du hast gewonnen!! 🥳';
      clearInterval(this.refreshIntervalId);
      this.scoreToDisplay = (this.points * 100 - this.mistakes * 100) / this.pace;
      this.gameFinished = true;
      this.running = false;
      this.showResult = true;
      this.increaseCounter = true;
      this.counterCountdown = 0;
      this.text = this.objectChosen.key;
      if (this.speechCounter === 0) {
        this.speakText('Gratulation - Du hast gewonnen');
      }
      this.speechCounter++;
    } else {
      this.text = this.objectChosen.key;
      if (this.speechCounter === 0) {
        this.speakText(this.objectChosen.key);
      }
      this.speechCounter++;
    }

    const pose = poses && poses[0];

    if (pose && pose.keypoints && this.ratio) {
      for (const keypoint of pose.keypoints.filter(kp => kp.score >= 0.2)) {
        const x = keypoint.position.x * this.ratio;
        const y = keypoint.position.y * this.ratio;

        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI, false);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#9048ac';
        this.ctx.stroke();
      }

      const adjacentKeyPoints = getAdjacentKeyPoints(pose.keypoints, 0.2);
      if (this.counterCountdown >= 0) {
       // adjacentKeyPoints.forEach(keypoints => this.drawSegment(keypoints[0].position, keypoints[1].position));
      }
    }
  }

  private drawSegment({y: ay, x: ax}: { y: number, x: number }, {y: by, x: bx}: { y: number, x: number }): void {
    if (this.ratio) {
      this.ctx.beginPath();
      this.ctx.moveTo(ax * this.ratio, ay * this.ratio);
      this.ctx.lineTo(bx * this.ratio, by * this.ratio);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#bada55';
      this.ctx.stroke();
    }
  }

  submitScore(): void {
    console.log('Submit Score called');
    if (this.gameFinished === true) {
      this.score.score = (this.points * 100 - this.mistakes * 100) / this.pace;
      this.score.dateTime = moment().format();
      this.mainService.postScore(this.score);
    }
  }

  showLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  forwardToLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  ngAfterViewInit(): void {
  }

  detectMob(): void {
    if ( ( window.innerWidth <= 800 ) && ( window.innerHeight <= 900 ) ) {
      console.log('Mobile');
      this.mobileAccess = true;
    }
  }
}
