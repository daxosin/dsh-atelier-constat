// serveur.js — exposition MCP (stdio) du domaine constat. Deux outils, pas de
// validation exposée. stdout est le canal MCP : ne jamais y écrire.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Journal, SCHEMA_CONSTAT, creer, lister, formaterErreur } from './constat.js';
import { existe } from './registre.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const journal = new Journal(process.env.CONSTAT_JOURNAL ?? path.join(ICI, 'journal.jsonl'));
const REGISTRES = process.env.REGISTRES_DIR ?? path.resolve(ICI, '..', '..', 'registres');
const existeReference = (id) => existe(REGISTRES, id);

const server = new McpServer({ name: 'constat', version: '0.2.0' });

server.registerTool(
  'constat_creer',
  {
    description:
      'Propose un constat qualité. Il reste en statut "propose" jusqu\'à validation par un humain, hors de cette session. ' +
      'La preuve est une référence de registre (registre:<id>) qui doit exister : obtenir l\'id avec registre_chercher avant d\'appeler cet outil. ' +
      'Une référence inconnue est refusée.',
    inputSchema: SCHEMA_CONSTAT,
  },
  async (entree) => {
    try {
      const c = creer(journal, entree, undefined, existeReference);
      return { content: [{ type: 'text', text: JSON.stringify(c, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: formaterErreur(e) }], isError: true };
    }
  },
);

server.registerTool(
  'constat_lister',
  { description: 'Liste les constats et leur statut (propose | valide).', inputSchema: {} },
  async () => ({ content: [{ type: 'text', text: JSON.stringify(lister(journal), null, 2) }] }),
);

await server.connect(new StdioServerTransport());
console.error(`[constat] serveur MCP prêt, journal : ${journal.chemin}, registres : ${REGISTRES}`);
