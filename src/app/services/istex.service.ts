import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Doc } from '../models/search.model';

// Définir le type Pnx basé sur la structure de Doc
type Pnx = Doc['pnx'];

@Injectable({
  providedIn: 'root'
})
export class IstexService implements OnDestroy {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private store = inject(Store);
  private destroy$ = new Subject<void>();
  private pnxDataSubject = new BehaviorSubject<Pnx[]>([]);

  constructor() {
    // Souscrire aux changements du store et maintenir les données à jour
    this.store.select((state: any) => state?.Search?.entities)
      .pipe(takeUntil(this.destroy$))
      .subscribe(entities => {
        const pnxDataArray: Pnx[] = [];
        if (entities && typeof entities === 'object') {
          // Parcourir les entités et extraire les pnx
          Object.values(entities).forEach((entity: any) => {
            if (entity && entity.pnx) {
              pnxDataArray.push(entity.pnx);
            }
          });
        }
        this.pnxDataSubject.next(pnxDataArray);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Récupère toutes les données PNX depuis le store NGRX
   * @returns Tableau de toutes les données PNX disponibles
   */
  getAllPnxData(): Pnx[] {
    return this.pnxDataSubject.value;
  }

  /**
   * Extrait le PNX du hostComponent fourni par Primo NDE
   * Le hostComponent est le contexte du document actuel
   * @param hostComponent Composant host contenant les données du document
   * @returns Les données PNX du document actuel ou null si non disponible
   */
  extractPnxFromHostComponent(hostComponent: any): Pnx | null {
    if (!hostComponent) {
      return null;
    }

    try {
      // Le format Primo NDE fournit souvent le searchResult qui contient les données du document
      // mais le PNX complet est dans le store NGRX
      
      // Essayer d'abord les chemins directs
      if (hostComponent.model?.pnx) {
        return hostComponent.model.pnx;
      }
      
      if (hostComponent.pnx) {
        return hostComponent.pnx;
      }
      
      if (hostComponent.data?.pnx) {
        return hostComponent.data.pnx;
      }
      
      if (hostComponent.record?.pnx) {
        return hostComponent.record.pnx;
      }
      
      // Primo NDE standard: le PNX est dans le store et on accède via searchResult
      if (hostComponent.searchResult) {
        const sr = hostComponent.searchResult;
        
        // Chemin 1: PNX peut être dans le searchResult lui-même
        if (sr.pnx) {
          return sr.pnx;
        }
        
        // Chemins 2-3: Extraire les champs disponibles du searchResult
        // Dans Primo, les métadonnées sont souvent dans des champs comme title, creator, etc.
        
        // Récupérer les valeurs, en tenant compte que certaines peuvent être des tableaux
        const getFirstValue = (val: any): string => {
          if (!val) return '';
          if (Array.isArray(val)) return val[0] ? String(val[0]) : '';
          return String(val);
        };
        
        const minimalPnx: Pnx = {
          display: {
            title: sr.title ? [getFirstValue(sr.title)] : [],
            creator: sr.creator ? [getFirstValue(sr.creator)] : (sr.author ? [getFirstValue(sr.author)] : []),
            creationdate: sr.creationdate ? [getFirstValue(sr.creationdate)] : (sr.pubdate ? [getFirstValue(sr.pubdate)] : [])
          },
          addata: {
            doi: sr.doi ? [getFirstValue(sr.doi)] : [],
            issn: sr.issn ? [getFirstValue(sr.issn)] : [],
            isbn: sr.isbn ? [getFirstValue(sr.isbn)] : [],
            date: sr.date ? [getFirstValue(sr.date)] : (sr.pubdate ? [getFirstValue(sr.pubdate)] : [])
          },
          control: {
            recordid: sr.recordid ? [getFirstValue(sr.recordid)] : ['unknown'],
            sourcerecordid: sr.sourcerecordid ? [getFirstValue(sr.sourcerecordid)] : (sr['@id'] ? [getFirstValue(sr['@id'])] : ['unknown'])
          },
          search: {
            issn: sr.issn ? [getFirstValue(sr.issn)] : [],
            isbn: sr.isbn ? [getFirstValue(sr.isbn)] : []
          }
        };
        
        return minimalPnx;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting PNX from hostComponent:', error);
      return null;
    }
  }

  /**
   * Échappe les caractères spéciaux pour l'URL
   * @param str La chaîne à échapper
   * @returns La chaîne échappée
   */
  escapeChars(str: string): string {
    return str.replace(/'/g, "%27")
              .replace(/ /g, "%20")
              .replace(/:/g, "%3A")
              .replace(/"/g, "%22");
  }

  /**
   * Construit l'URL pour l'API ISTEX en fonction des métadonnées disponibles
   * Priorité: DOI > Titre+ISSN > Titre+ISBN > Titre+Auteur > Titre+Date
   * @param doi DOI de la ressource
   * @param title Titre de la ressource
   * @param authorLastName Nom de famille du premier auteur
   * @param issn ISSN de la ressource
   * @param isbn ISBN de la ressource
   * @param date Date de publication
   * @returns URL pour l'API ISTEX ou null si aucun critère valide
   */
  buildIstexUrl(doi: string, title: string, authorLastName: string, issn: string, isbn: string, date: string): string | null {
    // Priorité 1: DOI
    if (doi && doi.trim() !== "") {
      return 'https://api.istex.fr/document/openurl?rft_id=info:doi/%22' + encodeURIComponent(doi) + '%22&noredirect=1&sid=focus';
    }
    
    // Priorité 2: ISSN + Title
    if (issn && issn.trim() !== "" && title && title.trim() !== "") {
      return 'https://api.istex.fr/document/openurl?rft.title=%22' + title + '%22&rft.issn=' + issn + '&noredirect=1&sid=focus';
    }
    
    // Priorité 3: ISBN + Title
    if (isbn && isbn.trim() !== "" && title && title.trim() !== "") {
      return 'https://api.istex.fr/document/openurl?rft.title=%22' + title + '%22&rft.isbn=' + isbn + '&noredirect=1&sid=focus';
    }
    
    // Priorité 4: Author + Title
    if (authorLastName && authorLastName.trim() !== "" && title && title.trim() !== "") {
      return 'https://api.istex.fr/document/openurl?rft.title=%22' + title + '%22&rft.au=' + authorLastName + '&noredirect=1&sid=focus';
    }
    
    // Priorité 5: Date + Title
    if (date && date.trim() !== "" && title && title.trim() !== "") {
      return 'https://api.istex.fr/document/openurl?rft.title=%22' + title + '%22&rft.date=' + date + '&noredirect=1&sid=focus';
    }
    
    return null;
  }

  /**
   * Extrait les métadonnées nécessaires à partir des données PNX
   * @param pnx Les données PNX
   * @returns Un objet contenant les métadonnées extraites
   */
  extractMetadata(pnx: Pnx): {
    doi: string;
    title: string;
    authorLastName: string;
    issn: string;
    isbn: string;
    date: string;
  } {
    // Extraction du DOI - avec validation stricte
    let doi = "";
    
    // Chercher le DOI dans la section addata (source la plus fiable)
    if (pnx.addata?.doi && Array.isArray(pnx.addata.doi) && pnx.addata.doi.length > 0) {
      const doiCandidate = (pnx.addata.doi[0] as string).trim();
      // Vérification de la validité du DOI: doit commencer par "10." et contenir "/"
      if (doiCandidate.startsWith('10.') && doiCandidate.includes('/')) {
        doi = doiCandidate;
      }
    }

    // Extraction du titre
    const title = this.escapeChars(pnx.display?.title?.[0] || "");

    // Extraction du nom de famille du premier auteur
    let authorLastName = "";
    if (pnx.display?.creator && Array.isArray(pnx.display.creator) && pnx.display.creator.length > 0) {
      const creatorString = pnx.display.creator[0];
      // Extraire le nom de famille (avant la virgule si présente)
      const lastNamePart = creatorString.split(",")[0].trim();
      authorLastName = this.escapeChars(lastNamePart);
    }

    // Extraction de l'ISSN
    let issn = "";
    if (pnx.addata?.issn && Array.isArray(pnx.addata.issn) && pnx.addata.issn.length > 0) {
      issn = pnx.addata.issn[0];
    } else if (pnx.search?.issn && Array.isArray(pnx.search.issn) && pnx.search.issn.length > 0) {
      issn = pnx.search.issn[0];
    }

    // Extraction de l'ISBN
    let isbn = "";
    if (pnx.addata?.isbn && Array.isArray(pnx.addata.isbn) && pnx.addata.isbn.length > 0) {
      isbn = pnx.addata.isbn[0];
    }

    // Extraction de la date de publication (plutôt que la date de création du record)
    let date = "";
    if (pnx.addata?.date && Array.isArray(pnx.addata.date) && pnx.addata.date.length > 0) {
      date = pnx.addata.date[0];
    } else if (pnx.display?.creationdate && Array.isArray(pnx.display.creationdate) && pnx.display.creationdate.length > 0) {
      date = pnx.display.creationdate[0];
    }

    return { doi, title, authorLastName, issn, isbn, date };
  }

  /**
   * Vérifie si la ressource est disponible sur ISTEX
   * @param pnx Les données PNX de la ressource
   * @returns Promise<SafeHtml | null> - HTML sécurisé pour le lien ISTEX ou null si non disponible
   */
  async checkIstexAvailability(pnx: Pnx): Promise<SafeHtml | null> {
    try {
      if (!pnx) {
        return null;
      }

      const { doi, title, authorLastName, issn, isbn, date } = this.extractMetadata(pnx);
      
      // Construire l'URL selon les critères disponibles et leur priorité
      const url = this.buildIstexUrl(doi, title, authorLastName, issn, isbn, date);
      
      if (!url) {
        return null;
      }
      
      try {
        const response: any = await this.http.get(url).toPromise();
        
        if (response?.resourceUrl) {
          let urlIstex = response.resourceUrl;
          
          // Extraire la première URL si plusieurs sont retournées
          const urlMatch = urlIstex.match(/^\S[^,]+/i);
          if (urlMatch) {
            urlIstex = urlMatch[0];
          }
          
          const htmlContent = `<a target="_blank" href="${urlIstex}" rel="noopener noreferrer"><img src="custom/33MON_INST-33UN_NDE/assets/images/ISTEX.png" alt="Bouton ISTEX"></a>`;
          return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
        } else {
          return null;
        }
      } catch (httpError) {
        console.error('HTTP Error when calling ISTEX API:', httpError);
        return null;
      }
    } catch (error) {
      console.error('Error checking ISTEX availability:', error);
      return null;
    }
  }
}