// constat.js — domaine du constat qualité. Aucune dépendance MCP ici.
import fs from 'node:fs';
import { z } from 'zod';

export const ROLES = ['pharmacien-titulaire', 'pharmacien-adjoint', 'preparateur', 'qualite'];

// Filtre RGPD volontairement étroit : il attrape les formes les plus courantes
// d'une donnée nominative dans un champ libre. Il ne prétend pas être exhaustif ;
// il rend la règle vérifiable par un test, ce qu'une consigne ne fait pas.
const MOTIFS_RGPD = [
  { nom: 'civilite-nom', re: /\b(?:M\.|Mme|Mlle|Mr|Dr)\s+\p{Lu}[\p{L}'-]+/u },
  { nom: 'telephone', re: /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/ },
  { nom: 'date-naissance', re: /\b(?:né|née|naissance)\b.{0,20}?\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}/iu },
];

export function detecterDonneePersonnelle(texte) {
  for (const m of MOTIFS_RGPD) if (m.re.test(texte)) return m.nom;
  return null;
}

const texteLibre = (champ) =>
  z.string().trim().min(1, `${champ} : vide`).superRefine((valeur, ctx) => {
    const motif = detecterDonneePersonnelle(valeur);
    if (motif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${champ} : donnée personnelle détectée (${motif}). Compteurs et rôles seulement.`,
      });
    }
  });

// Forme brute (raw shape) : c'est ce que registerTool du SDK attend.
export const SCHEMA_CONSTAT = {
  objet: texteLibre('objet').describe('Ce qui est constaté, sans aucune donnée nominative.'),
  preuve: z.array(texteLibre('preuve')).min(1, 'preuve : au moins une source vérifiable est obligatoire')
    .describe('Sources vérifiables (document, registre, date de relevé). Au moins une.'),
  responsable: z.enum(ROLES).describe('Rôle responsable de l\'action. Jamais un nom.'),
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
    }
  }
  return constats;
}

const horlogeReelle = () => new Date().toISOString();

export function creer(journal, entree, horloge = horlogeReelle) {
  const constat = schemaConstat.parse(entree); // lève ZodError, rien n'est écrit
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
  return `Erreur : ${err.message}`;
}
