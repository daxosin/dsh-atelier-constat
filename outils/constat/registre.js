// registre.js — connecteur registre : lecture seule de CSV locaux (séparateur ;).
// Un fichier = un registre ; son nom (sans extension) devient la colonne `registre`.
// Données locales, noms compris : rien n'est filtré ici (ADR RGPD à la frontière).
import fs from 'node:fs';
import path from 'node:path';

function lireCsv(chemin) {
  const lignes = fs.readFileSync(chemin, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lignes.length < 2) return [];
  const entetes = lignes[0].split(';').map((h) => h.trim());
  return lignes.slice(1).map((l) => {
    const valeurs = l.split(';');
    const ligne = {};
    entetes.forEach((h, i) => { ligne[h] = (valeurs[i] ?? '').trim(); });
    return ligne;
  });
}

export function chargerRegistres(dossier) {
  if (!fs.existsSync(dossier)) return [];
  const resultat = [];
  for (const f of fs.readdirSync(dossier).filter((f) => f.toLowerCase().endsWith('.csv')).sort()) {
    const registre = path.basename(f, path.extname(f));
    for (const ligne of lireCsv(path.join(dossier, f))) resultat.push({ registre, ...ligne });
  }
  return resultat;
}

export function chercher(dossier, texte, registre) {
  const aiguille = texte.trim().toLowerCase();
  return chargerRegistres(dossier).filter((l) =>
    (!registre || l.registre === registre) &&
    Object.values(l).some((v) => String(v).toLowerCase().includes(aiguille)),
  );
}

export function lire(dossier, id) {
  return chargerRegistres(dossier).find((l) => l.id === id) ?? null;
}

export function existe(dossier, id) {
  return lire(dossier, id) !== null;
}
