import { HttpBackend, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { HttpFetchBackend } from './services/http-fetch-backend.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [
    HttpFetchBackend,
    { provide: HttpBackend, useExisting: HttpFetchBackend },
  ],
})
export class HttpFetchModule {}
