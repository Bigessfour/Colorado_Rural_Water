import { Component, HostListener, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProductTourService } from './product-tour.service';

@Component({
  selector: 'app-product-tour-overlay',
  imports: [ButtonModule],
  templateUrl: './product-tour-overlay.component.html',
  styleUrl: './product-tour-overlay.component.scss',
})
export class ProductTourOverlayComponent {
  readonly tour = inject(ProductTourService);

  @HostListener('window:resize')
  onResize(): void {
    this.tour.refreshHighlight();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.tour.refreshHighlight();
  }
}
