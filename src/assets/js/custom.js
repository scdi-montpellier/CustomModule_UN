console.log('Hello from custom.js');
 
/* ============================================================
               BURGER MENU — RESPONSIVITÉ MOBILE
   ============================================================
   Miroir du comportement React de Header.jsx (useState isMenuOpen).
   Classes appliquées sur le DOM natif de Primo NDE :
     • ul#menu          → .menu-open   (affichage du panneau)
     • div#burgerM      → .is-open     (animation des barres)
   Sous-menus niveau 2 et 3 ouverts au clic en mode mobile.
   ============================================================ */
(function () {

  /* ----------------------------------------------------------
     Constante de breakpoint (doit rester synchronisée avec
     responsive.css — @media (max-width: 1024px))
  ---------------------------------------------------------- */
  var MOBILE_BP = 1024;

  /* ----------------------------------------------------------
     Utilitaires
  ---------------------------------------------------------- */
  function isMobile() {
    return window.innerWidth <= MOBILE_BP;
  }

  /* ----------------------------------------------------------
     Burger toggle principal
  ---------------------------------------------------------- */
  function initBurger() {
    var burger = document.getElementById('burgerM');
    var menu   = document.getElementById('menu');

    if (!burger || !menu) return false;

    /* Éviter les doubles bindings si Primo re-render le DOM */
    if (burger.dataset.burgerInit) return true;
    burger.dataset.burgerInit = '1';

    /* Clic sur le burger */
    burger.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('menu-open');
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    /* Fermeture via Escape */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && menu.classList.contains('menu-open')) {
        closeMenu(burger, menu);
      }
    });

    /* Fermeture au clic en dehors de la nav */
    document.addEventListener('click', function (e) {
      var nav = document.querySelector('nav, .nav-top');
      if (nav && !nav.contains(e.target) && menu.classList.contains('menu-open')) {
        closeMenu(burger, menu);
      }
    });

    return true;
  }

  function closeMenu(burger, menu) {
    menu.classList.remove('menu-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  /* ----------------------------------------------------------
     Sous-menus niveau 2 (click uniquement en mobile,
     miroir du comportement hover→click de Header.jsx)
  ---------------------------------------------------------- */
  function initSubMenus() {
    /* Niveau 2 */
    document.querySelectorAll('.menu .list.firstList').forEach(function (item) {
      if (item.dataset.subInit) return;
      item.dataset.subInit = '1';

      var topLink = item.querySelector(':scope > a');
      if (!topLink) return;

      topLink.addEventListener('click', function (e) {
        if (!isMobile()) return;          /* hover géré par CSS en desktop */
        e.preventDefault();
        var wasOpen = item.classList.contains('submenu-open');

        /* Fermer tous les autres items niveau 2 */
        document.querySelectorAll('.menu .list.firstList.submenu-open').forEach(function (other) {
          if (other !== item) other.classList.remove('submenu-open');
        });

        item.classList.toggle('submenu-open', !wasOpen);
      });
    });

    /* Niveau 3 */
    document.querySelectorAll('.subList:has(.subMenu2)').forEach(function (item) {
      if (item.dataset.sub3Init) return;
      item.dataset.sub3Init = '1';

      var link = item.querySelector(':scope > a');
      if (!link) return;

      link.addEventListener('click', function (e) {
        if (!isMobile()) return;
        e.preventDefault();
        item.classList.toggle('submenu2-open');

        /* Affichage direct des subList enfants */
        item.querySelectorAll('.subMenu2 > .subList').forEach(function (sub) {
          sub.style.display = item.classList.contains('submenu2-open') ? 'flex' : '';
        });
      });
    });
  }

  /* ----------------------------------------------------------
     Réinitialiser les sous-menus ouverts lors d'un resize
     (passage mobile → desktop)
  ---------------------------------------------------------- */
  window.addEventListener('resize', function () {
    if (!isMobile()) {
      document.querySelectorAll('.submenu-open').forEach(function (el) {
        el.classList.remove('submenu-open');
      });
      document.querySelectorAll('.submenu2-open').forEach(function (el) {
        el.classList.remove('submenu2-open');
        el.querySelectorAll('.subMenu2 > .subList').forEach(function (sub) {
          sub.style.display = '';
        });
      });
      /* Fermer le panneau burger si redimensionnement hors mobile */
      var menu   = document.getElementById('menu');
      var burger = document.getElementById('burgerM');
      if (menu && burger) closeMenu(burger, menu);
    }
  });

  /* ----------------------------------------------------------
     Attente de disponibilité des éléments (Primo injecte
     le HTML de façon asynchrone — même patron que la modale)
  ---------------------------------------------------------- */
  function waitForBurger() {
    if (initBurger()) {
      initSubMenus();
      return;
    }

    var obs = new MutationObserver(function () {
      if (initBurger()) {
        initSubMenus();
        obs.disconnect();
      }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    /* Filet de sécurité : arrêt après 15 s */
    setTimeout(function () { obs.disconnect(); }, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForBurger);
  } else {
    waitForBurger();
  }

})();


/* ============================================================
                    MODALE DE RECHERCHE
   ============================================================ */
(function () {
  var REMOTE_SEARCH_URL = 'https://bibliotheque.unimes.fr/recherche';
 
  /* ----------------------------------------------------------
     Branchement des listeners une fois les éléments présents
  ---------------------------------------------------------- */
  function initSearchModal() {
    var toggle    = document.querySelector('.searchToggle');
    var overlay   = document.getElementById('searchModalOverlay');
    var closeBtn  = document.getElementById('searchModalClose');
    var input     = document.getElementById('global-search-input');
    var form      = document.getElementById('searchModalForm');
 
    // Si l'un des éléments est absent, on abandonne — waitForModal réessaiera
    if (!toggle || !overlay || !closeBtn || !input || !form) return false;
 
    /* Ouverture */
    toggle.addEventListener('click', function () {
      overlay.style.display = 'flex';
      input.value = '';
      setTimeout(function () { input.focus(); }, 50);
    });
 
    /* Fermeture : bouton × */
    closeBtn.addEventListener('click', closeModal);
 
    /* Fermeture : clic sur l'overlay (hors boîte) */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
 
    /* Fermeture : touche Escape */
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && overlay.style.display !== 'none') {
        closeModal();
      }
    });
 
    /* Soumission : submit du formulaire (bouton + touche Entrée) */
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // empêche le rechargement de la page
      doSearch();
    });
 
    return true; // initialisation réussie
  }
 
function doSearch() {
    var input = document.getElementById('global-search-input');
    var q = input ? input.value.trim() : '';
    if (!q) return;
    window.location.href = REMOTE_SEARCH_URL + '?q=' + encodeURIComponent(q);
  }
 
  function closeModal() {
    var overlay = document.getElementById('searchModalOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ----------------------------------------------------------
          Injection du HTML custom par Primo NDE
  ---------------------------------------------------------- */
  function waitForModal() {
    // Tentative immédiate (si le HTML est déjà là)
    if (initSearchModal()) return;
 
    var observer = new MutationObserver(function () {
      if (initSearchModal()) {
        observer.disconnect();
      }
    });
 
    observer.observe(document.body, { childList: true, subtree: true });
 
    // Filet de sécurité : arrêt de l'observation après 15 s
    setTimeout(function () { observer.disconnect(); }, 15000);
  }
 
  // Lancement dès que le DOM de base est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForModal);
  } else {
    waitForModal();
  }
})();

  /* ----------------------------------------------------------
                          ZoteroBib 
  ---------------------------------------------------------- */

  (function () {

  // URL du PNX de la fiche dont le menu est ouvert
  let currentPnxUrl = null;

  // ① Capturer quel record déclenche le menu export (fonctionne en liste et en fulldisplay)
  document.addEventListener('click', function (e) {
    const exportBtn = e.target.closest(
      'button[aria-haspopup="menu"][aria-label*="export"]'
    );
    if (!exportBtn) return;

    // Chercher le span urlToXmlPnx dans le conteneur le plus proche
    // Cela fonctionne aussi bien en liste (nde-search-result-item-container) qu'en fulldisplay
    let container = exportBtn.closest('nde-search-result-item-container') 
                    || exportBtn.closest('nde-full-display-container')
                    || exportBtn.closest('[data-qa*="result"]');
    
    if (!container) {
      // Fallback : chercher le span directement en priorité urlToXmlPnxSingleRecord (fulldisplay)
      let pnxSpan = document.querySelector('.urlToXmlPnxSingleRecord[data-url]');
      if (!pnxSpan) pnxSpan = document.querySelector('.urlToXmlPnx[data-url]');
      currentPnxUrl = pnxSpan ? pnxSpan.getAttribute('data-url') : null;
      return;
    }

    // Dans le conteneur, chercher en priorité urlToXmlPnxSingleRecord (fulldisplay)
    let pnxSpan = container.querySelector('.urlToXmlPnxSingleRecord');
    if (!pnxSpan) pnxSpan = container.querySelector('.urlToXmlPnx');
    currentPnxUrl = pnxSpan ? pnxSpan.getAttribute('data-url') : null;
  }, true); // capture phase pour précéder Angular

  // ② Observer l'apparition du bouton EasyBib dans le CDK overlay
  // Observe document.documentElement pour capturer les overlays en dehors de nde-app-root
  const menuObserver = new MutationObserver(function () {
    // Sélecteurs multiples pour plus de flexibilité
    const easybibBtn = document.querySelector(
      'button mat-icon[data-mat-icon-name="EasyBib"]'
    )?.closest('button')
    || document.querySelector(
      '[role="menuitem"] mat-icon[data-mat-icon-name="EasyBib"]'
    )?.closest('[role="menuitem"]')
    || document.querySelector(
      'button[aria-label*="EasyBib"]'
    );

    if (easybibBtn && !easybibBtn.dataset.zoteroBibBound) {
      easybibBtn.dataset.zoteroBibBound = '1';

      easybibBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if (currentPnxUrl) {
          handleZoteroBibClick(currentPnxUrl);
        }
      }, true);

      // Renommer l'entrée du menu
      let label = easybibBtn.querySelector('.mat-mdc-menu-item-text span');
      if (!label) label = easybibBtn.querySelector('mat-icon')?.parentElement;
      if (label && !label.textContent.includes('ZoteroBib')) {
        const textNode = Array.from(label.childNodes).find(n => n.nodeType === 3);
        if (textNode) textNode.textContent = 'ZoteroBib';
        else if (!label.querySelector('span')) label.textContent = 'ZoteroBib';
      }
    }
  });

  // Observer document.documentElement au lieu de document.body
  // pour capturer les CDK overlays qui peuvent être placés en dehors de nde-app-root
  menuObserver.observe(document.documentElement, { childList: true, subtree: true });

  // ③ Fetch PNX → construire URL ZoteroBib → ouvrir
  async function handleZoteroBibClick(pnxUrl) {
    try {
      const response = await fetch(pnxUrl);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');

      const q = buildZoterobibQuery(xml);
      if (q) {
        window.open('https://zbib.org/import?q=' + encodeURIComponent(q), '_blank');
      }
    } catch (err) {
      console.error('[ZoteroBib] Erreur fetch PNX', err);
    }
  }

  function getXmlVal(xml, tag) {
    const el = xml.querySelector(tag);
    return el ? el.textContent.trim() : '';
  }

  function buildZoterobibQuery(xml) {
    // Priorité : DOI > ISBN > ISSN+titre > titre+auteur
    const doi  = getXmlVal(xml, 'addata > doi');
    if (doi && doi.startsWith('10.') && doi.includes('/')) return doi;

    const isbn = getXmlVal(xml, 'addata > isbn');
    if (isbn) return isbn.replace(/[^0-9X]/gi, '');

    const title  = getXmlVal(xml, 'display > title');
    const issn   = getXmlVal(xml, 'addata > issn');
    if (issn && title) return title;

    const author = getXmlVal(xml, 'display > creator');
    if (author && title) return title;

    const btitle = getXmlVal(xml, 'addata > btitle');
    return btitle || title || null;
  }
 
})();


/* ============================================================
           LIENS AUTHENTIFIÉS — bibliotheque.unimes.fr
   ============================================================
   Ajoute automatiquement #isConnected=true sur tous les liens
   pointant vers bibliotheque.unimes.fr lorsque l'utilisateur
   est connecté à Primo NDE. Les liens sont laissés inchangés
   pour les utilisateurs anonymes.

   Détection de session (Primo NDE / SAML) — par ordre de priorité :
     1. Cookie auth=SAML          (positionné après auth SAML réussie)
     2. Cookie SAMLIdpSessionIndex (identifiant de session IdP)
     3. DOM nde-user-area          (fallback : composant non vide)
   ============================================================ */
(function () {
  'use strict';

  /* ── Configuration ───────────────────────────────────────── */
  const TARGET_DOMAIN  = 'bibliotheque.unimes.fr';
  const FRAGMENT_PARAM = 'isConnected=true';
  /* ─────────────────────────────────────────────────────────── */

  // ── Stratégie 1 : cookie auth=SAML ────────────────────────
  // Présent uniquement après une authentification SAML réussie.
  function checkSamlCookie() {
    return document.cookie.split(';').some(function (c) {
      return c.trim() === 'auth=SAML';
    });
  }

  // ── Stratégie 2 : cookie SAMLIdpSessionIndex ──────────────
  // Identifiant de session IdP, absent en mode anonyme.
  function checkSamlSessionCookie() {
    return document.cookie.split(';').some(function (c) {
      return c.trim().startsWith('SAMLIdpSessionIndex=');
    });
  }

  // ── Stratégie 3 : composant nde-user-area non vide ────────
  // Le composant peut exister à vide en mode anonyme ;
  // on s'assure qu'il contient du contenu rendu par Angular.
  function checkUserAreaDom() {
    const el = document.querySelector('nde-user-area');
    return !!(el && el.children.length > 0 && el.textContent.trim().length > 0);
  }

  // ── Agrégation ────────────────────────────────────────────
  function isAuthenticated() {
    return checkSamlCookie() || checkSamlSessionCookie() || checkUserAreaDom();
  }

  // ── Traite un lien individuel ──────────────────────────────
  function processLink(anchor) {
    if (!anchor.href) return;

    let url;
    try { url = new URL(anchor.href); }
    catch (_) { return; }

    // Correspondance exacte sur bibliotheque.unimes.fr uniquement
    if (url.hostname !== TARGET_DOMAIN) return;

    // Marqueur pour ne pas retraiter le même lien
    if (anchor.dataset.connectedProcessed === '1') return;
    anchor.dataset.connectedProcessed = '1';

    if (isAuthenticated()) {
      url.hash = FRAGMENT_PARAM;
      anchor.href = url.toString();
    }
    // Sinon : lien laissé inchangé
  }

  // ── Traite tous les liens présents dans un nœud ───────────
  function processLinks(root) {
    root.querySelectorAll('a[href]').forEach(processLink);
  }

  // ── Observe les mutations du DOM (SPA Angular) ────────────
  function startObserver() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('a[href]')) processLink(node);
          processLinks(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ── Ré-évaluation à chaque navigation SPA ─────────────────
  // Primo NDE émet popstate / hashchange lors des changements
  // de route — pas de $rootScope AngularJS disponible en NDE.
  function listenRouteChange() {
    ['popstate', 'hashchange'].forEach(function (evt) {
      window.addEventListener(evt, function () {
        document.querySelectorAll('[data-connected-processed]')
          .forEach(function (el) { delete el.dataset.connectedProcessed; });
        processLinks(document.body);
      });
    });
  }

  // ── Point d'entrée ────────────────────────────────────────
  function init() {
    processLinks(document.body);
    startObserver();
    listenRouteChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 500);
  }
})();