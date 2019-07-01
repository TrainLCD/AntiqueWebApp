import { BehaviorSubject, Subscription } from 'rxjs';

import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Station } from '../../models/StationAPI';
import { GeolocationService } from '../../services/geolocation/geolocation.service';
import { StationApiService } from '../../services/station-api/station-api.service';

type TrainDirection = 'INBOUND' | 'OUTBOUND';
type HeaderContent = 'CURRENT_STATION' | 'NEXT_STOP';

const CONTENT_TRANSITION_INTERVAL = 5000;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('content', [
      transition(':enter', [
        style({opacity: 0}),
        animate('1000ms', style({opacity: 1}))
      ]),
      transition(':leave', [
        style({ opacity: 1}),
        animate('1000ms', style({opacity: 0}))
      ])
  ]),
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  public station = new BehaviorSubject<Station>(null);
  public selectedLineId: number;
  public fetchedStations = new BehaviorSubject<Station[]>([]);
  public boundStation: Station;
  private boundDirection: TrainDirection;
  public headerContent: HeaderContent = 'NEXT_STOP';

  constructor(
    private geolocationService: GeolocationService,
    private stationApiService: StationApiService,
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
    return this.sanitizer.bypassSecurityTrustStyle(`--line-color: ${this.selectedLineColor}`);
  }

  private init() {
    const watchPositionSub = this.geolocationService
      .watchPosition()
      .subscribe(pos => {
        const { latitude, longitude } = pos.coords;
        const fetchStationSub = this.stationApiService
          .fetchNearestStation(latitude, longitude)
          .subscribe(station => {
            this.station.next(station);
          });
        this.subscriptions.push(fetchStationSub);
      });
    this.subscriptions.push(watchPositionSub);
  }

  public lineButtonStyle(lineColor: string) {
    return {
      background: `#${lineColor}`
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
          if (this.formedStations.length) {
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

  public get formedStations() {
    const stations = this.fetchedStations.getValue();
    const currentStation = this.station.getValue();
    const currentStationIndex = stations.findIndex(
      s => s.groupId === currentStation.groupId
    );
    if (this.boundDirection === 'OUTBOUND') {
      return stations
        .slice(currentStationIndex - 7, currentStationIndex + 1)
        .reverse();
    }
    return stations.slice(currentStationIndex, currentStationIndex + 8);
  }

  private get selectedLineColor() {
    if (!this.station.getValue() || !this.selectedLineId) {
      return null;
    }
    return `#${this.station
    .getValue()
    .lines.filter(line => line.id === this.selectedLineId)[0].lineColorC}`;
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
}
