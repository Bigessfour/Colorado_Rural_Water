import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [CardModule, ButtonModule, FileUploadModule, MessageModule],
  templateUrl: './upload-page.component.html',
  styleUrl: './upload-page.component.scss',
})
export class UploadPageComponent {
  readonly sampleHint = 'Try sample-data/messy-readings-july.csv once upload is wired (B2–B4).';
}
