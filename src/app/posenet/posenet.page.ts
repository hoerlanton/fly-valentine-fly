import {Component, ElementRef, OnInit, ViewChild, AfterViewInit} from '@angular/core';
import {getAdjacentKeyPoints, load, PoseNet} from '@tensorflow-models/posenet';
import {LoadingController} from '@ionic/angular';
import Speech from 'speak-tts';

@Component({
  selector: 'app-posenet',
  templateUrl: './posenet.page.html',
  styleUrls: ['./posenet.page.scss'],
})
export class PosenetPage implements OnInit, AfterViewInit {

  @ViewChild('fileSelector') fileInput!: ElementRef;
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
  speechCounter = 0;
  counter = 0;
  increaseCounter = false;
  result = '';
  objects = {Flugzeug: true, Katze: false, Vogel: true, Haus: false, Wolke: true, Baum: false, Stuhl: false, Brot: false, Smartphone: false, Geldtasche: false, Kuh: false, Papagei: true, Huhn: false, Schneeball: false, Adler: true, Fliege: true, Mücke: true, Helikopter: true, Kampfjet: true, Rakete: true};
  objectsLength = Object.keys(this.objects).length;
  objectChosen = this.chooseOne(this.objects);
  text = 'Punkte | Es fliegt, es fliegt ein/e: ' + this.objectChosen.key;
  timeLeft = 5;
  interval = 0;
  speech = new Speech();

  constructor(private readonly loadingController: LoadingController) {
    this.modelPromise = load({
      architecture: 'MobileNetV1',
      outputStride: 8,
      inputResolution: 400,
      multiplier: 0.5
    });
  }

  ngOnInit(): void {
    // will throw an exception if not browser supported
    if (this.speech.hasBrowserSupport()) { // returns a boolean
      console.log('speech synthesis supported');
    }
    this.speech.init({
      'volume': 1,
      'lang': 'de-DE',
      'rate': 1,
      'pitch': 1,
      'splitSentences': true,
      'listeners': {
        'onvoiceschanged': (voices) => {
          console.log("Event voiceschanged", voices)
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

  ngAfterViewInit(): void {
      const video = <HTMLVideoElement> document.querySelector('#videoElement');
      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: true})
            .then((stream) => {
              video.srcObject = stream;
              const FPS = 50;
              setInterval(() => {
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

  capture(video, scaleFactor): HTMLCanvasElement {
    if (scaleFactor == null) {
      scaleFactor = 1;
    }
    const w = video.videoWidth * scaleFactor;
    const h = video.videoHeight * scaleFactor;
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, w, h);
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

  clickFileSelector(): void {
    this.fileInput.nativeElement.click();
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

  // tslint:disable-next-line:typedef
  speakText(textToSpeak) {
    this.speech.speak({
      text: textToSpeak,
    }).then(() => {
      console.log('Success !');
    }).catch(e => {
      console.error('An error occurred :', e);
    })
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
    this.points = 0;
    this.result = 'Falsch 😔';
    this.handsUp = 0;
    this.handsDown = 0;
    this.showResult = true;
    this.increaseCounter = true;
    this.objectChosen = this.chooseOne(this.objects);
    this.speechCounter = 0;
  }

  // tslint:disable-next-line:no-any
  private async estimate(img: any): Promise<void> {
    const flipHorizontal = true;
    const model = await this.modelPromise;
    const poses = await model.estimatePoses(img, {
      flipHorizontal,
      decodingMethod: 'single-person'
    });
    // console.log(JSON.stringify(this.objectChosen.key));
    // console.log(this.objectChosen.value);
    // console.log('poses');
    // console.log(poses);
    // console.log('counter');
    // console.log(this.counter);
    // console.log('handsup');
    // console.log(this.handsUp);
    // console.log('handsdown');
    // console.log(this.handsDown);
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
      if (this.points === 6) {
        this.points = 0;
      }
      this.counter = 0;
      this.showResult = false;
      this.increaseCounter = false;
    }

    this.showInstructions = true;
    // Different scenarios can occur. Adjust Feedback and points according to scenario
    if (this.handsUp > 20 && this.objectChosen.value === true) {
      this.processRight();
    } else if (this.handsDown > 20 && this.objectChosen.value === false) {
      this.processRight();
    } else if (this.handsUp > 20 && this.objectChosen.value === false) {
      this.processWrong();
    } else if (this.handsDown > 20 && this.objectChosen.value === true) {
      this.processWrong();
    }

    if (this.points === 6) {
      this.result = 'Gratulation - Du hast gewonnen!! 🥳';
      this.showResult = true;
      this.increaseCounter = true;
      this.text = 'Es fliegt, es fliegt ein/e: ' + this.objectChosen.key;
      if (this.speechCounter === 0) {
        this.speakText('Gratulation - Du hast gewonnen');
      }
      this.speechCounter++;
    } else {
      this.text = 'Es fliegt, es fliegt ein/e: ' + this.objectChosen.key;
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

        // this.ctx.beginPath();
        // this.ctx.arc(x, y, 5, 0, 2 * Math.PI, false);
        // this.ctx.lineWidth = 3;
        // this.ctx.strokeStyle = '#9048ac';
        // this.ctx.stroke();
      }

      const adjacentKeyPoints = getAdjacentKeyPoints(pose.keypoints, 0.2);
      // adjacentKeyPoints.forEach(keypoints => this.drawSegment(keypoints[0].position, keypoints[1].position));
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
}
