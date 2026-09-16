// registre-serveur.js — exposition MCP (stdio) du connecteur registre, lecture seule.
// stdout est le canal MCP : ne jamais y écrire.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chercher, lire } from './registre.js';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const REGISTRES = process.env.REGISTRES_DIR ?? path.resolve(ICI, '..', '..', 'registres');

const server = new McpServer({ name: 'registre', version: '0.1.0' });

server.registerTool(
  'registre_chercher',
  {
    description:
      'Cherche dans les registres qualité locaux (stupéfiants, températures…) les lignes contenant un texte. ' +
      'Chaque ligne a un id : c\'est lui qui sert de preuve (registre:<id>) pour constat_creer.',
    inputSchema: {
      texte: z.string().min(1).describe('Mot ou fragment à chercher, insensible à la casse.'),
      registre: z.string().optional().describe('Limiter à un registre : stupefiants, temperatures…'),
    },
  },
  async ({ texte, registre }) => {
    const lignes = chercher(REGISTRES, texte, registre);
    return { content: [{ type: 'text', text: lignes.length ? JSON.stringify(lignes, null, 2) : 'Aucune ligne ne contient ce texte.' }] };
  },
);

server.registerTool(
  'registre_lire',
  {
    description: 'Lit une ligne de registre par son id (ex. STUP-2026-09-15-012).',
    inputSchema: { id: z.string().min(1).describe('Identifiant exact de la ligne.') },
  },
  async ({ id }) => {
    const ligne = lire(REGISTRES, id);
    if (!ligne) return { content: [{ type: 'text', text: `${id} : introuvable dans les registres.` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify(ligne, null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
console.error(`[registre] serveur MCP prêt, registres : ${REGISTRES}`);
