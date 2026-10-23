/**
 * Funções PURAS de data. Trabalham com "dias" no formato ISO (AAAA-MM-DD),
 * sem horário, para não sofrer com fuso horário. Testáveis em Node.
 */
const MS_DIA = 86_400_000;
const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoValido(iso) {
  if (typeof iso !== 'string') return false;
  const m = RE_ISO.exec(iso);
  if (!m) return false;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(a, me - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === me - 1 && dt.getUTCDate() === d;
}

/** Converte AAAA-MM-DD em número de dias desde 1970 (ou null). */
export function paraDia(iso) {
  if (!isoValido(iso)) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / MS_DIA);
}

export function deDia(n) {
  return new Date(n * MS_DIA).toISOString().slice(0, 10);
}

export function somarDias(iso, dias) {
  const n = paraDia(iso);
  return n == null ? null : deDia(n + dias);
}

/** Dias de A até B (positivo se B é depois de A). */
export function diasEntre(isoA, isoB) {
  const a = paraDia(isoA);
  const b = paraDia(isoB);
  return a == null || b == null ? null : b - a;
}

/** Soma meses; dia 31 + 1 mês vira o último dia do mês seguinte. */
export function somarMeses(iso, meses) {
  if (!isoValido(iso)) return null;
  const [a, m, d] = iso.split('-').map(Number);
  const total = m - 1 + meses;
  const ano = a + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(d, ultimoDia))).toISOString().slice(0, 10);
}

/** Idade em anos completos na data de referência. */
export function idadeEmAnos(nascIso, refIso) {
  if (!isoValido(nascIso) || !isoValido(refIso)) return null;
  const [an, mn, dn] = nascIso.split('-').map(Number);
  const [ar, mr, dr] = refIso.split('-').map(Number);
  let idade = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) idade -= 1;
  return idade;
}

/** Aniversário no ano informado (29/02 vira 28/02 em ano não bissexto). */
export function aniversarioNoAno(nascIso, ano) {
  if (!isoValido(nascIso)) return null;
  const [, m, d] = nascIso.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return new Date(Date.UTC(ano, m - 1, Math.min(d, ultimoDia))).toISOString().slice(0, 10);
}

/** "Hoje" no fuso da loja, em AAAA-MM-DD. */
export function hojeISO(timeZone = 'America/Fortaleza', agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(agora);
}

/**
 * Descreve uma distância em dias em português simples.
 * dias > 0 = futuro ("em 3 dias"); dias < 0 = passado ("há 3 dias").
 */
export function descreverRelativo(dias) {
  if (dias == null) return '';
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  const abs = Math.abs(dias);
  let texto;
  if (abs < 31) texto = `${abs} dias`;
  else if (abs < 365) {
    const meses = Math.max(1, Math.floor(abs / 30.44));
    texto = meses === 1 ? '1 mês' : `${meses} meses`;
  } else {
    const anos = Math.floor(abs / 365.25);
    texto = anos === 1 ? '1 ano' : `${anos} anos`;
  }
  return dias > 0 ? `em ${texto}` : `há ${texto}`;
}

export function formatarDataBR(iso) {
  if (!isoValido(iso)) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

export function formatarDataLonga(iso) {
  if (!isoValido(iso)) return '';
  const [a, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(Date.UTC(a, m - 1, d)));
}
