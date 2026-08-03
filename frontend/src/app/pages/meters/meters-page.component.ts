import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

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
}

interface AddMeterForm extends MeterMetadataForm {
  meterId: string;
  serviceAddress: string;
}

interface MeterHistoryView {
  meterId: string;
  serviceAddress: string;
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
  };
}

function metaPayload(form: MeterMetadataForm): Record<string, string> {
  return {
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

  addVisible = signal(false);
  editVisible = signal(false);
  historyVisible = signal(false);
  historyBusy = signal(false);
  history = signal<MeterHistoryView | null>(null);
  historyError = signal('');

  editingId = signal<string | null>(null);
  editingAddress = signal('');
  addForm = signal<AddMeterForm>(emptyAddForm());
  editForm = signal<MeterMetadataForm>(emptyMetaForm());

  ngOnInit(): void {
    void this.refresh();
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
      this.meters.set((body.meters ?? []) as MeterRow[]);
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
      const res = await fetch(`${environment.apiBaseUrl}/meters`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          meterId: form.meterId.trim(),
          serviceAddress: form.serviceAddress.trim(),
          ...metaPayload(form),
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
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(meterId)}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(metaPayload(this.editForm())),
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
      const res = await fetch(
        `${environment.apiBaseUrl}/meters/${encodeURIComponent(row.meterId)}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const body = await res.json();
      if (!res.ok) {
        this.historyError.set(body.error ?? `Failed (${res.status})`);
        return;
      }
      this.history.set({
        meterId: body.meterId,
        serviceAddress: body.serviceAddress,
        readings: (body.readings ?? []) as MeterHistoryReading[],
      });
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
}
