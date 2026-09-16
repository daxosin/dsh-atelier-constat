// test/constat.test.js — itération 2 : preuve = référence de registre vérifiée,
// plus de filtre RGPD à l'entrée (ADR 2026-09-16-rgpd-a-la-frontiere).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { schemaConstat, detecterDonneePersonnelle, Journal, creer, lister, rejouer, valider } from '../constat.js';

function journalTemporaire() {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'constat-'));
  return new Journal(path.join(dossier, 'journal.jsonl'));
}
const HORLOGE = () => '2026-09-16T10:00:00.000Z';
// Vérificateur de preuve injecté : seuls ces ids existent.
const EXISTE = (id) => ['STUP-2026-09-15-012', 'TEMP-2026-09-15-001'].includes(id);

const VALIDE = {
  objet: 'Trois boîtes d\'Actiskenan sans étiquette de traçabilité au rayon B',
  preuve: ['registre:STUP-2026-09-15-012'],
  responsable: 'Julien Morel, préparateur',
  echeance: '2026-10-01',
};

// ── schéma ──────────────────────────────────────────────────────────────────

test('un constat complet est accepté', () => {
  assert.equal(schemaConstat.safeParse(VALIDE).success, true);
});

test('sans preuve, le schéma refuse et nomme le champ', () => {
  const { preuve, ...sansPreuve } = VALIDE;
  const r = schemaConstat.safeParse(sansPreuve);
  assert.equal(r.success, false);
  assert.ok(r.error.issues.some((i) => i.path[0] === 'preuve'));
});

test('une preuve vide est refusée', () => {
  assert.equal(schemaConstat.safeParse({ ...VALIDE, preuve: [] }).success, false);
});

test('une preuve en texte libre est refusée : il faut registre:<id>', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, preuve: ['Relevé qualité, inventaire rayon B'] });
  assert.equal(r.success, false);
  assert.match(r.error.issues[0].message, /registre:<id>/);
});

test('un nom dans objet ou responsable est accepté (pas de filtre à l\'entrée)', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, objet: 'Erreur de M. Dupont Jean au comptoir, appel au 06 12 34 56 78', responsable: 'Emmanuel' });
  assert.equal(r.success, true);
});

test('detecterDonneePersonnelle reste disponible pour la frontière (exporter)', () => {
  assert.equal(detecterDonneePersonnelle('M. Dupont Jean'), 'civilite-nom');
  assert.equal(detecterDonneePersonnelle('appel au 06 12 34 56 78'), 'telephone');
  assert.equal(detecterDonneePersonnelle('née le 12/03/1985'), 'date-naissance');
  assert.equal(detecterDonneePersonnelle('3 boîtes sans étiquette, rayon B'), null);
});

// ── création : la preuve doit exister dans les registres ────────────────────

test('créer refuse une référence de registre inconnue et n\'écrit rien', () => {
  const j = journalTemporaire();
  assert.throws(() => creer(j, { ...VALIDE, preuve: ['registre:STUP-2026-09-15-999'] }, HORLOGE, EXISTE), /introuvable/);
  assert.equal(j.lire().length, 0);
});

test('créer accepte une référence existante et écrit', () => {
  const j = journalTemporaire();
  const c = creer(j, VALIDE, HORLOGE, EXISTE);
  assert.equal(c.id, 'constat-1');
  assert.equal(c.statut, 'propose');
  assert.equal(j.lire().length, 1);
});

test('deux créations donnent constat-1 puis constat-2', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE, EXISTE);
  const b = creer(j, { ...VALIDE, objet: 'Frigo vaccins 1 hors plage', preuve: ['registre:TEMP-2026-09-15-001'] }, HORLOGE, EXISTE);
  assert.equal(b.id, 'constat-2');
});

test("l'état se rejoue à l'identique depuis le journal", () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE, EXISTE);
  creer(j, { ...VALIDE, objet: 'Second constat' }, HORLOGE, EXISTE);
  const depuisJournal = [...rejouer(j.lire()).values()];
  assert.deepEqual(lister(j), depuisJournal);
  assert.equal(depuisJournal[1].objet, 'Second constat');
});

test('un journal absent se lit comme vide', () => {
  const j = journalTemporaire();
  assert.deepEqual(j.lire(), []);
  assert.deepEqual(lister(j), []);
});

// ── validation humaine ──────────────────────────────────────────────────────

test('valider un id inconnu refuse et ne touche pas au journal', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE, EXISTE);
  assert.throws(() => valider(j, 'constat-9', HORLOGE), /inconnu/);
  assert.equal(j.lire().length, 1);
});

test('valider constat-1 passe le statut à valide et ajoute une ligne', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE, EXISTE);
  const v = valider(j, 'constat-1', HORLOGE);
  assert.equal(v.statut, 'valide');
  assert.equal(j.lire().length, 2);
  assert.equal(lister(j)[0].statut, 'valide');
});

test('valider deux fois est refusé', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE, EXISTE);
  valider(j, 'constat-1', HORLOGE);
  assert.throws(() => valider(j, 'constat-1', HORLOGE), /déjà/);
});
