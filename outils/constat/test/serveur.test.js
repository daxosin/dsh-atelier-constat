// test/serveur.test.js — le schéma refuse AVANT le handler, sur le fil MCP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function clientSurJournalTemporaire() {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'constat-mcp-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['serveur.js'],
    cwd: RACINE,
    env: { ...process.env, CONSTAT_JOURNAL: path.join(dossier, 'journal.jsonl') },
  });
  const client = new Client({ name: 'test-constat', version: '0.0.0' });
  await client.connect(transport);
  return client;
}

const VALIDE = {
  objet: 'Étiquetage des stupéfiants incomplet sur 3 boîtes',
  preuve: ['Registre des stupéfiants, relevé du 2026-09-15'],
  responsable: 'qualite',
  echeance: '2026-10-01',
};

test('le serveur expose exactement constat_creer et constat_lister', async () => {
  const client = await clientSurJournalTemporaire();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['constat_creer', 'constat_lister']);
  const creer = tools.find((t) => t.name === 'constat_creer');
  assert.ok(creer.inputSchema.required.includes('preuve'), 'preuve doit être requise dans le schéma publié');
  await client.close();
});

test('constat_creer sans preuve revient en isError et nomme preuve', async () => {
  const client = await clientSurJournalTemporaire();
  const { preuve, ...sansPreuve } = VALIDE;
  const r = await client.callTool({ name: 'constat_creer', arguments: sansPreuve });
  assert.equal(r.isError, true);
  assert.match(JSON.stringify(r.content), /preuve/);
  await client.close();
});

test('constat_creer complet crée constat-1 en propose, visible dans constat_lister', async () => {
  const client = await clientSurJournalTemporaire();
  const r = await client.callTool({ name: 'constat_creer', arguments: VALIDE });
  assert.notEqual(r.isError, true, JSON.stringify(r.content));
  assert.match(r.content[0].text, /constat-1/);
  const l = await client.callTool({ name: 'constat_lister', arguments: {} });
  const liste = JSON.parse(l.content[0].text);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].statut, 'propose');
  await client.close();
});
