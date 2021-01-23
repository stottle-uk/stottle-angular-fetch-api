import {
  HttpBackend,
  HttpErrorResponse,
  HttpEventType,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpSentEvent,
  HttpXhrBackend,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of, OperatorFunction, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

const XSSI_PREFIX = /^\)\]\}',?\n/;

@Injectable()
export class HttpFetchBackend implements HttpBackend {
  constructor(private xhr: HttpXhrBackend) {}

  handle(req: HttpRequest<unknown>) {
    if (!window.fetch || req.reportProgress) {
      return this.xhr.handle(req);
    }

    return this.doFetch(req).pipe(
      this.handleResponse(req),
      this.parseResponse(req),
      startWith({ type: HttpEventType.Sent } as HttpSentEvent)
    );
  }

  private doFetch(req: HttpRequest<unknown>) {
    return fromFetch(req.url, {
      method: req.method,
      body: req.serializeBody(),
      headers: this.mapFromHttpHeaders(req),
      credentials: req.withCredentials ? 'include' : 'omit',
    });
  }

  private handleResponse(
    req: HttpRequest<unknown>
  ): OperatorFunction<Response, Response> {
    return (res) =>
      res.pipe(
        catchError((error) =>
          throwError(
            new HttpErrorResponse({
              error,
              status: 0,
              statusText: 'Unknown Error',
              url: req.url,
            })
          )
        ),
        switchMap((res) =>
          !res.ok
            ? this.parseBody(res, req).pipe(
                catchError((error) => of(error)),
                switchMap((error) =>
                  throwError(
                    new HttpErrorResponse({
                      error,
                      headers: this.mapToHttpHeaders(res.headers),
                      status: res.status,
                      statusText: res.statusText,
                      url: res.url || undefined,
                    })
                  )
                )
              )
            : of(res)
        )
      );
  }

  private parseResponse(
    req: HttpRequest<unknown>
  ): OperatorFunction<Response, HttpResponse<unknown>> {
    return (res) =>
      res.pipe(
        switchMap((res) =>
          this.parseBody(res, req).pipe(
            catchError((error) =>
              throwError(
                new HttpErrorResponse({
                  error: {
                    error,
                    text: res.body,
                  },
                  headers: this.mapToHttpHeaders(res.headers),
                  status: res.status,
                  statusText: res.statusText,
                  url: res.url || undefined,
                })
              )
            ),
            map((body) => this.mapToHttpResponse(body, res))
          )
        )
      );
  }

  private parseBody(
    res: Response,
    req: HttpRequest<unknown>
  ): Observable<unknown> {
    switch (req.responseType) {
      case 'json':
        return from(res.text()).pipe(
          map((body) => body.replace(XSSI_PREFIX, '')),
          map((body) => (body !== '' ? JSON.parse(body) : null))
        );
      case 'blob':
        return from(res.blob());
      case 'arraybuffer':
        return from(res.arrayBuffer());
      default:
        return from(res.text());
    }
  }

  private mapToHttpResponse(body: unknown, res: Response) {
    return new HttpResponse({
      body,
      headers: this.mapToHttpHeaders(res.headers),
      status: res.status,
      statusText: res.statusText,
      url: res.url,
    });
  }

  private mapToHttpHeaders(res: Headers) {
    const headers = new HttpHeaders();
    res.forEach((val, key) => headers.set(key, val));
    return headers;
  }

  private mapFromHttpHeaders(req: HttpRequest<unknown>) {
    return req.headers
      .keys()
      .reduce(
        (headers, name) => ({ ...headers, [name]: req.headers.get(name) }),
        {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': req.detectContentTypeHeader(),
        }
      );
  }
}
