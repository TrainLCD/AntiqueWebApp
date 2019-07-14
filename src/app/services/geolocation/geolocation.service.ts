import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private watchId: number | null = null;

  constructor() {}

  public watchPosition(timeout = 10000): Observable<Position> {
    return new Observable<Position>(observer => {
      this.watchId = navigator.geolocation.watchPosition(
        position => observer.next(position),
        err => observer.error(err),
        { enableHighAccuracy: true, timeout }
      );
    });
  }

  public clearWatch() {
    if (!this.watchId) {
      return;
    }
    navigator.geolocation.clearWatch(this.watchId);
  }
}
