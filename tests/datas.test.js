import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  somarMeses, somarDias, diasEntre, idadeEmAnos, aniversarioNoAno, descreverRelativo, hojeISO, isoValido,
} from '../js/services/datas.js';

test('somarMeses ajusta fim de mês e virada de ano', () => {
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(somarMeses('2025-11-15', 18), '2027-05-15');
  assert.equal(somarMeses('2026-03-10', -12), '2025-03-10');
});
test('dias e idade', () => {
  assert.equal(somarDias('2026-12-28', 7), '2027-01-04');
  assert.equal(diasEntre('2026-10-01', '2026-10-14'), 13);
  assert.equal(idadeEmAnos('2020-10-15', '2026-10-14'), 5);
  assert.equal(idadeEmAnos('2020-10-14', '2026-10-14'), 6);
});
test('aniversário de 29/02 em ano não bissexto', () => {
  assert.equal(aniversarioNoAno('2000-02-29', 2026), '2026-02-28');
});
test('texto relativo', () => {
  assert.equal(descreverRelativo(0), 'hoje');
  assert.equal(descreverRelativo(-8), 'há 8 dias');
  assert.equal(descreverRelativo(12), 'em 12 dias');
  assert.equal(descreverRelativo(-400), 'há 1 ano');
  assert.equal(descreverRelativo(-61), 'há 2 meses');
});
test('validação e hoje no fuso da loja', () => {
  assert.equal(isoValido('2026-02-30'), false);
  assert.equal(hojeISO('America/Fortaleza', new Date('2026-10-15T02:00:00Z')), '2026-10-14');
});
