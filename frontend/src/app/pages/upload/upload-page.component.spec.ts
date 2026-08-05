import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { UploadPageComponent } from './upload-page.component';

const FIXTURE_CSV = `Meter ID,Read Date,Reading (gal),Account #,Customer,Service Address,Route,Diag
1042,07/15/2026,128450,A-2201,A Rivera,112 N Main St Wiley CO,R3,
`;

describe('UploadPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getBearerToken: () => 'jwt',
            isLoggedIn: () => true,
            placeName: () => 'Town of Wiley',
            firstName: () => 'Demo',
          },
        },
      ],
    }).compileComponents();
  });

  it('preparePreview maps messy CSV headers into the column mapper', () => {
    const fixture = TestBed.createComponent(UploadPageComponent);
    const cmp = fixture.componentInstance;
    cmp.preparePreview(FIXTURE_CSV);
    fixture.detectChanges();

    expect(cmp.headers.length).toBeGreaterThan(0);
    expect(cmp.mapping['meterId']).toBeTruthy();
    expect(cmp.mapping['timestamp']).toBeTruthy();
    expect(cmp.previewRows.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toMatch(/Excel|mapping|column/i);
  });

  it('lists mapped vs unused headers after preview', () => {
    const fixture = TestBed.createComponent(UploadPageComponent);
    const cmp = fixture.componentInstance;
    cmp.preparePreview(FIXTURE_CSV);
    fixture.detectChanges();

    expect(cmp.mappedHeaders).toEqual(
      expect.arrayContaining(['Meter ID', 'Read Date', 'Reading (gal)', 'Service Address']),
    );
    expect(cmp.unusedHeaders.length).toBeGreaterThanOrEqual(0);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/Mapped/i);
    expect(text).toMatch(/Not used this time|Every column is mapped/i);
    expect(text).toMatch(/Extra columns are OK/i);
  });
});
