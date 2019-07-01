import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GeolocationService } from '../../services/geolocation/geolocation.service';
import { StationApiService } from '../../services/station-api/station-api.service';
import { HomeComponent } from '../home/home.component';
import { HomeRoutingModule } from './home-routing.module';

@NgModule({
  declarations: [HomeComponent],
  imports: [
    CommonModule,
    HomeRoutingModule
  ],
  providers: [
    GeolocationService,
    StationApiService
  ]
})
export class HomeModule { }
