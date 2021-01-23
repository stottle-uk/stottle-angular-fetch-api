import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { tap } from 'rxjs/operators';

interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'stottle-angular-fetch-api';
  httpResponse$ = this.httpClient
    .get<Todo[]>('https://jsonplaceholder.typicode.com/todos')
    .pipe(tap(console.log));

  constructor(private httpClient: HttpClient) {}
}
