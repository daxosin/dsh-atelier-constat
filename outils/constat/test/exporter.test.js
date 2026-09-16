// test/exporter.test.js — la frontière : exporter filtre toujours, et ne sort
// qu'un constat signé par un humain (ADR RGPD à la frontière).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Journal, creer, valider, lister } from '../constat.js';
import { exporter } from '../exporter.js';

const REGISTRES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'registres');
const HORLOGE = () => '2026-09-16T10:00:00.000Z';
const EXISTE = () => true;

function bac() {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'exporter-'));
  return { journal: new Journal(path.join(dossier, 'journal.jsonl')), exports: path.join(dossier, 'exports') };
}
const VALIDE = {
  objet: 'Trois boîtes sans étiquette de traçabilité au rayon B',
  preuve: ['registre:STUP-2026-09-15-012'],
  responsable: 'responsable qualité',
  echeance: '2026-10-01',
};

test('un constat en statut propose ne s\'exporte pas', () => {
  const { journal, exports } = bac();
  creer(journal, VALIDE, HORLOGE, EXISTE);
  assert.throws(() => exporter(journal, 'constat-1', { registres: REGISTRES, dossier: exports }, HORLOGE), /valid/);
  assert.equal(fs.existsSync(exports), false);
});

test('un constat validé s\'exporte en markdown avec la ligne de registre, et le journal le trace', () => {
  const { journal, exports } = bac();
  creer(journal, VALIDE, HORLOGE, EXISTE);
  valider(journal, 'constat-1', HORLOGE);
  const r = exporter(journal, 'constat-1', { registres: REGISTRES, dossier: exports }, HORLOGE);
  assert.ok(fs.existsSync(r.chemin));
  const contenu = fs.readFileSync(r.chemin, 'utf8');
  assert.match(contenu, /constat-1/);
  assert.match(contenu, /STUP-2026-09-15-012/);
  assert.match(contenu, /Actiskenan 10 mg/);
  assert.equal(lister(journal)[0].exporteLe, '2026-09-16T10:00:00.000Z');
});

test('une donnée personnelle détectée bloque l\'export et nomme le champ', () => {
  const { journal, exports } = bac();
  creer(journal, { ...VALIDE, objet: 'Erreur signalée par Mme Durand, appel au 06 12 34 56 78' }, HORLOGE, EXISTE);
  valider(journal, 'constat-1', HORLOGE);
  assert.throws(() => exporter(journal, 'constat-1', { registres: REGISTRES, dossier: exports }, HORLOGE), /objet.*(civilite-nom|telephone)/);
  assert.equal(fs.existsSync(exports), false);
});

test('la ligne de registre citée est filtrée aussi : un opérateur nommé passe (nom sans civilité, limite connue)', () => {
  // Documente la limite du filtre : « Julien Morel » sans civilité n'est pas détecté.
  const { journal, exports } = bac();
  creer(journal, VALIDE, HORLOGE, EXISTE);
  valider(journal, 'constat-1', HORLOGE);
  const r = exporter(journal, 'constat-1', { registres: REGISTRES, dossier: exports }, HORLOGE);
  assert.match(fs.readFileSync(r.chemin, 'utf8'), /Julien Morel/);
});

test('un id inconnu est refusé', () => {
  const { journal, exports } = bac();
  assert.throws(() => exporter(journal, 'constat-9', { registres: REGISTRES, dossier: exports }, HORLOGE), /inconnu/);
});
