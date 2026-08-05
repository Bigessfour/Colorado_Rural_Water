import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import L from 'leaflet';

/** Tenant meter row fields needed to plot markers. */
export interface MeterMapPoint {
  meterId: string;
  serviceAddress: string;
  latitude: number | null;
  longitude: number | null;
  readingCount?: number;
}

export interface MapLocationPick {
  meterId: string;
  latitude: number;
  longitude: number;
}

/** Colorado centroid — empty / no-coords map (Feature 011). */
export const COLORADO_MAP_CENTER = { lat: 39.0, lng: -105.5, zoom: 7 } as const;

function hasCoords(m: MeterMapPoint): m is MeterMapPoint & { latitude: number; longitude: number } {
  return (
    typeof m.latitude === 'number' &&
    typeof m.longitude === 'number' &&
    Number.isFinite(m.latitude) &&
    Number.isFinite(m.longitude)
  );
}

/**
 * Leaflet + OSM basemap for tenant meters (Feature 011).
 * Optional fine-tune: drag selected pin or click map to place/move.
 */
@Component({
  selector: 'app-meter-map',
  templateUrl: './meter-map.component.html',
  styleUrl: './meter-map.component.scss',
})
export class MeterMapComponent {
  readonly meters = input<MeterMapPoint[]>([]);
  readonly selectedMeterId = input<string | null>(null);
  /** When true, selected marker is draggable and map clicks place/move it. */
  readonly fineTune = input(false);
  /** Tenant default center (from GET /me) when no pins / empty map. */
  readonly defaultCenter = input<{ lat: number; lng: number; zoom: number } | null>(null);
  readonly markerSelect = output<string>();
  readonly locationPicked = output<MapLocationPick>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  private readonly destroyRef = inject(DestroyRef);

  private map: L.Map | null = null;
  private markers = new Map<string, L.Marker>();
  private layer: L.LayerGroup | null = null;
  private ready = false;
  private skipNextFit = false;

  constructor() {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'leaflet/marker-icon-2x.png',
      iconUrl: 'leaflet/marker-icon.png',
      shadowUrl: 'leaflet/marker-shadow.png',
    });

    afterNextRender(() => {
      this.initMap();
      this.ready = true;
      this.syncMarkers();
      this.syncSelection();
    });

    effect(() => {
      this.meters();
      this.fineTune();
      this.selectedMeterId();
      if (this.ready) this.syncMarkers();
    });

    effect(() => {
      this.selectedMeterId();
      if (this.ready) this.syncSelection();
    });

    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = null;
      this.markers.clear();
      this.layer = null;
    });
  }

  private initMap(): void {
    const el = this.host().nativeElement;
    const fallback = this.defaultCenter() ?? COLORADO_MAP_CENTER;
    this.map = L.map(el, {
      center: [fallback.lat, fallback.lng],
      zoom: fallback.zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.layer = L.layerGroup().addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.fineTune()) return;
      const meterId = this.selectedMeterId();
      if (!meterId) return;
      this.skipNextFit = true;
      this.locationPicked.emit({
        meterId,
        latitude: roundCoord(e.latlng.lat),
        longitude: roundCoord(e.latlng.lng),
      });
    });

    queueMicrotask(() => this.map?.invalidateSize());
  }

  private syncMarkers(): void {
    if (!this.map || !this.layer) return;
    this.layer.clearLayers();
    this.markers.clear();

    const selected = this.selectedMeterId();
    const fine = this.fineTune();
    const plotted = this.meters().filter(hasCoords);

    for (const m of plotted) {
      const isSelected = fine && selected === m.meterId;
      const marker = L.marker([m.latitude, m.longitude], {
        draggable: isSelected,
        autoPan: true,
        title: isSelected ? `${m.meterId} (drag to fine-tune)` : m.meterId,
      });
      marker.bindPopup(
        `<strong>${escapeHtml(m.meterId)}</strong><br/>` +
          `${escapeHtml(m.serviceAddress)}<br/>` +
          `Readings: ${m.readingCount ?? 0}` +
          (isSelected ? '<br/><em>Drag pin or click map to fine-tune</em>' : ''),
      );
      marker.on('click', () => this.markerSelect.emit(m.meterId));
      if (isSelected) {
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          this.skipNextFit = true;
          this.locationPicked.emit({
            meterId: m.meterId,
            latitude: roundCoord(ll.lat),
            longitude: roundCoord(ll.lng),
          });
        });
      }
      marker.addTo(this.layer!);
      this.markers.set(m.meterId, marker);
    }

    // Place a temporary pin when fine-tuning a meter that has no coords yet.
    if (fine && selected && !this.markers.has(selected)) {
      const row = this.meters().find((m) => m.meterId === selected);
      if (row) {
        const center = this.map.getCenter();
        const marker = L.marker(center, {
          draggable: true,
          autoPan: true,
          title: `${selected} (place on map)`,
        });
        marker.bindPopup(
          `<strong>${escapeHtml(selected)}</strong><br/>` +
            `${escapeHtml(row.serviceAddress)}<br/>` +
            `<em>Drag or click map to set location</em>`,
        );
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          this.skipNextFit = true;
          this.locationPicked.emit({
            meterId: selected,
            latitude: roundCoord(ll.lat),
            longitude: roundCoord(ll.lng),
          });
        });
        marker.addTo(this.layer);
        this.markers.set(selected, marker);
        marker.openPopup();
      }
    }

    if (!this.skipNextFit) {
      const fallback = this.defaultCenter() ?? COLORADO_MAP_CENTER;
      if (plotted.length === 0 && !(fine && selected)) {
        this.map.setView([fallback.lat, fallback.lng], fallback.zoom);
      } else if (plotted.length > 0) {
        const bounds = L.latLngBounds(
          plotted.map((m) => [m.latitude, m.longitude] as [number, number]),
        );
        this.map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });
      }
    }
    this.skipNextFit = false;
    this.map.invalidateSize();
  }

  private syncSelection(): void {
    const id = this.selectedMeterId();
    if (!id || !this.map) return;
    const marker = this.markers.get(id);
    if (!marker) return;
    this.map.panTo(marker.getLatLng());
    marker.openPopup();
  }
}

function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
