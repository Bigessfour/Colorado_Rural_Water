import { Injectable, signal } from '@angular/core';

export type UiTheme = 'light' | 'dark';

const STORAGE_KEY = 'ws-ui-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<UiTheme>(this.readStored());

  constructor() {
    this.apply(this.mode());
  }

  setMode(mode: UiTheme): void {
    this.mode.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    this.apply(mode);
  }

  toggle(): void {
    this.setMode(this.mode() === 'light' ? 'dark' : 'light');
  }

  private apply(mode: UiTheme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('app-dark', mode === 'dark');
    root.dataset['theme'] = mode;
  }

  private readStored(): UiTheme {
    if (typeof localStorage === 'undefined') return 'light';
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  }
}
