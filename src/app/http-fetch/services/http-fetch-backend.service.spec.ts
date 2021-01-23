import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpRequest,
  HttpResponse,
  HttpXhrBackend,
} from '@angular/common/http';
import fetchMock from 'fetch-mock';
import { Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { MockXhrFactory } from '../mocks/http-xhr.mock';
import { HttpFetchBackend } from './http-fetch-backend.service';

function trackEvents(obs: Observable<HttpEvent<any>>): HttpEvent<any>[] {
  const events: HttpEvent<any>[] = [];
  obs.subscribe(
    (event) => events.push(event),
    (err) => events.push(err)
  );
  return events;
}

const TEST_POST = new HttpRequest('POST', 'http://example.com/', 'some body', {
  responseType: 'text',
});

const XSSI_PREFIX = ")]}'\n";

describe('XhrBackend', () => {
  let factory: MockXhrFactory = null!;
  let xhrbackend: HttpXhrBackend = null!;
  let backend: HttpFetchBackend = null!;
  beforeEach(() => {
    factory = new MockXhrFactory();
    xhrbackend = new HttpXhrBackend(factory);
    backend = new HttpFetchBackend(xhrbackend);

    fetchMock.mock('http://example.com', {
      status: 200,
      body: 'some response',
    });
  });
  afterEach(() => {
    fetchMock.restore();
  });
  it('emits status immediately', () => {
    const events = trackEvents(backend.handle(TEST_POST));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(HttpEventType.Sent);
  });
  it('sets method, url, and responseType correctly', () => {
    backend.handle(TEST_POST).subscribe();

    const opts = fetchMock.lastOptions();
    expect(opts.method).toBe('POST');
    expect(fetchMock.lastUrl()).toBe(TEST_POST.url);
  });
  it('sets outgoing body correctly', () => {
    backend.handle(TEST_POST).subscribe();

    const opts = fetchMock.lastOptions();
    expect(opts.body).toBe('some body' as Object);
  });
  it('sets outgoing headers, including default headers', () => {
    const post = TEST_POST.clone({
      setHeaders: {
        Test: 'Test header',
      },
    });
    backend.handle(post).subscribe();

    const opts = fetchMock.lastOptions();
    expect(opts.headers).toEqual({
      Test: 'Test header',
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'text/plain',
    });
  });
  it('sets outgoing headers, including overriding defaults', () => {
    const setHeaders = {
      Test: 'Test header',
      Accept: 'text/html',
      'Content-Type': 'text/css',
    };
    backend.handle(TEST_POST.clone({ setHeaders })).subscribe();
    const opts = fetchMock.lastOptions();
    expect(opts.headers).toEqual(setHeaders);
  });
  it('passes withCredentials through', () => {
    backend.handle(TEST_POST.clone({ withCredentials: true })).subscribe();

    const opts = fetchMock.lastOptions();
    expect((opts as any).credentials).toBe('include');
  });
  it('handles a text response', (done) => {
    backend
      .handle(TEST_POST)
      .pipe(toArray())
      .subscribe((events) => {
        expect(events.length).toBe(2);
        expect(events[1].type).toBe(HttpEventType.Response);
        expect(events[1] instanceof HttpResponse).toBeTruthy();
        const res = events[1] as HttpResponse<string>;
        expect(res.body).toBe('some response');
        expect(res.status).toBe(200);
        expect(res.statusText).toBe('OK');
        done();
      });
  });
  it('handles a json response', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 200,
      body: JSON.stringify({ data: 'some data' }),
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe((events) => {
        expect(events.length).toBe(2);
        const res = events[1] as HttpResponse<{ data: string }>;
        expect(res.body!.data).toBe('some data');
        done();
      });
  });
  it('handles a blank json response', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 200,
      body: '',
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe((events) => {
        expect(events.length).toBe(2);
        const res = events[1] as HttpResponse<{ data: string }>;
        expect(res.body).toBeNull();
        done();
      });
  });
  it('handles a json error response', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 500,
      body: JSON.stringify({ data: 'some data' }),
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe(
        () => {},
        (err) => {
          // expect(events.length).toBe(2);
          // const res = (events[1] as any) as HttpErrorResponse;
          // expect(res.error!.data).toBe('some data');
          expect(err.error!.data).toBe('some data');
          done();
        }
      );
  });
  it('handles a json error response with XSSI prefix', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 500,
      body: XSSI_PREFIX + JSON.stringify({ data: 'some data' }),
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe(
        () => {},
        (err) => {
          // expect(events.length).toBe(2);
          // const res = (events[1] as any) as HttpErrorResponse;
          // expect(res.error!.data).toBe('some data');
          expect(err.error!.data).toBe('some data');
          done();
        }
      );
  });
  it('handles a json string response', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 200,
      body: JSON.stringify('this is a string'),
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe((events) => {
        expect(events.length).toBe(2);
        const res = events[1] as HttpResponse<string>;
        expect(res.body).toEqual('this is a string');
        done();
      });
  });
  it('handles a json response with an XSSI prefix', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 200,
      body: XSSI_PREFIX + JSON.stringify({ data: 'some data' }),
    });

    backend
      .handle(
        TEST_POST.clone({
          responseType: 'json',
          url: 'http://example.com/json',
        })
      )
      .pipe(toArray())
      .subscribe((events) => {
        expect(events.length).toBe(2);
        const res = events[1] as HttpResponse<{ data: string }>;
        expect(res.body!.data).toBe('some data');
        done();
      });
  });
  it('emits unsuccessful responses via the error path', (done) => {
    fetchMock.mock('http://example.com/json', {
      status: 400,
      body: 'this is the error',
    });

    backend
      .handle(
        TEST_POST.clone({
          url: 'http://example.com/json',
        })
      )
      .subscribe(
        () => {},
        (err: HttpErrorResponse) => {
          expect(err instanceof HttpErrorResponse).toBe(true);
          expect(err.error).toBe('this is the error');
          done();
        }
      );
  });
  it('emits real errors via the error path', (done) => {
    fetchMock.mock('http://example.com/json', {
      throws: new Error('blah'),
    });

    backend
      .handle(
        TEST_POST.clone({
          url: 'http://example.com/json',
        })
      )
      .subscribe(
        () => {},
        (err: HttpErrorResponse) => {
          expect(err instanceof HttpErrorResponse).toBe(true);
          expect(err.error instanceof Error).toBeTrue();
          expect(err.url).toBe('http://example.com/json');
          done();
        }
      );
  });
  xit('avoids abort a request when fetch operation is completed', (done) => {
    // rxjsfetch will handle abort?
    const abort = jasmine.createSpy('abort');

    backend
      .handle(TEST_POST)
      .toPromise()
      .then(() => {
        expect(abort).not.toHaveBeenCalled();
        done();
      });

    factory.mock.abort = abort;
    factory.mock.mockFlush(200, 'OK', 'Done');
  });

  xdescribe('gets response URL', () => {
    // don't know how to do this yet
    it('from XHR.responsesURL', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe((events) => {
          expect(events.length).toBe(2);
          expect(events[1].type).toBe(HttpEventType.Response);
          const response = events[1] as HttpResponse<string>;
          expect(response.url).toBe('/response/url');
          done();
        });
      factory.mock.responseURL = '/response/url';
      factory.mock.mockFlush(200, 'OK', 'Test');
    });
    it('from X-Request-URL header if XHR.responseURL is not present', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe((events) => {
          expect(events.length).toBe(2);
          expect(events[1].type).toBe(HttpEventType.Response);
          const response = events[1] as HttpResponse<string>;
          expect(response.url).toBe('/response/url');
          done();
        });
      factory.mock.mockResponseHeaders = 'X-Request-URL: /response/url\n';
      factory.mock.mockFlush(200, 'OK', 'Test');
    });
    it('falls back on Request.url if neither are available', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe((events) => {
          expect(events.length).toBe(2);
          expect(events[1].type).toBe(HttpEventType.Response);
          const response = events[1] as HttpResponse<string>;
          expect(response.url).toBe('/test');
          done();
        });
      factory.mock.mockFlush(200, 'OK', 'Test');
    });
  });
  xdescribe('corrects for quirks', () => {
    it('by normalizing 1223 status to 204', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe((events) => {
          expect(events.length).toBe(2);
          expect(events[1].type).toBe(HttpEventType.Response);
          const response = events[1] as HttpResponse<string>;
          expect(response.status).toBe(204);
          done();
        });
      factory.mock.mockFlush(1223, 'IE Special Status', 'Test');
    });
    it('by normalizing 0 status to 200 if a body is present', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe((events) => {
          expect(events.length).toBe(2);
          expect(events[1].type).toBe(HttpEventType.Response);
          const response = events[1] as HttpResponse<string>;
          expect(response.status).toBe(200);
          done();
        });
      factory.mock.mockFlush(0, 'CORS 0 status', 'Test');
    });
    it('by leaving 0 status as 0 if a body is not present', (done) => {
      backend
        .handle(TEST_POST)
        .pipe(toArray())
        .subscribe(undefined, (error: HttpErrorResponse) => {
          expect(error.status).toBe(0);
          done();
        });
      factory.mock.mockFlush(0, 'CORS 0 status');
    });
  });
});
