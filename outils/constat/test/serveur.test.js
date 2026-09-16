// test/serveur.test.js — les deux serveurs MCP, sur le fil, avec un vrai client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRES = path.resolve(RACINE, '..', '..', 'registres');

async function client(script) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'constat-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [script],
    cwd: RACINE,
    env: { ...process.env, CONSTAT_JOURNAL: path.join(dossier, 'journal.jsonl'), REGISTRES_DIR: REGISTRES },
  });
  const c = new Client({ name: 'test', version: '0.0.0' });
  await c.connect(transport);
  return c;
}

const VALIDE = {
  objet: 'Trois boîtes d\'Actiskenan sans étiquette de traçabilité au rayon B',
  preuve: ['registre:STUP-2026-09-15-012'],
  responsable: 'Julien Morel, préparateur',
  echeance: '2026-10-01',
};

test('constat : expose exactement constat_creer et constat_lister, preuve requise', async () => {
  const c = await client('serveur.js');
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['constat_creer', 'constat_lister']);
  assert.ok(tools.find((t) => t.name === 'constat_creer').inputSchema.required.includes('preuve'));
  await c.close();
});

test('constat : sans preuve → isError et nomme preuve', async () => {
  const c = await client('serveur.js');
  const { preuve, ...sansPreuve } = VALIDE;
  const r = await c.callTool({ name: 'constat_creer', arguments: sansPreuve });
  assert.equal(r.isError, true);
  assert.match(JSON.stringify(r.content), /preuve/);
  await c.close();
});

test('constat : preuve inventée (id absent des registres) → isError « introuvable »', async () => {
  const c = await client('serveur.js');
  const r = await c.callTool({ name: 'constat_creer', arguments: { ...VALIDE, preuve: ['registre:STUP-2026-09-15-999'] } });
  assert.equal(r.isError, true);
  assert.match(JSON.stringify(r.content), /introuvable/);
  await c.close();
});

test('constat : preuve existante → constat-1 en propose, visible dans constat_lister', async () => {
  const c = await client('serveur.js');
  const r = await c.callTool({ name: 'constat_creer', arguments: VALIDE });
  assert.notEqual(r.isError, true, JSON.stringify(r.content));
  assert.match(r.content[0].text, /constat-1/);
  const l = await c.callTool({ name: 'constat_lister', arguments: {} });
  assert.equal(JSON.parse(l.content[0].text)[0].statut, 'propose');
  await c.close();
});

test('registre : expose registre_chercher et registre_lire, lecture seule', async () => {
  const c = await client('registre-serveur.js');
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['registre_chercher', 'registre_lire']);
  const r = await c.callTool({ name: 'registre_chercher', arguments: { texte: 'sans étiquette' } });
  assert.match(r.content[0].text, /STUP-2026-09-15-012/);
  const l = await c.callTool({ name: 'registre_lire', arguments: { id: 'TEMP-2026-09-15-001' } });
  assert.match(l.content[0].text, /Sophie Lambert/);
  const inconnu = await c.callTool({ name: 'registre_lire', arguments: { id: 'TEMP-1999-01-01-999' } });
  assert.equal(inconnu.isError, true);
  await c.close();
});
