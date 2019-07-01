import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private watchId: number;

  constructor() {}

  public getCurrentPosition(): Observable<Position> {
    return new Observable<Position>(observer => {
      navigator.geolocation.getCurrentPosition(
        position => observer.next(position),
        err => observer.error(err)
      );
    });
  }

  public watchPosition(): Observable<Position> {
    return new Observable<Position>(observer => {
      this.watchId = navigator.geolocation.watchPosition(
        position => observer.next(position),
        err => observer.error(err)
      );
    });
  }

  public clearWatch() {
    navigator.geolocation.clearWatch(this.watchId);
  }
}
