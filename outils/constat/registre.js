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

// Itération 3 : insensible aux accents et à la casse. Un modèle écrit
// « stupéfiants », le fichier s'appelle stupefiants.csv : les deux doivent
// se trouver (deux recherches perdues par gpt-oss-120b le 16/09).
export function normaliser(texte) {
  return String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function chercher(dossier, texte, registre) {
  const aiguille = normaliser(texte);
  const filtreRegistre = registre ? normaliser(registre) : null;
  return chargerRegistres(dossier).filter((l) =>
    (!filtreRegistre || normaliser(l.registre) === filtreRegistre) &&
    Object.values(l).some((v) => normaliser(v).includes(aiguille)),
  );
}

export function lire(dossier, id) {
  return chargerRegistres(dossier).find((l) => l.id === id) ?? null;
}

export function existe(dossier, id) {
  return lire(dossier, id) !== null;
}
