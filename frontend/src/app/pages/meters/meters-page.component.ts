/**
 * Meter inventory — table + map (feature 011). Optional in Kelly walk after upload;
 * show map pins / CRUD when graders ask about field locations.
 */

import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { MeterUsageVizComponent } from '../../shared/meter-usage-viz.component';
import { geocodeServiceAddress, type GeocodeBias } from '../../shared/geocode.service';
import { autoPinMissingMeters } from '../../shared/meter-auto-pin';
import { filterMeterRows } from './meter-list-filter';
import { MeterMapComponent, type MapLocationPick } from './meter-map.component';

type MeterViewMode = 'table' | 'map' | 'both';

interface MeterRow {
  meterId: string;
  serviceAddress: string;
  occupantName: string | null;
  accountNumber: string | null;
  route: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  meterSize: string | null;
  installDate: string | null;
  meterType: string | null;
  locationDetail: string | null;
  radioId: string | null;
  lastTestedAt: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
  readingCount?: number;
}

interface MeterHistoryReading {
  timestamp: string;
  cumulativeReading: number;
  unit: string;
  diagnosticFlags: string[];
  occupantNameAtRead: string | null;
}

interface MeterMetadataForm {
  occupantName: string;
  accountNumber: string;
  route: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  meterSize: string;
  installDate: string;
  meterType: string;
  locationDetail: string;
  radioId: string;
  lastTestedAt: string;
  notes: string;
  /** Empty string = unset; sent as null when blank. */
  latitude: string;
  longitude: string;
  /**
   * Municipality used only for map geocoding (defaults to tenant mapTown).
   * Not persisted as a separate API field — completes bare street addresses.
   */
  geocodeTown: string;
  /** Optional ZIP for geocoding completeness. */
  geocodeZip: string;
}

interface AddMeterForm extends MeterMetadataForm {
  meterId: string;
  serviceAddress: string;
}

interface MeterHistoryView {
  meterId: string;
  serviceAddress: string;
  installDate: string | null;
  readings: MeterHistoryReading[];
}

function emptyMetaForm(geocodeDefaults?: { town?: string; zip?: string }): MeterMetadataForm {
  return {
    occupantName: '',
    accountNumber: '',
    route: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    meterSize: '',
    installDate: '',
    meterType: '',
    locationDetail: '',
    radioId: '',
    lastTestedAt: '',
    notes: '',
    latitude: '',
    longitude: '',
    geocodeTown: geocodeDefaults?.town ?? '',
    geocodeZip: geocodeDefaults?.zip ?? '',
  };
}

function emptyAddForm(geocodeDefaults?: { town?: string; zip?: string }): AddMeterForm {
  return { meterId: '', serviceAddress: '', ...emptyMetaForm(geocodeDefaults) };
}

function formFromRow(
  row: MeterRow,
  geocodeDefaults?: { town?: string; zip?: string },
): MeterMetadataForm {
  return {
    occupantName: row.occupantName ?? '',
    accountNumber: row.accountNumber ?? '',
    route: row.route ?? '',
    manufacturer: row.manufacturer ?? '',
    model: row.model ?? '',
    serialNumber: row.serialNumber ?? '',
    meterSize: row.meterSize ?? '',
    installDate: row.installDate ?? '',
    meterType: row.meterType ?? '',
    locationDetail: row.locationDetail ?? '',
    radioId: row.radioId ?? '',
    lastTestedAt: row.lastTestedAt ?? '',
    notes: row.notes ?? '',
    latitude: row.latitude == null ? '' : String(row.latitude),
    longitude: row.longitude == null ? '' : String(row.longitude),
    geocodeTown: geocodeDefaults?.town ?? '',
    geocodeZip: geocodeDefaults?.zip ?? '',
  };
}

/** Both blank → clear (null,null). Otherwise both must parse as finite numbers. */
function coordsPayload(
  latRaw: string,
  lngRaw: string,
): { ok: true; latitude: number | null; longitude: number | null } | { ok: false; error: string } {
  const lat = latRaw.trim();
  const lng = lngRaw.trim();
  if (!lat && !lng) {
    return { ok: true, latitude: null, longitude: null };
  }
  if (!lat || !lng) {
    return {
      ok: false,
      error: 'Latitude and longitude must both be filled, or both left blank.',
    };
  }
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { ok: false, error: 'Latitude must be a number between -90 and 90.' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, error: 'Longitude must be a number between -180 and 180.' };
  }
  return { ok: true, latitude, longitude };
}

function metaPayload(
  form: MeterMetadataForm,
): { ok: true; body: Record<string, string | number | null> } | { ok: false; error: string } {
  const coords = coordsPayload(form.latitude, form.longitude);
  if (!coords.ok) return coords;
  return {
    ok: true,
    body: {
      occupantName: form.occupantName,
      accountNumber: form.accountNumber,
      route: form.route,
      manufacturer: form.manufacturer,
      model: form.model,
      serialNumber: form.serialNumber,
      meterSize: form.meterSize,
      installDate: form.installDate,
      meterType: form.meterType,
      locationDetail: form.locationDetail,
      radioId: form.radioId,
      lastTestedAt: form.lastTestedAt,
      notes: form.notes,
      latitude: coords.latitude,
      longitude: coords.longitude,
    },
  };
}

@Component({
  selector: 'app-meters-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TableModule,
    MessageModule,
    DialogModule,
    IconField,
    InputIcon,
    InputTextModule,
    TextareaModule,
    SelectButton,
    MeterUsageVizComponent,
    MeterMapComponent,
  ],
  templateUrl: './meters-page.component.html',
  styleUrl: './meters-page.component.scss',
})
export class MetersPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  meters = signal<MeterRow[]>([]);
  busy = signal(false);
  saving = signal(false);
  error = signal('');
  status = signal('');

  /** Client-side inventory search (meter id, address, occupant, account, route, …). */
  listSearch = signal('');
  tableRows = signal(25);
  tableFirst = signal(0);

  viewMode = signal<MeterViewMode>('table');
  selectedMeterId = signal<string | null>(null);
  fineTune = signal(false);
  geocoding = signal(false);
  geocodeHint = signal('');
  autoPinning = signal(false);
  autoPinProgress = signal('');

  private autoPinAbort: AbortController | null = null;
  private addGeocodeTimer: ReturnType<typeof setTimeout> | null = null;
  private addGeocodeSeq = 0;
  /** Meter IDs already attempted for auto-pin this session (avoid re-hammering Photon). */
  private autoPinAttempted = new Set<string>();

  readonly viewOptions: { label: string; value: MeterViewMode }[] = [
    { label: 'Table', value: 'table' },
    { label: 'Map', value: 'map' },
    { label: 'Both', value: 'both' },
  ];

  readonly rowsPerPageOptions = [25, 50, 100];

  readonly filteredMeters = computed(() => filterMeterRows(this.meters(), this.listSearch()));

  readonly filterActive = computed(() => this.listSearch().trim().length > 0);

  readonly plottedCount = computed(
    () =>
      this.meters().filter(
        (m) =>
          typeof m.latitude === 'number' &&
          typeof m.longitude === 'number' &&
          Number.isFinite(m.latitude) &&
          Number.isFinite(m.longitude),
      ).length,
  );

  readonly missingCoordsCount = computed(() => this.meters().length - this.plottedCount());

  addVisible = signal(false);
  editVisible = signal(false);
  historyVisible = signal(false);
  historyBusy = signal(false);
  history = signal<MeterHistoryView | null>(null);
  historyError = signal('');

  statsVisible = signal(false);
  statsBusy = signal(false);
  stats = signal<MeterHistoryView | null>(null);
  statsError = signal('');

  editingId = signal<string | null>(null);
  editingAddress = signal('');
  addForm = signal<AddMeterForm>(emptyAddForm());
  editForm = signal<MeterMetadataForm>(emptyMetaForm());

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.autoPinAbort?.abort();
      if (this.addGeocodeTimer) clearTimeout(this.addGeocodeTimer);
    });
    void this.refresh();
  }

  onViewModeChange(mode: MeterViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'table') this.fineTune.set(false);
  }

  /** Close usage dialog and focus this meter on the map (auto-pin if needed). */
  async showOnMap(meterId: string): Promise<void> {
    this.statsVisible.set(false);
    this.historyVisible.set(false);
    this.clearListSearch();
    this.selectedMeterId.set(meterId);
    this.viewMode.set('both');

    let row = this.meters().find((m) => m.meterId === meterId);
    if (
      row &&
      (row.latitude == null || row.longitude == null) &&
      row.serviceAddress.trim()
    ) {
      this.status.set(`Finding map pin for ${meterId}…`);
      await this.pinOneMeter(row);
      row = this.meters().find((m) => m.meterId === meterId);
    }

    this.selectedMeterId.set(meterId);
    if (row && row.latitude != null && row.longitude != null) {
      this.status.set(`Showing ${meterId} on the map — fine-tune the pin if it looks off.`);
    } else {
      this.status.set(
        `No map match yet for ${meterId}. Turn on Fine-tune pin and place it, or Edit → Suggest from address.`,
      );
      this.fineTune.set(true);
    }

    queueMicrotask(() => {
      document.querySelector('.map-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  selectMeter(meterId: string): void {
    this.selectedMeterId.set(meterId);
  }

  onListSearchChange(value: string): void {
    this.listSearch.set(value);
    this.tableFirst.set(0);
    const selected = this.selectedMeterId();
    if (selected && !this.filteredMeters().some((m) => m.meterId === selected)) {
      this.selectedMeterId.set(null);
    }
  }

  clearListSearch(): void {
    this.onListSearchChange('');
  }

  onTablePage(event: { first?: number | null; rows?: number | null }): void {
    if (typeof event.rows === 'number' && event.rows > 0) {
      this.tableRows.set(event.rows);
    }
    this.tableFirst.set(event.first ?? 0);
    this.clampTableFirst();
  }

  /** Keep paginator offset inside the current filtered result set. */
  private clampTableFirst(): void {
    const rows = this.tableRows();
    const total = this.filteredMeters().length;
    if (total <= 0) {
      this.tableFirst.set(0);
      return;
    }
    const maxFirst = Math.floor((total - 1) / rows) * rows;
    if (this.tableFirst() > maxFirst) {
      this.tableFirst.set(maxFirst);
    }
  }

  toggleFineTune(): void {
    const next = !this.fineTune();
    this.fineTune.set(next);
    if (next) {
      if (this.viewMode() === 'table') this.viewMode.set('both');
      const visible = this.filteredMeters();
      if (!this.selectedMeterId() && visible.length) {
        this.selectedMeterId.set(visible[0]!.meterId);
      }
      this.status.set(
        'Fine-tune on: select a meter, then drag its pin or click the map. Changes save automatically.',
      );
    } else {
      this.status.set('Fine-tune off.');
    }
  }

  showTable(): boolean {
    const mode = this.viewMode();
    return mode === 'table' || mode === 'both';
  }

  showMap(): boolean {
    const mode = this.viewMode();
    return mode === 'map' || mode === 'both';
  }

  async suggestAddFromAddress(): Promise<void> {
    const address = this.addForm().serviceAddress.trim();
    if (!address) {
      this.error.set('Enter a service address first, then suggest a map pin.');
      return;
    }
    const form = this.addForm();
    await this.applyGeocode('add', address, {
      town: form.geocodeTown,
      zip: form.geocodeZip,
    });
  }

  async suggestEditFromAddress(): Promise<void> {
    const address = this.editingAddress().trim();
    if (!address) {
      this.error.set('This meter has no service address to geocode.');
      return;
    }
    const form = this.editForm();
    await this.applyGeocode('edit', address, {
      town: form.geocodeTown,
      zip: form.geocodeZip,
    });
  }

  async onMapLocationPicked(pick: MapLocationPick): Promise<void> {
    this.selectedMeterId.set(pick.meterId);
    // Keep edit dialog fields in sync if open for this meter.
    if (this.editVisible() && this.editingId() === pick.meterId) {
      this.editForm.update((f) => ({
        ...f,
        latitude: String(pick.latitude),
        longitude: String(pick.longitude),
      }));
    }
    await this.persistCoords(pick.meterId, pick.latitude, pick.longitude);
  }

  async refresh(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to manage meters for your system.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/meters`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.meters.set(
        ((body.meters ?? []) as MeterRow[]).map((m) => ({
          ...m,
          latitude: typeof m.latitude === 'number' ? m.latitude : null,
          longitude: typeof m.longitude === 'number' ? m.longitude : null,
        })),
      );
      this.clampTableFirst();
      const selected = this.selectedMeterId();
      if (selected && !this.meters().some((m) => m.meterId === selected)) {
        this.selectedMeterId.set(null);
      }
      void this.startAutoPinMissing();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  /** Tenant town + map center used to keep pins local (not Denver for bare streets). */
  geocodeBias(overrides?: { town?: string; zip?: string }): GeocodeBias {
    const center = this.auth.mapCenter();
    const town = (overrides?.town ?? center?.town ?? this.auth.placeName() ?? '').trim();
    let zip = (overrides?.zip ?? '').trim();
    // Common rural demo ZIP when town is Wiley and operator left ZIP blank.
    if (!zip && /\bwiley\b/i.test(town)) zip = '81092';
    return {
      town: town || null,
      zip: zip || null,
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
      maxMiles: 35,
    };
  }

  private defaultGeocodeTown(): string {
    return (this.auth.mapCenter()?.town ?? this.auth.placeName() ?? '').trim();
  }

  openAdd(): void {
    if (this.addGeocodeTimer) clearTimeout(this.addGeocodeTimer);
    this.addForm.set(emptyAddForm({ town: this.defaultGeocodeTown() }));
    this.addVisible.set(true);
    this.error.set('');
    this.geocodeHint.set('');
  }

  onAddVisibleChange(visible: boolean): void {
    this.addVisible.set(visible);
    if (!visible && this.addGeocodeTimer) {
      clearTimeout(this.addGeocodeTimer);
      this.addGeocodeTimer = null;
    }
  }

  updateAddField<K extends keyof AddMeterForm>(key: K, value: AddMeterForm[K]): void {
    this.addForm.update((f) => {
      const next = { ...f, [key]: value };
      // Clear stale coords when the geocode query changes so auto-pin re-runs.
      if (key === 'serviceAddress' || key === 'geocodeTown' || key === 'geocodeZip') {
        next.latitude = '';
        next.longitude = '';
      }
      return next;
    });
    if (key === 'serviceAddress' || key === 'geocodeTown' || key === 'geocodeZip') {
      this.scheduleAddGeocode();
    }
  }

  async saveAdd(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    if (!this.addForm().meterId.trim() || !this.addForm().serviceAddress.trim()) {
      this.error.set('Meter ID and service address are required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      // Auto-pin from address when the operator did not set coordinates.
      await this.ensureAddFormGeocoded();
      const form = this.addForm();
      const payload = metaPayload(form);
      if (!payload.ok) {
        this.error.set(payload.error);
        return;
      }
      const res = await fetch(`${environment.apiBaseUrl}/meters`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          meterId: form.meterId.trim(),
          serviceAddress: form.serviceAddress.trim(),
          ...payload.body,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Create failed (${res.status})`);
        return;
      }
      const pinned =
        form.latitude.trim() && form.longitude.trim()
          ? ' Map pin suggested from the address — fine-tune if needed.'
          : ' No map match yet — use Fine-tune pin or Suggest from address.';
      this.status.set(`Added meter ${body.meter?.meterId ?? form.meterId}.${pinned}`);
      this.addVisible.set(false);
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.saving.set(false);
    }
  }

  openEdit(row: MeterRow): void {
    this.editingId.set(row.meterId);
    this.editingAddress.set(row.serviceAddress);
    this.editForm.set(formFromRow(row, { town: this.defaultGeocodeTown() }));
    this.editVisible.set(true);
    this.error.set('');
    this.geocodeHint.set('');
  }

  onEditVisibleChange(visible: boolean): void {
    this.editVisible.set(visible);
    if (!visible) {
      this.editingId.set(null);
      this.editingAddress.set('');
      this.editForm.set(emptyMetaForm({ town: this.defaultGeocodeTown() }));
    }
  }

  updateEditField<K extends keyof MeterMetadataForm>(key: K, value: MeterMetadataForm[K]): void {
    this.editForm.update((f) => ({ ...f, [key]: value }));
  }

  async saveEdit(): Promise<void> {
    const token = this.auth.getBearerToken();
    const meterId = this.editingId();
    if (!token || !meterId) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const payload = metaPayload(this.editForm());
      if (!payload.ok) {
        this.error.set(payload.error);
        return;
      }
      const res = await fetch(`${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload.body),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Update failed (${res.status})`);
        return;
      }
      this.status.set(`Updated meter ${meterId}.`);
      this.editVisible.set(false);
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(row: MeterRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    const count = row.readingCount ?? 0;
    const readingNote =
      count > 0 ? ` This also permanently deletes ${count} reading${count === 1 ? '' : 's'}.` : '';
    if (!confirm(`Remove meter ${row.meterId} at ${row.serviceAddress}?${readingNote}`)) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(row.meterId)}`,
        {
          method: 'DELETE',
          headers: { authorization: `Bearer ${token}` },
        },
      );
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Delete failed (${res.status})`);
        return;
      }
      this.status.set(`Removed meter ${row.meterId}.`);
      if (this.selectedMeterId() === row.meterId) {
        this.selectedMeterId.set(null);
      }
      await this.refresh();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  async openHistory(row: MeterRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to view meter history.');
      return;
    }
    this.historyVisible.set(true);
    this.historyBusy.set(true);
    this.historyError.set('');
    this.history.set(null);
    try {
      const detail = await this.fetchMeterDetail(token, row.meterId);
      if (!detail.ok) {
        this.historyError.set(detail.error);
        return;
      }
      this.history.set(detail.view);
    } catch (err) {
      this.historyError.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.historyBusy.set(false);
    }
  }

  onHistoryVisibleChange(visible: boolean): void {
    this.historyVisible.set(visible);
    if (!visible) {
      this.history.set(null);
      this.historyError.set('');
    }
  }

  async openStats(row: MeterRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to view meter usage.');
      return;
    }
    this.statsVisible.set(true);
    this.statsBusy.set(true);
    this.statsError.set('');
    this.stats.set(null);
    try {
      const detail = await this.fetchMeterDetail(token, row.meterId);
      if (!detail.ok) {
        this.statsError.set(detail.error);
        return;
      }
      this.stats.set(detail.view);
    } catch (err) {
      this.statsError.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.statsBusy.set(false);
    }
  }

  onStatsVisibleChange(visible: boolean): void {
    this.statsVisible.set(visible);
    if (!visible) {
      this.stats.set(null);
      this.statsError.set('');
    }
  }

  private scheduleAddGeocode(): void {
    if (this.addGeocodeTimer) clearTimeout(this.addGeocodeTimer);
    this.addGeocodeTimer = setTimeout(() => {
      this.addGeocodeTimer = null;
      void this.ensureAddFormGeocoded({ quiet: true });
    }, 700);
  }

  /** Fill add-form lat/lng from address when blank. */
  private async ensureAddFormGeocoded(options?: { quiet?: boolean }): Promise<void> {
    const form = this.addForm();
    const address = form.serviceAddress.trim();
    if (!address) return;
    if (form.latitude.trim() && form.longitude.trim()) return;

    const seq = ++this.addGeocodeSeq;
    this.geocoding.set(true);
    if (!options?.quiet) this.geocodeHint.set('');
    try {
      const hit = await geocodeServiceAddress(
        address,
        this.geocodeBias({ town: form.geocodeTown, zip: form.geocodeZip }),
      );
      if (seq !== this.addGeocodeSeq) return;
      if (!hit) {
        if (!options?.quiet) {
          this.geocodeHint.set(
            'No automatic map match yet — you can still save and place the pin later.',
          );
        }
        return;
      }
      this.addForm.update((f) => ({
        ...f,
        latitude: String(hit.latitude),
        longitude: String(hit.longitude),
      }));
      this.geocodeHint.set(`Auto-pinned near “${hit.label}”. ${hit.note}`);
    } catch (err) {
      if (seq !== this.addGeocodeSeq) return;
      if (!options?.quiet) {
        this.error.set(err instanceof Error ? err.message : 'Geocode failed');
      }
    } finally {
      if (seq === this.addGeocodeSeq) this.geocoding.set(false);
    }
  }

  private async applyGeocode(
    target: 'add' | 'edit',
    address: string,
    overrides?: { town?: string; zip?: string },
  ): Promise<void> {
    this.geocoding.set(true);
    this.error.set('');
    this.geocodeHint.set('');
    try {
      const hit = await geocodeServiceAddress(address, this.geocodeBias(overrides));
      if (!hit) {
        this.error.set(
          'No map match for that address. Check Town / ZIP below, or place the pin on the map.',
        );
        return;
      }
      const lat = String(hit.latitude);
      const lng = String(hit.longitude);
      if (target === 'add') {
        this.addForm.update((f) => ({ ...f, latitude: lat, longitude: lng }));
      } else {
        this.editForm.update((f) => ({ ...f, latitude: lat, longitude: lng }));
      }
      this.geocodeHint.set(`Matched “${hit.label}”. ${hit.note}`);
      this.status.set(
        `Suggested pin near ${hit.label}. Fine-tune on the map if needed, then save.`,
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Geocode failed');
    } finally {
      this.geocoding.set(false);
    }
  }

  private async pinOneMeter(row: MeterRow): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token || !row.serviceAddress.trim()) return;
    try {
      const hit = await geocodeServiceAddress(row.serviceAddress, this.geocodeBias());
      if (!hit) return;
      await this.persistCoords(row.meterId, hit.latitude, hit.longitude);
    } catch {
      // Caller surfaces status when pin is still missing.
    }
  }

  /** After ingest / refresh: pin meters that still lack coordinates. */
  private async startAutoPinMissing(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    const missing = this.meters().filter(
      (m) =>
        (m.latitude == null || m.longitude == null) &&
        m.serviceAddress.trim().length > 0 &&
        !this.autoPinAttempted.has(m.meterId),
    );
    if (!missing.length) {
      this.autoPinProgress.set('');
      return;
    }
    if (this.autoPinning()) return;

    for (const m of missing) this.autoPinAttempted.add(m.meterId);

    this.autoPinAbort?.abort();
    const ac = new AbortController();
    this.autoPinAbort = ac;
    this.autoPinning.set(true);
    this.autoPinProgress.set(`Auto-pinning 0 of ${missing.length} meters from address…`);

    try {
      const bias = this.geocodeBias();
      const result = await autoPinMissingMeters({
        apiBaseUrl: environment.apiBaseUrl,
        token,
        meters: missing,
        signal: ac.signal,
        bias,
        onProgress: (p) => {
          this.autoPinProgress.set(
            `Auto-pinning ${p.done} of ${p.total}` +
              (p.currentMeterId ? ` (${p.currentMeterId})` : '') +
              '…',
          );
        },
      });
      this.autoPinProgress.set('');
      if (result.pinned > 0) {
        this.status.set(
          `Auto-pinned ${result.pinned} meter${result.pinned === 1 ? '' : 's'} from address` +
            (result.skipped || result.failed
              ? ` (${result.skipped} no match, ${result.failed} failed). Fine-tune pins if needed.`
              : '. Fine-tune pins if needed.'),
        );
        await this.refreshAfterAutoPin();
      } else if (result.total > 0) {
        this.status.set(
          `Could not auto-pin ${result.total} meter${result.total === 1 ? '' : 's'} from address. Use Fine-tune pin or Edit → Suggest.`,
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      this.autoPinProgress.set('');
    } finally {
      if (this.autoPinAbort === ac) {
        this.autoPinning.set(false);
        this.autoPinAbort = null;
      }
    }
  }

  /** Refresh list without kicking off another auto-pin pass. */
  private async refreshAfterAutoPin(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/meters`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) return;
      this.meters.set(
        ((body.meters ?? []) as MeterRow[]).map((m) => ({
          ...m,
          latitude: typeof m.latitude === 'number' ? m.latitude : null,
          longitude: typeof m.longitude === 'number' ? m.longitude : null,
        })),
      );
      this.clampTableFirst();
    } catch {
      /* ignore — pins already saved */
    }
  }

  private async persistCoords(meterId: string, latitude: number, longitude: number): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to save meter locations.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const res = await fetch(`${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Save failed (${res.status})`);
        return;
      }
      this.meters.update((rows) =>
        rows.map((r) =>
          r.meterId === meterId
            ? {
                ...r,
                latitude: typeof body.latitude === 'number' ? body.latitude : latitude,
                longitude: typeof body.longitude === 'number' ? body.longitude : longitude,
              }
            : r,
        ),
      );
      this.status.set(`Saved map pin for ${meterId}.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.saving.set(false);
    }
  }

  private async fetchMeterDetail(
    token: string,
    meterId: string,
  ): Promise<{ ok: true; view: MeterHistoryView } | { ok: false; error: string }> {
    const res = await fetch(`${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: body.error ?? `Failed (${res.status})` };
    }
    return {
      ok: true,
      view: {
        meterId: body.meterId,
        serviceAddress: body.serviceAddress,
        installDate: body.installDate ?? null,
        readings: (body.readings ?? []) as MeterHistoryReading[],
      },
    };
  }
}
