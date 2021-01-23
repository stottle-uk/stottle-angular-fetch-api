import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const todo = {
    userId: 1,
    id: 1,
    title: 'delectus aut autem',
    completed: false,
  };
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const httpTestingController = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    app.httpResponse$.subscribe((d) => {
      expect(d).toEqual([todo]);
    });

    const req = httpTestingController.expectOne(
      'https://jsonplaceholder.typicode.com/todos'
    );
    expect(req.request.method).toEqual('GET');
    expect(req.request.body).toBeNull();
    req.flush([todo]);
  });
});
