// test/constat.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schemaConstat, detecterDonneePersonnelle, ROLES } from '../constat.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Journal, creer, lister, rejouer, valider } from '../constat.js';

function journalTemporaire() {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'constat-'));
  return new Journal(path.join(dossier, 'journal.jsonl'));
}
const HORLOGE = () => '2026-09-16T10:00:00.000Z';

const VALIDE = {
  objet: 'Étiquetage des stupéfiants incomplet sur 3 boîtes',
  preuve: ['Registre des stupéfiants, relevé du 2026-09-15'],
  responsable: 'qualite',
  echeance: '2026-10-01',
};

test('un constat complet est accepté', () => {
  const r = schemaConstat.safeParse(VALIDE);
  assert.equal(r.success, true);
});

test('sans preuve, le schéma refuse et nomme le champ', () => {
  const { preuve, ...sansPreuve } = VALIDE;
  const r = schemaConstat.safeParse(sansPreuve);
  assert.equal(r.success, false);
  assert.ok(r.error.issues.some(i => i.path[0] === 'preuve'));
});

test('une preuve vide est refusée', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, preuve: [] });
  assert.equal(r.success, false);
});

test('un nom avec civilité dans objet est refusé', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, objet: 'Erreur de M. Dupont Jean au comptoir' });
  assert.equal(r.success, false);
  assert.match(r.error.issues[0].message, /donnée personnelle/);
});

test('un numéro de téléphone dans une preuve est refusé', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, preuve: ['appel au 06 12 34 56 78'] });
  assert.equal(r.success, false);
});

test('une date de naissance est refusée', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, objet: 'patiente née le 12/03/1985' });
  assert.equal(r.success, false);
});

test('responsable hors liste de rôles est refusé', () => {
  const r = schemaConstat.safeParse({ ...VALIDE, responsable: 'Emmanuel' });
  assert.equal(r.success, false);
  assert.ok(r.error.issues.some(i => i.path[0] === 'responsable'));
});

test('la liste des rôles est celle du spec', () => {
  assert.deepEqual(ROLES, ['pharmacien-titulaire', 'pharmacien-adjoint', 'preparateur', 'qualite']);
});

test('detecterDonneePersonnelle renvoie null sur un texte propre', () => {
  assert.equal(detecterDonneePersonnelle('3 boîtes sans étiquette, rayon B'), null);
});

test('deux créations donnent constat-1 puis constat-2, en statut propose', () => {
  const j = journalTemporaire();
  const a = creer(j, VALIDE, HORLOGE);
  const b = creer(j, { ...VALIDE, objet: 'Température frigo hors plage, 2 relevés' }, HORLOGE);
  assert.equal(a.id, 'constat-1');
  assert.equal(b.id, 'constat-2');
  assert.equal(a.statut, 'propose');
});

test("l'état se rejoue à l'identique depuis le journal", () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE);
  creer(j, { ...VALIDE, objet: 'Second constat' }, HORLOGE);
  const depuisJournal = [...rejouer(j.lire()).values()];
  assert.deepEqual(lister(j), depuisJournal);
  assert.equal(depuisJournal.length, 2);
  assert.equal(depuisJournal[1].objet, 'Second constat');
});

test("créer avec une entrée invalide n'écrit rien dans le journal", () => {
  const j = journalTemporaire();
  assert.throws(() => creer(j, { ...VALIDE, preuve: [] }, HORLOGE));
  assert.equal(j.lire().length, 0);
});

test('un journal absent se lit comme vide', () => {
  const j = journalTemporaire();
  assert.deepEqual(j.lire(), []);
  assert.deepEqual(lister(j), []);
});

test('valider un id inconnu refuse et ne touche pas au journal', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE);
  assert.throws(() => valider(j, 'constat-9', HORLOGE), /inconnu/);
  assert.equal(j.lire().length, 1);
});

test('valider constat-1 passe le statut à valide et ajoute une ligne', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE);
  const v = valider(j, 'constat-1', HORLOGE);
  assert.equal(v.statut, 'valide');
  assert.equal(j.lire().length, 2);
  assert.equal(lister(j)[0].statut, 'valide');
});

test('valider deux fois est refusé', () => {
  const j = journalTemporaire();
  creer(j, VALIDE, HORLOGE);
  valider(j, 'constat-1', HORLOGE);
  assert.throws(() => valider(j, 'constat-1', HORLOGE), /déjà/);
});
