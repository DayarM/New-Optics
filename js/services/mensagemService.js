/**
 * Mensagens de WhatsApp — funções PURAS.
 */

/** Mantém só dígitos e garante o DDI. Retorna '' se o número for inválido. */
export function normalizarWhatsapp(numero, ddi = '55') {
  let d = String(numero || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');         // 0 + DDD (discagem antiga)
  if (d.length === 10 || d.length === 11) d = ddi + d;      // DDD + número
  return d.length >= 12 && d.length <= 13 ? d : '';
}

/** Exibe 5585988618282 como (85) 98861-8282. */
export function formatarWhatsapp(numero) {
  const d = String(numero || '').replace(/\D/g, '');
  const local = d.length >= 12 ? d.slice(2) : d; // remove o DDI
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return numero || '';
}

export function primeiroNome(nome) {
  const p = String(nome || '').trim().split(/\s+/)[0] || '';
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

/**
 * Preenche {variaveis} do modelo.
 * PONTO DE EXTENSÃO: novas variáveis (ex.: {vendedor}) entram em `valores`.
 */
export function montarMensagem(modelo, cliente, loja) {
  const valores = { primeiroNome: primeiroNome(cliente.nome), loja: loja.nome };
  return String(modelo || '').replace(/\{(\w+)\}/g, (m, k) => (k in valores ? valores[k] : m));
}

/** Link wa.me pronto, ou '' se o número for inválido. */
export function linkWhatsapp(numero, texto, ddi = '55') {
  const n = normalizarWhatsapp(numero, ddi);
  if (!n) return '';
  return `https://wa.me/${n}` + (texto ? `?text=${encodeURIComponent(texto)}` : '');
}
