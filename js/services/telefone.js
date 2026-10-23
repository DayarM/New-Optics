/**
 * WhatsApp: normalização, validação e link wa.me. Funções PURAS.
 * Formato gravado: só dígitos, com 55 + DDD + número. Ex.: 5585999998888
 */

// DDDs válidos no Brasil (Anatel).
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * @returns {{ok: true, numero: string, aviso?: string} | {ok: false, erro: string}}
 */
export function normalizarWhatsApp(entrada, ddi = '55') {
  let d = String(entrada ?? '').replace(/\D/g, '');
  if (!d) return { ok: false, erro: 'Informe o WhatsApp com DDD.' };

  d = d.replace(/^0+/, ''); // tira o 0 de discagem (ex.: 085...)
  if (d.length === 10 || d.length === 11) d = ddi + d;

  if (!(d.length === 12 || d.length === 13) || !d.startsWith(ddi)) {
    return { ok: false, erro: 'Número incompleto ou com dígitos a mais. Use DDD + número, ex.: (85) 99999-8888.' };
  }

  const ddd = Number(d.slice(2, 4));
  if (!DDDS.has(ddd)) return { ok: false, erro: `O DDD ${ddd} não existe. Confira o número.` };

  if (d.length === 13 && d[4] !== '9') {
    return { ok: false, erro: 'Celular deve começar com 9 depois do DDD. Confira o número.' };
  }
  if (d.length === 12) {
    return { ok: true, numero: d, aviso: 'Parece um telefone fixo. Confirme se ele tem WhatsApp.' };
  }
  return { ok: true, numero: d };
}

/** 5585999998888 → (85) 99999-8888 */
export function formatarWhatsApp(numero) {
  const d = String(numero ?? '').replace(/\D/g, '');
  if (d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return d;
}

export function linkWhatsApp(numero, mensagem = '') {
  const d = String(numero ?? '').replace(/\D/g, '');
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : '';
  return `https://wa.me/${d}${texto}`;
}
