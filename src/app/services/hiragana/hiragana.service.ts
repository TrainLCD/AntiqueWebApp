import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

type GooHiraganaApiOutputType = 'hiragana' | 'katakana';

interface GooHiraganaApiRequestPayload {
  app_id: string;
  request_id?: string;
  sentence: string;
  output_type: GooHiraganaApiOutputType;
}

interface GooHiraganaApiResponse {
  request_id: string;
  output_type: string;
  converted: string;
}

@Injectable({
  providedIn: 'root'
})
export class HiraganaService {
  constructor(private http: HttpClient) {}

  public toHiragana(sentence: string): Observable<string> {
    const { gooAppID } = environment;
    const endpoint = 'https://labs.goo.ne.jp/api/hiragana';
    const req: GooHiraganaApiRequestPayload = {
      sentence,
      app_id: gooAppID,
      output_type: 'hiragana'
    };
    return this.http
      .post<GooHiraganaApiResponse>(endpoint, req)
      .pipe(map(res => res.converted));
  }
}
