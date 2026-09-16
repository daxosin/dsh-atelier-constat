// constat.js — domaine du constat qualité. Aucune dépendance MCP ici.
//
// Itération 2 (16 septembre 2026, soir) :
// - la preuve est une référence de registre `registre:<id>`, vérifiée avant écriture ;
//   le modèle ne peut plus inventer une source, il doit la trouver.
// - plus de filtre RGPD à l'entrée : modèle et données au même endroit (ADR
//   « RGPD à la frontière »). La détection reste ici pour un futur outil `exporter`.
import fs from 'node:fs';
import { z } from 'zod';

// ── détection de donnée personnelle : réservée à la frontière (export) ───────
const MOTIFS_RGPD = [
  { nom: 'civilite-nom', re: /\b(?:M\.|Mme|Mlle|Mr|Dr)\s+\p{Lu}[\p{L}'-]+/u },
  { nom: 'telephone', re: /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/ },
  { nom: 'date-naissance', re: /\b(?:né|née|naissance)\b.{0,20}?\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}/iu },
];

export function detecterDonneePersonnelle(texte) {
  for (const m of MOTIFS_RGPD) if (m.re.test(texte)) return m.nom;
  return null;
}

// ── schéma ──────────────────────────────────────────────────────────────────
export const REFERENCE_REGISTRE = /^registre:[A-Z]+-\d{4}-\d{2}-\d{2}-\d{3}$/;

// Forme brute (raw shape) : c'est ce que registerTool du SDK attend.
export const SCHEMA_CONSTAT = {
  objet: z.string().trim().min(1, 'objet : vide').describe('Ce qui est constaté.'),
  preuve: z.array(
      z.string().trim().regex(REFERENCE_REGISTRE, 'preuve : forme attendue registre:<id> (ex. registre:STUP-2026-09-15-012), obtenue par registre_chercher'),
    ).min(1, 'preuve : au moins une référence de registre est obligatoire')
    .describe('Références de registre, forme registre:<id>. Au moins une. Chaque id doit exister (utiliser registre_chercher).'),
  responsable: z.string().trim().min(1, 'responsable : vide').describe('Personne ou rôle responsable de l\'action.'),
  echeance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'echeance : date ISO AAAA-MM-JJ attendue')
    .describe('Échéance de traitement, AAAA-MM-JJ.'),
};

export const schemaConstat = z.object(SCHEMA_CONSTAT);

// ── Journal append-only et état rejoué ──────────────────────────────────────
// Le journal est la seule vérité. L'état courant n'est jamais stocké : il se
// reconstruit à chaque lecture, ligne par ligne. C'est ce qui rend un dossier
// rejouable, donc opposable.

export class Journal {
  constructor(chemin) {
    this.chemin = chemin;
  }
  lire() {
    if (!fs.existsSync(this.chemin)) return [];
    return fs.readFileSync(this.chemin, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }
  ajouter(evenement) {
    fs.appendFileSync(this.chemin, JSON.stringify(evenement) + '\n');
  }
}

export function rejouer(evenements) {
  const constats = new Map();
  for (const e of evenements) {
    if (e.type === 'cree') {
      constats.set(e.id, { id: e.id, statut: 'propose', ...e.constat, creeLe: e.horodatage });
    } else if (e.type === 'valide') {
      const c = constats.get(e.id);
      if (c) { c.statut = 'valide'; c.valideLe = e.horodatage; }
    } else if (e.type === 'exporte') {
      const c = constats.get(e.id);
      if (c) { c.exporteLe = e.horodatage; c.exportChemin = e.chemin; }
    }
  }
  return constats;
}

const horlogeReelle = () => new Date().toISOString();
const existeToujours = () => true;

// `existeReference(id)` est injecté par le serveur (connecteur registre) : le
// domaine ne sait pas où vivent les registres, il sait seulement qu'une preuve
// doit pointer quelque chose qui existe.
export function creer(journal, entree, horloge = horlogeReelle, existeReference = existeToujours) {
  const constat = schemaConstat.parse(entree); // lève ZodError, rien n'est écrit
  for (const ref of constat.preuve) {
    const id = ref.slice('registre:'.length);
    if (!existeReference(id)) throw new Error(`preuve : ${ref} introuvable dans les registres. Utiliser registre_chercher pour obtenir un id réel.`);
  }
  const id = `constat-${rejouer(journal.lire()).size + 1}`;
  const horodatage = horloge();
  journal.ajouter({ type: 'cree', id, constat, horodatage });
  return { id, statut: 'propose', ...constat, creeLe: horodatage };
}

export function lister(journal) {
  return [...rejouer(journal.lire()).values()];
}

// La validation n'est PAS un outil MCP. Elle n'existe que pour un humain,
// via valider.js. Le juge trie, l'humain signe.
export function valider(journal, id, horloge = horlogeReelle) {
  const constats = rejouer(journal.lire());
  const c = constats.get(id);
  if (!c) throw new Error(`constat inconnu : ${id}`);
  if (c.statut === 'valide') throw new Error(`${id} est déjà validé`);
  const horodatage = horloge();
  journal.ajouter({ type: 'valide', id, horodatage });
  return { ...c, statut: 'valide', valideLe: horodatage };
}

export function formaterErreur(err) {
  if (err instanceof z.ZodError) {
    return 'Constat refusé par le schéma :\n' +
      err.issues.map((i) => `- ${i.path.join('.') || '(racine)'} : ${i.message}`).join('\n');
  }
  return `Constat refusé : ${err.message}`;
}
