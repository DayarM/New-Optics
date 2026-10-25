/**
 * Login/logout. A senha só trafega no momento do login (HTTPS) e é
 * conferida no servidor contra um hash — nunca fica salva no aparelho.
 */
import { dataService } from '../data/dataService.js?v=864615d145';
import { salvarSessao, lerSessao, limparSessao } from '../core/sessao.js?v=864615d145';
import { AppError } from '../core/erros.js?v=864615d145';

export const authService = {
  async entrar(usuario, senha) {
    if (!usuario.trim() || !senha) throw new AppError('LOGIN_INVALIDO');
    const sessao = await dataService.login(usuario.trim(), senha);
    salvarSessao(sessao); // { token, nome, expiraEm }
    return sessao;
  },
  sair() {
    limparSessao();
    dataService.limparCache();
  },
  sessaoAtual: lerSessao,
};
