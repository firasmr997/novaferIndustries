import { signal } from '@angular/core';

/** Paging, sorting and search state shared by every list screen. */
export class ListState {
  readonly q = signal('');
  readonly page = signal(0);
  readonly size = 25;
  readonly sort = signal<string>('');
  readonly dir = signal<'asc' | 'desc'>('desc');
  private timer?: ReturnType<typeof setTimeout>;
  readonly query = signal('');

  constructor(sort: string, dir: 'asc' | 'desc' = 'desc') {
    this.sort.set(sort);
    this.dir.set(dir);
  }

  /** Debounced search: the visible text updates at once, the request after 250 ms. */
  search(value: string): void {
    this.q.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.query.set(value.trim());
      this.page.set(0);
    }, 250);
  }

  toggleSort(column: string): void {
    if (this.sort() === column) {
      this.dir.set(this.dir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(column);
      this.dir.set(column === 'number' || column === 'companyName' || column === 'reference' ? 'asc' : 'desc');
    }
    this.page.set(0);
  }

  ariaSort(column: string): 'ascending' | 'descending' | 'none' {
    return this.sort() === column ? (this.dir() === 'asc' ? 'ascending' : 'descending') : 'none';
  }

  arrow(column: string): string {
    return this.sort() === column ? (this.dir() === 'asc' ? '↑' : '↓') : '';
  }

  params(): { q: string; page: number; size: number; sort: string; dir: string } {
    return { q: this.query(), page: this.page(), size: this.size, sort: this.sort(), dir: this.dir() };
  }
}
