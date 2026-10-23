import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarWhatsApp, formatarWhatsApp, linkWhatsApp } from '../js/services/telefone.js';

test('normaliza celular com máscara e sem 55', () => {
  assert.deepEqual(normalizarWhatsApp('(85) 99911-0001'), { ok: true, numero: '5585999110001' });
});
test('aceita +55 e zero de discagem', () => {
  assert.equal(normalizarWhatsApp('+55 85 99911-0001').numero, '5585999110001');
  assert.equal(normalizarWhatsApp('085999110001').numero, '5585999110001');
});
test('fixo é aceito com aviso', () => {
  const r = normalizarWhatsApp('85 3222-1111');
  assert.equal(r.ok, true);
  assert.equal(r.numero, '558532221111');
  assert.ok(r.aviso);
});
test('rejeita DDD inexistente, celular sem 9 e tamanho errado', () => {
  assert.equal(normalizarWhatsApp('(20) 99911-0001').ok, false);
  assert.equal(normalizarWhatsApp('(85) 89911-0001').ok, false);
  assert.equal(normalizarWhatsApp('9991100').ok, false);
  assert.equal(normalizarWhatsApp('').ok, false);
});
test('formata e monta link wa.me com mensagem codificada', () => {
  assert.equal(formatarWhatsApp('5585999110001'), '(85) 99911-0001');
  assert.equal(linkWhatsApp('5585999110001', 'Olá, Ana!'), 'https://wa.me/5585999110001?text=Ol%C3%A1%2C%20Ana!');
});
