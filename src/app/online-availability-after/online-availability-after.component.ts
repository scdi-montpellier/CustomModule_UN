import { Component, DoCheck, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IstexService } from '../services/istex.service';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription, interval } from 'rxjs';
import { Doc } from '../models/search.model';

type Pnx = Doc['pnx'];

@Component({
  selector: 'app-online-availability-after',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './online-availability-after.component.html',
  styleUrl: './online-availability-after.component.scss'
})
export class OnlineAvailabilityAfterComponent implements DoCheck, OnDestroy {
  @Input() hostComponent: any;

  private istexService = inject(IstexService);
  private dataCheckSubscription: Subscription | undefined;

  istexAvail: SafeHtml | null = null;
  private currentPnx: Pnx | null = null;
  private currentKey = '';
  private attempts = 0;
  private maxAttempts = 2;
  private checkInterval = 1000;

  /**
   * Appelé à chaque cycle de détection : détecte le changement de notice
   * (boutons previous/next) même si le composant n'est pas recréé.
   */
  ngDoCheck(): void {
    const pnx = this.istexService.extractPnxFromHostComponent(this.hostComponent);
    const key = this.buildRecordKey(pnx);

    if (key === this.currentKey) {
      return;
    }

    // Nouvelle notice : on repart de zéro
    this.currentKey = key;
    this.stopChecks();
    this.istexAvail = null;
    this.attempts = 0;
    this.currentPnx = pnx;

    if (pnx) {
      this.startChecks();
    }
  }

  ngOnDestroy(): void {
    this.stopChecks();
  }

  private buildRecordKey(pnx: Pnx | null): string {
    if (!pnx) {
      return '';
    }
    const recordId = (pnx.control?.['recordid'] as string[] | undefined)?.[0] ?? '';
    const title = (pnx.display?.['title'] as string[] | undefined)?.[0] ?? '';
    return recordId + '|' + title;
  }

  private startChecks(): void {
    this.checkIstexAvailability();

    this.dataCheckSubscription = interval(this.checkInterval).subscribe(() => {
      if (this.attempts < this.maxAttempts) {
        this.checkIstexAvailability();
      } else {
        this.stopChecks();
      }
    });
  }

  private stopChecks(): void {
    this.dataCheckSubscription?.unsubscribe();
    this.dataCheckSubscription = undefined;
  }

  private async checkIstexAvailability(): Promise<void> {
    const pnx = this.currentPnx;
    if (!pnx) {
      return;
    }

    this.attempts++;

    try {
      const result = await this.istexService.checkIstexAvailability(pnx);

      // La notice a changé pendant l'appel : on ignore cette réponse périmée
      if (pnx !== this.currentPnx) {
        return;
      }

      if (result) {
        this.istexAvail = result;
        this.stopChecks();
      }
    } catch (err) {
      // Silently fail, no error message needed
    } finally {
      if (pnx === this.currentPnx && this.attempts >= this.maxAttempts) {
        this.stopChecks();
      }
    }
  }
}