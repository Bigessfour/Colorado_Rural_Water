import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { ReportsPageComponent } from './reports-page.component';

describe('ReportsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
          },
        },
      ],
    }).compileComponents();
  });

  it('renders work order and summary actions', () => {
    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toMatch(/Reports|work order|summary/i);
  });
});
