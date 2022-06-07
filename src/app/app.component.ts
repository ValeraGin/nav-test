import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  name = 'AppComponent';

  items  = Array.from({length: 15}).map((_, i) => i + 1 );

  ngOnInit(): void {

  }

  click($event: MouseEvent) {
    ($event.target as HTMLElement).style.backgroundColor = ($event.target as HTMLElement).style.backgroundColor === 'red' ? 'unset' : 'red'
  }

  deleteItem(item: number) {
    delete this.items[this.items.indexOf(item)];
    this.items = this.items.filter(Boolean)
    console.log(this.items)
  }
}
