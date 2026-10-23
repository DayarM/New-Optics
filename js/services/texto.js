/** Funções PURAS de texto. */

/** Troca {chave} pelos valores; chaves desconhecidas ficam vazias. */
export function preencherModelo(modelo, valores = {}) {
  return String(modelo ?? '').replace(/\{(\w+)\}/g, (_, chave) => (valores[chave] ?? ''));
}

/** "maria DE souza" → "Maria" */
export function primeiroNome(nomeCompleto) {
  const primeiro = String(nomeCompleto ?? '').trim().split(/\s+/)[0] || '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

/** Para busca: minúsculas e sem acento. */
export function normalizarBusca(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/** Remove espaços duplicados e das pontas. */
export function limparEspacos(texto) {
  return String(texto ?? '').replace(/\s+/g, ' ').trim();
}
