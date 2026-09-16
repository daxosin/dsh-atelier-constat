// test/valider.test.js — la commande humaine montre la preuve avant de signer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Journal, creer } from '../constat.js';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRES = path.resolve(RACINE, '..', '..', 'registres');

function lancer(args, journal) {
  return spawnSync(process.execPath, ['valider.js', ...args], {
    cwd: RACINE, encoding: 'utf8',
    env: { ...process.env, CONSTAT_JOURNAL: journal, REGISTRES_DIR: REGISTRES },
  });
}

test('valider.js affiche la ligne de registre citée en preuve avant de valider', () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'valider-'));
  const chemin = path.join(dossier, 'journal.jsonl');
  creer(new Journal(chemin), {
    objet: 'Trois boîtes sans étiquette au rayon B',
    preuve: ['registre:STUP-2026-09-15-012'],
    responsable: 'qualité',
    echeance: '2026-10-01',
  }, () => '2026-09-16T10:00:00.000Z');
  const r = lancer(['constat-1'], chemin);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /STUP-2026-09-15-012/);
  assert.match(r.stdout, /Actiskenan 10 mg/, 'le produit de la ligne de registre doit être affiché');
  assert.match(r.stdout, /Julien Morel/, 'l\'opérateur de la ligne doit être affiché');
  assert.match(r.stdout, /validé le/);
});

test('valider.js sans argument liste les constats et sort en 1', () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'valider-'));
  const r = lancer([], path.join(dossier, 'journal.jsonl'));
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Usage/);
});
