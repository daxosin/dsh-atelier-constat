// valider.js — commande humaine : node valider.js <id>
// Volontairement hors du serveur MCP : aucun agent ne peut l'appeler.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Journal, valider, lister } from './constat.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const journal = new Journal(process.env.CONSTAT_JOURNAL ?? path.join(ICI, 'journal.jsonl'));
const id = process.argv[2];

if (!id) {
  console.log('Usage : node valider.js <constat-n>\n\nConstats :');
  for (const c of lister(journal)) console.log(`  ${c.id}  ${c.statut.padEnd(8)}  ${c.objet}`);
  process.exit(1);
}

try {
  const c = valider(journal, id);
  console.log(`${c.id} validé le ${c.valideLe} — ${c.objet}`);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
