// serveur.js — exposition MCP (stdio) du domaine constat. Deux outils, pas de
// validation exposée. stdout est le canal MCP : ne jamais y écrire.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Journal, SCHEMA_CONSTAT, creer, lister, formaterErreur } from './constat.js';
import { existe } from './registre.js';
import { exporter } from './exporter.js';

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

// La frontière : n'exporte qu'un constat validé par un humain, refuse toute
// donnée personnelle détectée, écrit un markdown local. L'envoi reste humain.
const EXPORTS = process.env.EXPORTS_DIR ?? path.resolve(ICI, '..', '..', 'exports');
server.registerTool(
  'constat_exporter',
  {
    description:
      'Exporte un constat VALIDÉ par un humain vers un dossier markdown local, avec ses lignes de registre. ' +
      'Refusé si le constat n\'est pas validé ou si une donnée personnelle est détectée. L\'envoi à un tiers reste un geste humain.',
    inputSchema: { id: z.string().min(1).describe('Identifiant du constat, ex. constat-1.') },
  },
  async ({ id }) => {
    try {
      const r = exporter(journal, id, { registres: REGISTRES, dossier: EXPORTS });
      return { content: [{ type: 'text', text: `Exporté : ${r.chemin}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: e.message }], isError: true };
    }
  },
);

await server.connect(new StdioServerTransport());
console.error(`[constat] serveur MCP prêt, journal : ${journal.chemin}, registres : ${REGISTRES}`);
