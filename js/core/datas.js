/**
 * Utilitários de data — funções PURAS.
 * Todas as datas do sistema trafegam como texto 'AAAA-MM-DD' (sem hora),
 * o que evita problemas de fuso horário entre aparelho, planilha e servidor.
 */

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DIA_MS = 86400000;

/** Valida 'AAAA-MM-DD' de verdade (rejeita 2026-02-31). */
export function ehDataISO(txt) {
  if (typeof txt !== 'string') return false;
  const m = RE_ISO.exec(txt);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Converte para número de dias desde 1970 (UTC). Retorna null se inválida. */
function paraDias(iso) {
  if (!ehDataISO(iso)) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
}

function deDias(n) {
  return new Date(n * DIA_MS).toISOString().slice(0, 10);
}

/** Data de hoje no fuso do aparelho. `agora` é injetável para testes. */
export function hojeISO(agora = new Date()) {
  const a = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

export function somarDias(iso, dias) {
  const n = paraDias(iso);
  return n === null ? null : deDias(n + dias);
}

/** Dias de `a` até `b` (b - a). Positivo se b é depois de a. */
export function diferencaDias(a, b) {
  const na = paraDias(a);
  const nb = paraDias(b);
  return na === null || nb === null ? null : nb - na;
}

/** Maior data válida de uma lista (ou null). Comparação de texto funciona em ISO. */
export function maisRecente(lista) {
  return lista.filter(ehDataISO).sort().pop() || null;
}

/** Mesmo dia e mês (para aniversário). 29/02 é lembrado em 28/02 nos anos comuns. */
export function ehAniversario(nascimentoISO, hoje) {
  if (!ehDataISO(nascimentoISO) || !ehDataISO(hoje)) return false;
  const [, mn, dn] = nascimentoISO.split('-');
  const [ah, mh, dh] = hoje.split('-');
  if (mn === mh && dn === dh) return true;
  const bissexto = (+ah % 4 === 0 && +ah % 100 !== 0) || +ah % 400 === 0;
  return mn === '02' && dn === '29' && !bissexto && mh === '02' && dh === '28';
}

/** 'AAAA-MM-DD' -> 'DD/MM/AAAA' para exibir. */
export function formatarData(iso) {
  if (!ehDataISO(iso)) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Texto amigável de distância: "hoje", "há 3 dias", "em 2 dias". */
export function distanciaTexto(iso, hoje) {
  const d = diferencaDias(hoje, iso);
  if (d === null) return '';
  if (d === 0) return 'hoje';
  if (d === -1) return 'ontem';
  if (d === 1) return 'amanhã';
  return d < 0 ? `há ${-d} dias` : `em ${d} dias`;
}
