import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpFetchModule } from './http-fetch/http-fetch.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpFetchModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
