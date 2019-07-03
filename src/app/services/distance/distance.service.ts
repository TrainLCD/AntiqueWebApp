import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DistanceService {

  constructor() { }

  calcHubenyDistance(from: Partial<Coordinates>, to: Partial<Coordinates>) {
    const rad = (deg: number) => {
      return deg * Math.PI / 180;
    };
    const radFromLat = rad(from.latitude);
    const radFromLon = rad(from.longitude);
    const radToLat = rad(to.latitude);
    const radToLon = rad(to.longitude);

    const latDiff = radFromLat - radToLat;
    const lngDiff = radFromLon - radToLon;
    const latAvg = (radFromLat + radToLat) / 2.0;
    const a = 6378137.0;
    const e2 = 0.00669438002301188;
    const a1e2 = 6335439.32708317;

    const sinLat = Math.sin(latAvg);
    const W2 = 1.0 - e2 * (sinLat * sinLat);

    const M = a1e2 / (Math.sqrt(W2) * W2);
    const N = a / Math.sqrt(W2);

    const t1 = M * latDiff;
    const t2 = N * Math.cos(latAvg) * lngDiff;
    return Math.sqrt((t1 * t1) + (t2 * t2));
  }
}
