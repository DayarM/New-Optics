/**
 * Avatar com iniciais (listas de clientes, leads e contatos).
 * Funções puras: a mesma pessoa sempre recebe as mesmas iniciais e a mesma cor.
 */

/** Quantas cores de avatar existem no CSS (.av-0 … .av-4). */
export const CORES_AVATAR = 5;

/** "ana beatriz lima" → "AL"; "Maria" → "M"; vazio → "?". */
export function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toLocaleUpperCase('pt-BR');
}

/** Índice de cor estável a partir de um texto (id, nome ou operador). */
export function corAvatar(semente) {
  let soma = 0;
  for (const ch of String(semente || '')) soma = (soma * 31 + ch.codePointAt(0)) % 9973;
  return soma % CORES_AVATAR;
}
