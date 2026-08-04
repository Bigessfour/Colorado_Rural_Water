import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    delete document.documentElement.dataset['theme'];
    TestBed.configureTestingModule({});
    TestBed.inject(ThemeService).setMode('light');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
    delete document.documentElement.dataset['theme'];
  });

  it('defaults to light when nothing stored', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
  });

  it('setMode persists and applies dark class', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('dark');
    expect(service.mode()).toBe('dark');
    expect(localStorage.getItem('ws-ui-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('toggle switches between light and dark', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();
    expect(service.mode()).toBe('dark');
    service.toggle();
    expect(service.mode()).toBe('light');
  });
});
