/**
 * Sessão do operador (token assinado pelo servidor + nome + validade).
 * Fica no localStorage para o tablet não pedir login a cada recarga.
 * Nenhuma senha é guardada aqui.
 */
const CHAVE = 'mmcrm.sessao';

export function salvarSessao(sessao) {
  try { localStorage.setItem(CHAVE, JSON.stringify(sessao)); } catch { /* modo privado: segue sem lembrar */ }
}

/** Retorna a sessão válida ou null (já descarta sessão vencida). */
export function lerSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (!s || !s.token || !s.expiraEm || Date.now() > s.expiraEm) return null;
    return s;
  } catch {
    return null;
  }
}

export function limparSessao() {
  try { localStorage.removeItem(CHAVE); } catch { /* ignora */ }
}
