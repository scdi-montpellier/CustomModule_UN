import { Component, OnInit, Input, inject, OnDestroy } from '@angular/core';
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
export class OnlineAvailabilityAfterComponent implements OnInit, OnDestroy {
  @Input() hostComponent: any;
  
  private istexService = inject(IstexService);
  private dataCheckSubscription: Subscription | undefined;
  
  istexAvail: SafeHtml | null = null;
  private currentPnx: Pnx | null = null;
  private attempts: number = 0;
  private maxAttempts: number = 2;
  private checkInterval: number = 1000;

  ngOnInit(): void {
    this.currentPnx = this.istexService.extractPnxFromHostComponent(this.hostComponent);
    
    if (!this.currentPnx) {
      return;
    }
    
    this.checkIstexAvailability();
    
    this.dataCheckSubscription = interval(this.checkInterval).subscribe(() => {
      if (this.attempts < this.maxAttempts) {
        this.checkIstexAvailability();
      } else {
        this.dataCheckSubscription?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.dataCheckSubscription?.unsubscribe();
  }

  private async checkIstexAvailability(): Promise<void> {
    if (!this.currentPnx) {
      return;
    }
    
    this.attempts++;
    
    try {
      const result = await this.istexService.checkIstexAvailability(this.currentPnx);
      
      if (result) {
        this.istexAvail = result;
        this.dataCheckSubscription?.unsubscribe();
      }
    } catch (err) {
      // Silently fail, no error message needed
    } finally {
      if (this.attempts >= this.maxAttempts) {
        this.dataCheckSubscription?.unsubscribe();
      }
    }
  }
}


