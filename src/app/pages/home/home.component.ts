import { BehaviorSubject, Subscription } from 'rxjs';

import { animate, style, transition, trigger } from '@angular/animations';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Station, Line } from '../../models/StationAPI';
import { DistanceService } from '../../services/distance/distance.service';
import { GeolocationService } from '../../services/geolocation/geolocation.service';
import { StationApiService } from '../../services/station-api/station-api.service';

const HEADER_CONTENT_TRANSITION_INTERVAL = 5000; // ms
const BOTTOM_CONTENT_TRANSITION_INTERVAL =
  HEADER_CONTENT_TRANSITION_INTERVAL * 2; // ms
const APPROACHING_THRESHOLD = 600; // m
const ARRIVED_THRESHOLD = 200; // m
const BAD_ACCURACY_THRESHOLD = 1000; // m
const OMIT_JR_THRESHOLD = 3; // これ以上JR線があったら「JR線」で省略しよう

type TrainDirection = 'INBOUND' | 'OUTBOUND';
type HeaderContent = 'CURRENT_STATION' | 'NEXT_STOP' | 'NEXT_STOP_KANA';
type BottomContent = 'LINE' | 'TRANSFER';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('content', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1000ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('1000ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  private currentCoordinates: Coordinates;
  private subscriptions: Subscription[] = [];
  public station = new BehaviorSubject<Station>(null);
  public selectedLineId: number;
  public fetchedStations = new BehaviorSubject<Station[]>([]);
  public boundStation: Station;
  private boundDirection: TrainDirection;
  public headerContent: HeaderContent = 'CURRENT_STATION';
  public bottomContent: BottomContent = 'LINE';
  private badAccuracyDismissed = false;
  private scoredStations: Station[] = []; // distanceでソートされている

  constructor(
    private geolocationService: GeolocationService,
    private stationApiService: StationApiService,
    private distanceService: DistanceService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.init();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostBinding('attr.style')
  public get lineColorAsStyle(): any {
    return this.sanitizer.bypassSecurityTrustStyle(
      `--line-color-gradient: ${
        this.lineColorGradientVar
      }; --line-color-gradient-dot: ${this.lineColorGradientDotVar}`
    );
  }

  public get lineColorGradientVar(): string {
    return `linear-gradient(to bottom, ${
      this.selectedLineColor
    }, rgb(255, 255, 255), ${this.selectedLineColor})`;
  }

  public get lineColorGradientDotVar(): string {
    return `linear-gradient(to right bottom, ${this.selectedLineColor}bb, ${
      this.selectedLineColor
    }d2, ${this.selectedLineColor}ff)`;
  }

  public getRefreshConditions(station: Station) {
    if (this.station) {
      return true;
    }
    return (
      !this.selectedLineId ||
      (station.lines.filter(l => parseInt(l.id, 10) === this.selectedLineId)
        .length &&
        station.distance < ARRIVED_THRESHOLD)
    );
  }

  private fetchNearestStationFromAPI(latitude: number, longitude: number) {
    const fetchStationSub = this.stationApiService
      .fetchNearestStation(latitude, longitude)
      .subscribe(station => {
        // 路線が選択されているときは違う駅の情報は無視する
        // ARRIVED_THRESHOLDより離れている場合無視する
        const conditions = this.getRefreshConditions(station);
        if (!!conditions) {
          this.station.next(station);
        }
      });
    this.subscriptions.push(fetchStationSub);
  }

  private init() {
    const watchPositionSub = this.geolocationService
      .watchPosition()
      .subscribe(pos => {
        this.currentCoordinates = pos.coords;
        const { latitude, longitude } = pos.coords;
        if (!this.fetchedStations.getValue().length) {
          this.fetchNearestStationFromAPI(latitude, longitude);
        }
        const scoredStations = this.calcStationDistances(latitude, longitude);
        this.scoredStations = scoredStations;
        const nearestStation = scoredStations[0];
        const conditions = this.getRefreshConditions(nearestStation);
        if (!!conditions) {
          this.station.next(nearestStation);
        }
      });
    this.subscriptions.push(watchPositionSub);
  }

  public get ringBoundDirection() {
    return this.boundDirection === 'INBOUND' ? '内回り' : '外回り';
  }

  public lineButtonStyle(lineColor: string) {
    return {
      background: `#${lineColor ? lineColor : '#333'}`
    };
  }

  public handleLineButtonClick(lineId: string) {
    const intLineId = parseInt(lineId, 10);
    this.selectedLineId = intLineId;

    const fetchByLineIdSub = this.stationApiService
      .fetchStationsByLineId(intLineId)
      .subscribe(stations => {
        this.fetchedStations.next(stations);
        const { latitude, longitude } = this.currentCoordinates;
        const scoredStations = this.calcStationDistances(latitude, longitude);
        this.scoredStations = scoredStations;
        const nearestStation = scoredStations[0];
        this.station.next(nearestStation);
      });
    this.subscriptions.push(fetchByLineIdSub);
  }

  private calcStationDistances(latitude: number, longitude: number): Station[] {
    const fetchedStations = this.fetchedStations.getValue();
    const scored = fetchedStations.map(station => {
      const distance = this.distanceService.calcHubenyDistance(
        { latitude, longitude },
        { latitude: station.latitude, longitude: station.longitude }
      );
      return { ...station, distance };
    });
    scored.sort((a, b) => {
      if (a.distance < b.distance) {
        return -1;
      }
      if (a.distance > b.distance) {
        return 1;
      }
      return 0;
    });
    return scored;
  }

  private switchBottom() {
    switch (this.bottomContent) {
      case 'LINE':
        if (
          this.isArrived &&
          this.currentStationLinesWithoutCurrentLine.length
        ) {
          this.bottomContent = 'TRANSFER';
        }
        if (!this.isArrived && this.nextStationLinesWithoutCurrentLine.length) {
          this.bottomContent = 'TRANSFER';
        }
        break;
      case 'TRANSFER':
        this.bottomContent = 'LINE';
        break;
    }
  }

  private switchHeader() {
    switch (this.headerContent) {
      case 'CURRENT_STATION':
        if (this.formedStations.length > 1) {
          this.headerContent = 'NEXT_STOP';
        }
        break;
      case 'NEXT_STOP':
        // this.headerContent = 'NEXT_STOP_KANA';
        if (this.isArrived) {
          this.headerContent = 'CURRENT_STATION';
        }
        break;
      case 'NEXT_STOP_KANA':
        if (this.isArrived) {
          this.headerContent = 'CURRENT_STATION';
        } else {
          this.headerContent = 'NEXT_STOP';
        }
        break;
    }
  }

  private startTimer() {
    setInterval(() => {
      this.switchHeader();
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
    setInterval(() => {
      this.switchBottom();
    }, BOTTOM_CONTENT_TRANSITION_INTERVAL);
  }

  public handleBoundClick(direction: TrainDirection, selectedStation: Station) {
    this.boundDirection = direction;
    this.boundStation = selectedStation;

    this.startTimer();
  }

  public get headerStyle() {
    return {
      borderBottom: `4px solid ${this.selectedLineColor}`
    };
  }

  public get inboundStation() {
    const stations = this.fetchedStations.getValue();
    return stations[stations.length - 1];
  }

  public get outboundStation() {
    const stations = this.fetchedStations.getValue();
    return stations[0];
  }

  // 環状運転している電車は中間地点を方面にする
  public get inboundStationForLoopline() {
    const stations = this.fetchedStations.getValue();
    const maybeIndex = this.currentStationIndex - 4;
    const fallbackIndex = stations.length - 1 - 7;
    const index =
      maybeIndex < 0 || maybeIndex > stations.length
        ? fallbackIndex
        : maybeIndex;
    return stations[index];
  }

  public get outboundStationForLoopline() {
    const stations = this.fetchedStations.getValue();
    const maybeIndex = this.currentStationIndex + 4;
    const fallbackIndex = Math.floor((stations.length - 1) / 4);
    const index =
      maybeIndex < 0 || maybeIndex > stations.length
        ? fallbackIndex
        : maybeIndex;
    return stations[index];
  }

  public get isLoopLine() {
    return this.isYamanoteLine || this.isOsakaLoopLine;
  }

  private get isYamanoteLine() {
    if (!this.selectedLineId) {
      return false;
    }
    const selectedLineIdStr = this.selectedLineId.toString();
    return selectedLineIdStr === '11302';
  }

  private get isOsakaLoopLine() {
    if (!this.selectedLineId) {
      return false;
    }
    const selectedLineIdStr = this.selectedLineId.toString();
    return selectedLineIdStr === '11623';
  }

  private formedStationsForLoopOperation(stations: Station[]) {
    if (this.boundDirection === 'INBOUND') {
      if (this.currentStationIndex === 0 && this.isLoopLine) {
        // 山手線は折り返す
        return [
          stations[this.currentStationIndex],
          ...stations
            .slice()
            .reverse()
            .slice(0, 6)
        ];
      }

      // 環状線表示駅残り少ない
      const inboundPendingStations = stations
        .slice(
          this.currentStationIndex - 7 > 0 ? this.currentStationIndex - 7 : 0,
          this.currentStationIndex + 1
        )
        .reverse();

      // 山手線と大阪環状線はちょっと処理が違う
      if (this.currentStationIndex < 7 && this.isOsakaLoopLine) {
        const nextStations = stations
          .slice()
          .reverse()
          .slice(this.currentStationIndex - 1, 6);
        return [...inboundPendingStations, ...nextStations];
      }
      if (this.currentStationIndex < 7 && this.isYamanoteLine) {
        const nextStations = stations
          .slice()
          .reverse()
          .slice(0, this.currentStationIndex - 1);
        return [...inboundPendingStations, ...nextStations];
      }
      return inboundPendingStations;
    }

    // 環状線折返し駅
    if (this.currentStationIndex === stations.length - 1 && this.isLoopLine) {
      // 山手線は折り返す
      return [stations[this.currentStationIndex], ...stations.slice(0, 6)];
    }

    const outboundPendingStationCount =
      stations.length - this.currentStationIndex - 1;
    // 環状線表示駅残り少ない
    if (outboundPendingStationCount < 7 && this.isLoopLine) {
      return [
        ...stations.slice(this.currentStationIndex),
        ...stations.slice(0, 7 - outboundPendingStationCount)
      ];
    }

    return stations.slice(
      this.currentStationIndex,
      this.currentStationIndex + 8
    );
  }

  public get currentStationIndex() {
    const stations = this.fetchedStations.getValue();
    const currentStation = this.station.getValue();
    return stations.findIndex(s => s.groupId === currentStation.groupId);
  }

  public get formedStations(): Station[] {
    const stations = this.fetchedStations.getValue();

    if (this.isLoopLine) {
      return this.formedStationsForLoopOperation(stations);
    }

    if (this.boundDirection === 'OUTBOUND') {
      if (this.currentStationIndex === stations.length) {
        return stations
          .slice(this.currentStationIndex > 7 ? 7 : 0, 7)
          .reverse();
      }
      return stations
        .slice(
          this.currentStationIndex - 7 > 0 ? this.currentStationIndex - 7 : 0,
          this.currentStationIndex + 1
        )
        .reverse();
    }
    return stations.slice(
      this.currentStationIndex,
      this.currentStationIndex + 8
    );
  }

  public get currentLine() {
    return this.station
      .getValue()
      .lines.filter(l => parseInt(l.id, 10) === this.selectedLineId)[0];
  }

  private get selectedLineColor() {
    if (!this.station.getValue() || !this.selectedLineId) {
      return null;
    }
    const lineColor = this.currentLine ? this.currentLine.lineColorC : null;
    return `${lineColor ? `#${lineColor}` : '#333333'}`;
  }

  private get isApproaching(): boolean {
    const nextStation = this.formedStations[1];
    if (!nextStation) {
      return null;
    }
    const nextStationCoordinates: Partial<Coordinates> = {
      latitude: nextStation.latitude,
      longitude: nextStation.longitude
    };
    const nextStationDistance = this.distanceService.calcHubenyDistance(
      this.currentCoordinates,
      nextStationCoordinates
    );
    // APPROACHING_THRESHOLD以上次の駅から離れている: つぎは
    // APPROACHING_THRESHOLDより近い: まもなく
    return nextStationDistance < APPROACHING_THRESHOLD;
  }

  private get isArrived(): boolean {
    const currentStation = this.scoredStations[0];
    if (!currentStation) {
      return false;
    }
    return currentStation.distance < ARRIVED_THRESHOLD;
  }

  public get nextText() {
    if (this.isApproaching) {
      return 'まもなく';
    }
    if (this.headerContent === 'NEXT_STOP_KANA') {
      return 'つぎは';
    }
    return '次は';
  }

  public get badAccuracy(): boolean {
    if (!this.currentCoordinates) {
      return false;
    }
    if (this.badAccuracyDismissed) {
      return false;
    }
    const { accuracy } = this.currentCoordinates;
    return accuracy ? accuracy > BAD_ACCURACY_THRESHOLD : false;
  }

  public dismissBadAccuracy() {
    this.badAccuracyDismissed = true;
  }

  public transferLineDotStyle(lineId: string) {
    if (!this.isArrived && !this.nextStationLinesWithoutCurrentLine) {
      return;
    }
    if (this.isArrived && !this.currentStationLinesWithoutCurrentLine) {
      return;
    }
    const line = (this.isArrived
      ? this.currentStationLinesWithoutCurrentLine
      : this.nextStationLinesWithoutCurrentLine
    ).filter(l => parseInt(l.id, 10) === parseInt(lineId, 10))[0];
    return {
      background: `#${line.lineColorC ? line.lineColorC : '333333'}`
    };
  }

  public get transferLines(): Line[] {
    // 到着時は現在の駅の乗換情報を表示する
    if (this.isArrived) {
      return this.currentStationLinesWithoutCurrentLine;
    }
    return this.nextStationLinesWithoutCurrentLine;
  }

  private omitJRLinesIfThresholdExceeded(stationIndex: number): Line[] {
    const withoutCurrentLine = this.formedStations[stationIndex].lines.filter(
      line => line.id !== this.currentLine.id
    );
    const jrLines = withoutCurrentLine.filter(line => this.isJRLine(line));
    if (jrLines.length >= OMIT_JR_THRESHOLD) {
      const withoutJR = withoutCurrentLine.filter(line => !this.isJRLine(line));
      withoutJR.unshift({
        id: '0',
        lineColorC: '008000', // 関西の人間に喧嘩を売る配色
        name: 'JR線',
        __typename: 'Line'
      });
      return withoutJR;
    }
    return withoutCurrentLine;
  }

  private get currentStationLinesWithoutCurrentLine(): Line[] {
    return this.omitJRLinesIfThresholdExceeded(0);
  }

  private get nextStationLinesWithoutCurrentLine(): Line[] {
    return this.omitJRLinesIfThresholdExceeded(1);
  }

  public isJRLine(line: Line) {
    const exceptedJRLines = ['上野東京ライン', '京都線', '大阪環状線']; // TODO: StationAPI側でなんとかする
    return (
      line.name.startsWith('JR') || exceptedJRLines.indexOf(line.name) !== -1
    );
  }

  public headerStationNameStyle(stationName: string) {
    if (stationName.length > 10) {
      return {
        fontSize: '5vw'
      };
    }
    return {
      fontSize: '7.5vw'
    };
  }
}
