// test/registre.test.js — connecteur registre, lecture seule sur des CSV locaux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chargerRegistres, chercher, lire, existe } from '../registre.js';

const REGISTRES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'registres');

test('chargerRegistres lit tous les CSV du dossier, avec le nom du registre', () => {
  const lignes = chargerRegistres(REGISTRES);
  assert.ok(lignes.length >= 9);
  assert.ok(lignes.every((l) => l.registre && l.id && l.date));
  assert.ok(lignes.some((l) => l.registre === 'stupefiants'));
  assert.ok(lignes.some((l) => l.registre === 'temperatures'));
});

test('chercher trouve par mot, insensible à la casse, dans toutes les colonnes', () => {
  const r = chercher(REGISTRES, 'sans étiquette');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'STUP-2026-09-15-012');
  assert.equal(chercher(REGISTRES, 'FRIGO VACCINS 1').length, 3);
});

test('chercher peut se limiter à un registre', () => {
  assert.equal(chercher(REGISTRES, 'RAS', 'temperatures').length, 3);
  assert.equal(chercher(REGISTRES, 'RAS', 'stupefiants').length, 4);
});

test('lire renvoie la ligne complète par id, null si inconnu', () => {
  const l = lire(REGISTRES, 'TEMP-2026-09-15-001');
  assert.equal(l.enceinte, 'Frigo vaccins 1');
  assert.equal(l.operateur, 'Sophie Lambert');
  assert.equal(lire(REGISTRES, 'TEMP-1999-01-01-999'), null);
});

test('existe est vrai pour un id présent, faux sinon', () => {
  assert.equal(existe(REGISTRES, 'STUP-2026-09-15-012'), true);
  assert.equal(existe(REGISTRES, 'STUP-2026-09-15-999'), false);
});

test('un dossier de registres absent se lit comme vide', () => {
  assert.deepEqual(chargerRegistres(path.join(REGISTRES, 'nexiste-pas')), []);
});

// ── itération 3 : accents ────────────────────────────────────────────────────
test('chercher est insensible aux accents, dans les valeurs et le nom du registre', () => {
  assert.equal(chercher(REGISTRES, 'stupéfiants').length, 5, 'le nom du registre est « stupefiants »');
  assert.equal(chercher(REGISTRES, 'etiquette').length, 1, 'la remarque contient « étiquette »');
  assert.equal(chercher(REGISTRES, 'ÉTIQUETTE').length, 1);
});

test('chercher peut se limiter à un registre écrit avec accents', () => {
  assert.equal(chercher(REGISTRES, 'RAS', 'stupéfiants').length, 4);
});
