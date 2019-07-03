import { Component, OnInit } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(private updates: SwUpdate) {}

  ngOnInit() {
    this.updates.available.subscribe(event => {
      console.log(event);
      const prompt = window.confirm(
        'アップデートがあります。今すぐ更新しますか？'
      );
      if (prompt) {
        this.updates.activateUpdate().then(() => document.location.reload());
      }
    });
  }
}
