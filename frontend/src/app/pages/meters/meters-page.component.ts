import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import { MeterUsageVizComponent } from '../../shared/meter-usage-viz.component';
import { geocodeServiceAddress } from '../../shared/geocode.service';
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

function emptyMetaForm(): MeterMetadataForm {
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
  };
}

function emptyAddForm(): AddMeterForm {
  return { meterId: '', serviceAddress: '', ...emptyMetaForm() };
}

function formFromRow(row: MeterRow): MeterMetadataForm {
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
  };
}

/** Both blank → clear (null,null). Otherwise both must parse as finite numbers. */
function coordsPayload(
  latRaw: string,
  lngRaw: string,
):
  | { ok: true; latitude: number | null; longitude: number | null }
  | { ok: false; error: string } {
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
):
  | { ok: true; body: Record<string, string | number | null> }
  | { ok: false; error: string } {
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

  meters = signal<MeterRow[]>([]);
  busy = signal(false);
  saving = signal(false);
  error = signal('');
  status = signal('');

  viewMode = signal<MeterViewMode>('table');
  selectedMeterId = signal<string | null>(null);
  fineTune = signal(false);
  geocoding = signal(false);
  geocodeHint = signal('');

  readonly viewOptions: { label: string; value: MeterViewMode }[] = [
    { label: 'Table', value: 'table' },
    { label: 'Map', value: 'map' },
    { label: 'Both', value: 'both' },
  ];

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
    void this.refresh();
  }

  onViewModeChange(mode: MeterViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'table') this.fineTune.set(false);
  }

  selectMeter(meterId: string): void {
    this.selectedMeterId.set(meterId);
  }

  toggleFineTune(): void {
    const next = !this.fineTune();
    this.fineTune.set(next);
    if (next) {
      if (this.viewMode() === 'table') this.viewMode.set('both');
      if (!this.selectedMeterId() && this.meters().length) {
        this.selectedMeterId.set(this.meters()[0].meterId);
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
    await this.applyGeocode('add', address);
  }

  async suggestEditFromAddress(): Promise<void> {
    const address = this.editingAddress().trim();
    if (!address) {
      this.error.set('This meter has no service address to geocode.');
      return;
    }
    await this.applyGeocode('edit', address);
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
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  openAdd(): void {
    this.addForm.set(emptyAddForm());
    this.addVisible.set(true);
    this.error.set('');
    this.geocodeHint.set('');
  }

  onAddVisibleChange(visible: boolean): void {
    this.addVisible.set(visible);
  }

  updateAddField<K extends keyof AddMeterForm>(key: K, value: AddMeterForm[K]): void {
    this.addForm.update((f) => ({ ...f, [key]: value }));
  }

  async saveAdd(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    const form = this.addForm();
    if (!form.meterId.trim() || !form.serviceAddress.trim()) {
      this.error.set('Meter ID and service address are required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
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
      this.status.set(`Added meter ${body.meter?.meterId ?? form.meterId}.`);
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
    this.editForm.set(formFromRow(row));
    this.editVisible.set(true);
    this.error.set('');
    this.geocodeHint.set('');
  }

  onEditVisibleChange(visible: boolean): void {
    this.editVisible.set(visible);
    if (!visible) {
      this.editingId.set(null);
      this.editingAddress.set('');
      this.editForm.set(emptyMetaForm());
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
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload.body),
        },
      );
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
      count > 0
        ? ` This also permanently deletes ${count} reading${count === 1 ? '' : 's'}.`
        : '';
    if (
      !confirm(
        `Remove meter ${row.meterId} at ${row.serviceAddress}?${readingNote}`,
      )
    ) {
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

  private async applyGeocode(target: 'add' | 'edit', address: string): Promise<void> {
    this.geocoding.set(true);
    this.error.set('');
    this.geocodeHint.set('');
    try {
      const hit = await geocodeServiceAddress(address);
      if (!hit) {
        this.error.set('No map match for that address. Try a fuller street + town, or place the pin on the map.');
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
      this.status.set(`Suggested pin near ${hit.label}. Fine-tune on the map if needed, then save.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Geocode failed');
    } finally {
      this.geocoding.set(false);
    }
  }

  private async persistCoords(
    meterId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to save meter locations.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ latitude, longitude }),
        },
      );
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
