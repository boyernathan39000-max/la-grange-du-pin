/* LA GRANGE DU PIN — interactions. Tout le contenu reste lisible sans JavaScript :
   ce fichier ajoute le menu mobile, les apparitions, le simulateur, les galeries,
   les filtres et la démo du formulaire. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- en-tête qui se réduit + menu mobile */
  var entete = $(".entete");
  var surDefilement = function () { if (entete) entete.classList.toggle("est-defile", window.scrollY > 20); };
  window.addEventListener("scroll", surDefilement, { passive: true }); surDefilement();

  var burger = $(".burger"), tiroir = $(".tiroir");
  if (burger && tiroir) {
    var basculer = function (ouvrir) {
      tiroir.classList.toggle("est-ouvert", ouvrir);
      burger.setAttribute("aria-expanded", ouvrir ? "true" : "false");
      document.body.style.overflow = ouvrir ? "hidden" : "";
    };
    burger.addEventListener("click", function () { basculer(!tiroir.classList.contains("est-ouvert")); });
    $$("a", tiroir).forEach(function (a) { a.addEventListener("click", function () { basculer(false); }); });
  }

  /* ---------- apparitions au défilement */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("est-visible"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".apparait").forEach(function (el) { io.observe(el); });
  } else { $$(".apparait").forEach(function (el) { el.classList.add("est-visible"); }); }

  /* ---------- compteurs animés */
  var compter = function (el) {
    var cible = parseFloat(el.dataset.cible.replace(",", ".")), dec = (el.dataset.cible.split(",")[1] || "").length;
    var t0 = null, duree = 1100;
    var pas = function (t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / duree), v = cible * (1 - Math.pow(1 - k, 3));
      el.textContent = v.toFixed(dec).replace(".", ",");
      if (k < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  };
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var ioc = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { compter(e.target); ioc.unobserve(e.target); } }); });
    $$("[data-cible]").forEach(function (el) { ioc.observe(el); });
  }

  /* ---------- barre de réservation : ouvre le moteur Camplive (dates à ressaisir, TODO lien profond) */
  $$(".resa").forEach(function (f) {
    f.addEventListener("submit", function (ev) { ev.preventDefault(); window.open(f.action, "_blank", "noopener"); });
  });

  /* ---------- simulateur de prix par personne (grille 2025) */
  var simu = $("#simulateur");
  if (simu) {
    var T = JSON.parse($("#donnees-tarifs").textContent);
    var ui = {
      produit: $("#simu-produit"), pers: $("#simu-pers"), nuits: $("#simu-nuits"),
      pp: $("#simu-pp"), total: $("#simu-total"), alerte: $("#simu-alerte"), partage: $("#simu-partage"), resume: $("#simu-resume")
    };
    var etat = { pers: 4, nuits: 2 };
    var euros = function (n) { return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",").replace(",00", ""); };
    var calcul = function () {
      var id = ui.produit.value, p = T.produits[id];
      var saison = ($("input[name=saison]:checked", simu) || {}).value || "moyenne";
      var s = p[saison], alerte = "";
      etat.pers = Math.max(1, Math.min(p.max, etat.pers));
      var n = etat.nuits, pers = etat.pers, total = null;
      etat.semaineSeule = false;
      if (!s) {
        alerte = p.nom + " n'est proposé qu'en moyenne saison et en juillet-août.";
      } else if (s.forfait2 !== undefined) {           // lodges en haute saison
        if (n < 2) { n = 2; alerte = "En juillet-août, ce lodge se loue à partir de 2 nuits."; }
        total = n >= 7 ? Math.floor(n / 7) * s.semaine + (n % 7) * s.supp : s.forfait2 + (n - 2) * s.supp;
      } else if (s.premiere !== undefined) {           // lodges : 1re nuit + nuits suivantes
        total = n >= 7 ? Math.floor(n / 7) * s.semaine + (n % 7) * s.supp : s.premiere + (n - 1) * s.supp;
      } else if (s.nuit === undefined) {               // mobil-homes en haute saison : à la semaine
        etat.semaineSeule = true;
        if (n % 7) { n = Math.ceil(n / 7) * 7; alerte = "En juillet-août, les mobil-homes se louent à la semaine (du samedi au samedi)."; }
        total = (n / 7) * s.semaine;
      } else if (s.semaine !== undefined) {            // mobil-homes basse / moyenne saison
        total = n >= 7 ? s.semaine + (n - 7) * s.nuit_apres_semaine : Math.min(n * s.nuit, s.semaine);
        if (n >= 5 && n < 7) alerte = "À partir de 5 nuits, la semaine est plus avantageuse.";
      } else {                                         // emplacements
        total = n * (s.nuit + Math.max(0, pers - p.base) * (p.adulte_supp || 0));
      }
      if (total !== null && p.pers_supp && pers > p.base) total += (pers - p.base) * p.pers_supp * n;
      etat.nuits = n;
      ui.pers.value = pers; ui.pers.textContent = pers; ui.nuits.value = n; ui.nuits.textContent = n;
      if (total === null) { ui.pp.innerHTML = "—<small>indisponible sur cette période</small>"; ui.total.textContent = ""; ui.alerte.textContent = alerte; return; }
      total += T.taxe * pers * n;
      var pp = total / pers / n;
      ui.pp.innerHTML = euros(pp) + " €<small>par personne et par nuit</small>";
      ui.total.innerHTML = "Soit <b>" + euros(total) + " €</b> au total pour " + pers + " pers. et " + n + " nuit" + (n > 1 ? "s" : "") + ", taxe de séjour comprise.";
      ui.alerte.textContent = alerte;
      var texte = "On part à La Grange du Pin ? " + p.nom + ", " + n + " nuit" + (n > 1 ? "s" : "") + " à " + pers + " : environ " + euros(pp) + " € par personne et par nuit. Un lac à 1 h de Lyon 👉 " + location.href.split("#")[0];
      ui.partage.href = "https://wa.me/?text=" + encodeURIComponent(texte);
    };
    $$("[data-pas]", simu).forEach(function (b) {
      b.addEventListener("click", function () {
        var cle = b.dataset.champ, pas = +b.dataset.pas * (cle === "nuits" && etat.semaineSeule ? 7 : 1);
        etat[cle] = Math.max(1, Math.min(cle === "nuits" ? 21 : 8, etat[cle] + pas)); calcul();
      });
    });
    ui.produit.addEventListener("change", function () { etat.pers = T.produits[ui.produit.value].max; calcul(); });
    $$("input[name=saison]", simu).forEach(function (r) { r.addEventListener("change", calcul); });
    etat.pers = T.produits[ui.produit.value].max; calcul();
  }

  /* ---------- galeries des fiches + visionneuse */
  var vis = $(".visionneuse");
  var liste = [], idx = 0;
  var montrer = function () {
    if (!vis || !liste.length) return;
    $("img", vis).src = liste[idx].src; $("img", vis).alt = liste[idx].alt;
    $(".visionneuse__cpt", vis).textContent = (idx + 1) + " / " + liste.length;
  };
  var ouvrir = function (photos, i) {
    liste = photos; idx = i || 0; montrer(); vis.classList.add("est-ouverte"); document.body.style.overflow = "hidden"; $(".fermer", vis).focus();
  };
  var fermer = function () { vis.classList.remove("est-ouverte"); document.body.style.overflow = ""; };
  if (vis) {
    $(".fermer", vis).addEventListener("click", fermer);
    $(".prec", vis).addEventListener("click", function () { idx = (idx - 1 + liste.length) % liste.length; montrer(); });
    $(".suiv", vis).addEventListener("click", function () { idx = (idx + 1) % liste.length; montrer(); });
    vis.addEventListener("click", function (e) { if (e.target === vis) fermer(); });
    document.addEventListener("keydown", function (e) {
      if (!vis.classList.contains("est-ouverte")) return;
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowLeft") $(".prec", vis).click();
      if (e.key === "ArrowRight") $(".suiv", vis).click();
    });
  }
  $$(".galerie").forEach(function (g) {
    var photos = JSON.parse(g.dataset.photos), grande = $(".galerie__grande img", g), courant = 0;
    $$(".galerie__vignettes button", g).forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.dataset.i;
        if (b.dataset.tout) { ouvrir(photos, 0); return; }
        courant = i; grande.src = photos[i].src; grande.alt = photos[i].alt;
        $$(".galerie__vignettes button", g).forEach(function (x) { x.removeAttribute("aria-current"); });
        b.setAttribute("aria-current", "true");
      });
    });
    $$(".galerie__grande, [data-ouvrir]", g).forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); ouvrir(photos, courant); });
    });
  });

  /* ---------- filtres des hébergements */
  var filtres = $(".filtres");
  if (filtres) {
    $$("button", filtres).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("button", filtres).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var f = b.dataset.filtre;
        $$(".fiche").forEach(function (fi) {
          var ok = f === "tous" || (" " + fi.dataset.tags + " ").indexOf(" " + f + " ") > -1;
          fi.classList.toggle("est-cachee", !ok);
        });
        $$("[data-univers-bloc]").forEach(function (bl) { bl.hidden = !$$(".fiche:not(.est-cachee)", bl).length; });
        var premier = $(".fiche:not(.est-cachee)");
        if (premier && f !== "tous") { premier.scrollIntoView({ behavior: "smooth", block: "start" }); premier.classList.add("est-surlignee"); setTimeout(function () { premier.classList.remove("est-surlignee"); }, 1300); }
      });
    });
  }

  /* ---------- barre d'ancres : lien actif */
  var ancres = $$(".ancres a");
  if (ancres.length && "IntersectionObserver" in window) {
    var ioa = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) ancres.forEach(function (a) { a.classList.toggle("est-actif", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ancres.forEach(function (a) { var s = document.getElementById(a.getAttribute("href").slice(1)); if (s) ioa.observe(s); });
  }

  /* ---------- formulaire de contact : maquette, rien n'est envoyé */
  var form = $(".formulaire");
  if (form) {
    var motif = $("#motif", form);
    var maj = function () { form.classList.toggle("est-groupe", motif.value === "groupe"); };
    if (location.hash === "#devis-groupe") motif.value = "groupe";
    motif.addEventListener("change", maj); maj();
    form.addEventListener("submit", function (e) { e.preventDefault(); form.classList.add("est-envoye"); $(".formulaire__ok", form).scrollIntoView({ behavior: "smooth", block: "center" }); });
  }
})();
