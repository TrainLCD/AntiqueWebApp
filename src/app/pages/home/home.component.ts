import { BehaviorSubject, Subscription } from 'rxjs';

import { animate, style, transition, trigger } from '@angular/animations';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Station } from '../../models/StationAPI';
import { DistanceService } from '../../services/distance/distance.service';
import { GeolocationService } from '../../services/geolocation/geolocation.service';
import { StationApiService } from '../../services/station-api/station-api.service';

type TrainDirection = 'INBOUND' | 'OUTBOUND';
type HeaderContent = 'CURRENT_STATION' | 'NEXT_STOP';

const CONTENT_TRANSITION_INTERVAL = 5000;
const APPROACHING_THRESHOLD = 500;
const ARRIVED_THRESHOLD = 100;

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
  public get valueAsStyle(): any {
    return this.sanitizer.bypassSecurityTrustStyle(
      `--line-color: ${this.selectedLineColor}`
    );
  }

  private init() {
    const watchPositionSub = this.geolocationService
      .watchPosition()
      .subscribe(pos => {
        this.currentCoordinates = pos.coords;
        const { latitude, longitude } = pos.coords;
        const fetchStationSub = this.stationApiService
          .fetchNearestStation(latitude, longitude)
          .subscribe(station => {
            // 路線が選択されているときは違う駅の情報は無視する
            // ARRIVED_THRESHOLDより離れている場合無視する
            if (
              !this.selectedLineId ||
              (station.lines.filter(l => l.id === this.selectedLineId).length &&
                station.distance <= ARRIVED_THRESHOLD)
            ) {
              this.station.next(station);
            }
          });
        this.subscriptions.push(fetchStationSub);
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

  public handleLineButtonClick(lineId: number) {
    this.selectedLineId = lineId;

    const fetchByLineIdSub = this.stationApiService
      .fetchStationsByLineId(lineId)
      .subscribe(stations => {
        this.fetchedStations.next(stations);
      });
    this.subscriptions.push(fetchByLineIdSub);
  }

  private startTimer() {
    setInterval(() => {
      switch (this.headerContent) {
        case 'CURRENT_STATION':
          if (this.formedStations.length > 1) {
            this.headerContent = 'NEXT_STOP';
          }
          break;
        case 'NEXT_STOP':
          this.headerContent = 'CURRENT_STATION';
          break;
      }
    }, CONTENT_TRANSITION_INTERVAL);
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

  public get isLoopLine() {
    // 11302: 山手線, 11623: 大阪環状線
    const selectedLineIdStr = this.selectedLineId.toString();
    return selectedLineIdStr === '11302' || selectedLineIdStr === '11623';
  }

  private formedStationsForRingOperation(stations: Station[]) {
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
      return stations
        .slice(
          this.currentStationIndex - 7 > 0 ? this.currentStationIndex - 7 : 0,
          this.currentStationIndex + 1
        )
        .reverse();
    }

    if (this.currentStationIndex === stations.length - 1 && this.isLoopLine) {
      // 山手線は折り返す
      return [stations[this.currentStationIndex], ...stations.slice(0, 6)];
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

  public get formedStations() {
    const stations = this.fetchedStations.getValue();

    if (this.isLoopLine) {
      return this.formedStationsForRingOperation(stations);
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
      .lines.filter(l => l.id === this.selectedLineId)[0];
  }

  private get selectedLineColor() {
    if (!this.station.getValue() || !this.selectedLineId) {
      return null;
    }
    const lineColor = this.currentLine ? this.currentLine.lineColorC : null;
    return `${lineColor ? `#${lineColor}` : '#333'}`;
  }

  public get stationWrapperStyle() {
    return {
      borderBottom: `32px solid ${this.selectedLineColor}`,
      '--line-color': this.selectedLineColor
    };
  }

  public getHeaderStationNameStyle(stationName: string) {
    if (stationName.length > 5) {
      return {
        fontSize: '2.5rem'
      };
    }
    return {
      fontSize: '3.5rem'
    };
  }

  public get nextText() {
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
    if (nextStationDistance < APPROACHING_THRESHOLD) {
      return 'まもなく';
    }
    return 'つぎは';
  }
}
