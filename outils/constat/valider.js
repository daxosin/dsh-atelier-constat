// valider.js — commande humaine : node valider.js <id>
// Volontairement hors du serveur MCP : aucun agent ne peut l'appeler.
// Itération 3 : la ligne de registre citée en preuve est affichée AVANT de
// signer. L'humain valide avec la preuve sous les yeux, pas seulement son id.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Journal, valider, lister, rejouer } from './constat.js';
import { lire } from './registre.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const journal = new Journal(process.env.CONSTAT_JOURNAL ?? path.join(ICI, 'journal.jsonl'));
const REGISTRES = process.env.REGISTRES_DIR ?? path.resolve(ICI, '..', '..', 'registres');
const id = process.argv[2];

if (!id) {
  console.log('Usage : node valider.js <constat-n>\n\nConstats :');
  for (const c of lister(journal)) console.log(`  ${c.id}  ${c.statut.padEnd(8)}  ${c.objet}`);
  process.exit(1);
}

const constat = rejouer(journal.lire()).get(id);
if (!constat) {
  console.error(`constat inconnu : ${id}`);
  process.exit(2);
}

console.log(`${constat.id} — ${constat.objet}`);
console.log(`responsable : ${constat.responsable} · échéance : ${constat.echeance}`);
console.log('preuves :');
for (const ref of constat.preuve) {
  const ligne = lire(REGISTRES, ref.slice('registre:'.length));
  if (!ligne) {
    console.log(`  ${ref}  → INTROUVABLE dans les registres`);
    continue;
  }
  const { registre, id: idLigne, ...reste } = ligne;
  console.log(`  ${ref}  [${registre}]`);
  for (const [k, v] of Object.entries(reste)) console.log(`      ${k.padEnd(20)} ${v}`);
}

try {
  const c = valider(journal, id);
  console.log(`\n${c.id} validé le ${c.valideLe}`);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
