// exporter.js — la frontière. Un constat ne sort du poste que s'il est signé par
// un humain (statut valide) et qu'aucune donnée personnelle n'est détectée dans
// ce qui part : le constat ET les lignes de registre citées en preuve.
// (ADR 2026-09-16-rgpd-a-la-frontiere : le filtre vit ici, pas à l'entrée.)
//
// Ce que fait « exporter » : écrire un dossier markdown autoportant dans le
// dossier d'exports local. L'envoi au tiers reste un geste humain.
import fs from 'node:fs';
import path from 'node:path';
import { rejouer, detecterDonneePersonnelle } from './constat.js';
import { lire } from './registre.js';

const horlogeReelle = () => new Date().toISOString();

function controlerRgpd(champ, valeur) {
  const motif = detecterDonneePersonnelle(String(valeur));
  if (motif) throw new Error(`export refusé : ${champ} contient une donnée personnelle (${motif}). Reformuler avant de sortir du poste.`);
}

export function exporter(journal, id, { registres, dossier }, horloge = horlogeReelle) {
  const constat = rejouer(journal.lire()).get(id);
  if (!constat) throw new Error(`constat inconnu : ${id}`);
  if (constat.statut !== 'valide') throw new Error(`${id} n'est pas validé (statut ${constat.statut}) : un humain doit signer avant tout export.`);

  // Frontière : tout ce qui part est contrôlé, y compris les preuves.
  controlerRgpd('objet', constat.objet);
  controlerRgpd('responsable', constat.responsable);
  const lignes = [];
  for (const ref of constat.preuve) {
    const idLigne = ref.slice('registre:'.length);
    const ligne = lire(registres, idLigne);
    if (!ligne) throw new Error(`export refusé : ${ref} introuvable dans les registres.`);
    for (const [k, v] of Object.entries(ligne)) controlerRgpd(`preuve ${ref} / ${k}`, v);
    lignes.push(ligne);
  }

  const horodatage = horloge();
  const md = [
    `# Constat ${constat.id}`,
    '',
    `- **Objet** : ${constat.objet}`,
    `- **Responsable** : ${constat.responsable}`,
    `- **Échéance** : ${constat.echeance}`,
    `- **Créé le** : ${constat.creeLe}`,
    `- **Validé le** : ${constat.valideLe}`,
    `- **Exporté le** : ${horodatage}`,
    '',
    '## Preuves (lignes de registre)',
    '',
    ...lignes.flatMap((l) => {
      const { registre, id: idLigne, ...reste } = l;
      return [`### ${registre} · ${idLigne}`, '', ...Object.entries(reste).map(([k, v]) => `- ${k} : ${v}`), ''];
    }),
  ].join('\n');

  fs.mkdirSync(dossier, { recursive: true });
  const chemin = path.join(dossier, `${constat.id}-${horodatage.slice(0, 10)}.md`);
  fs.writeFileSync(chemin, md + '\n');
  journal.ajouter({ type: 'exporte', id, chemin, horodatage });
  return { id, chemin, exporteLe: horodatage };
}
