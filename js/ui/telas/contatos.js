/**
 * TELA: Contatos feitos — histórico de todos os contatos registrados.
 */
import { h, montar } from '../../core/dom.js?v=9ece4c76cc';
import { dataService } from '../../data/dataService.js?v=9ece4c76cc';
import { REGRAS_RECONTATO } from '../../config/regras.config.js?v=9ece4c76cc';
import { formatarData, hojeISO, somarDias } from '../../core/datas.js?v=9ece4c76cc';
import { carregando, falhaCarregar, chips, campo, avatar } from '../componentes/ui.js?v=9ece4c76cc';

const filtro = { periodo: 7, operador: '', resultado: '' };
const LIMITE = 200;

export async function telaContatos(container) {
  montar(container, carregando());
  let dados;
  try { dados = await dataService.obterTudo(); } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaContatos(container)));
    return;
  }

  const nomes = new Map([...dados.clientes, ...dados.leads].map((p) => [p.id, p.nome]));
  const rotulos = Object.fromEntries(REGRAS_RECONTATO.resultados.map((r) => [r.chave, r.rotulo]));
  const operadores = [...new Set(dados.contatos.map((c) => c.operador).filter(Boolean))].sort();
  const resultado = h('div', { 'aria-live': 'polite' });
  const contador = h('p', { class: 'contagem' });

  const desenhar = () => {
    const hoje = hojeISO();
    const inicio = filtro.periodo ? somarDias(hoje, -(filtro.periodo - 1)) : '';
    const lista = dados.contatos
      .filter((c) => (!inicio || c.data >= inicio) && (!filtro.operador || c.operador === filtro.operador)
        && (!filtro.resultado || c.resultado === filtro.resultado))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.criado_em).localeCompare(String(a.criado_em)));
    contador.textContent = `${lista.length} ${lista.length === 1 ? 'contato' : 'contatos'}`;
    montar(resultado, lista.length
      ? h('ul', { class: 'lista' }, lista.slice(0, LIMITE).map((c) => {
          const ehLead = Boolean(c.lead_id);
          const id = ehLead ? c.lead_id : c.cliente_id;
          const nome = nomes.get(id) || 'Cadastro excluído';
          return h('li', { class: 'linha linha-bloco' },
            avatar(nome, id),
            h('div', { class: 'linha-info' },
              h('p', { class: 'linha-nome' },
                nomes.has(id) ? h('a', { href: `#/${ehLead ? 'leads' : 'clientes'}/${encodeURIComponent(id)}` }, nome) : nome,
                ehLead && h('span', { class: 'selo selo-lead' }, 'Lead')),
              h('p', { class: 'linha-sub' },
                h('span', { class: `selo selo-resultado res-${c.resultado}` }, rotulos[c.resultado] || c.resultado),
                c.motivo && h('span', { class: 'so-tela-grande' }, c.motivo)),
              c.observacao && h('p', { class: 'linha-obs' }, c.observacao)),
            h('div', { class: 'linha-lateral' },
              h('span', { class: 'num' }, formatarData(c.data)),
              c.operador && h('span', {}, c.operador)));
        }))
      : h('div', { class: 'estado' }, h('p', {}, 'Nenhum contato neste filtro.')));
  };

  const selOperador = campo({ nome: 'operador', rotulo: 'Operador', tipo: 'select', opcoes: operadores, valor: filtro.operador });
  const selResultado = campo({ nome: 'resultado', rotulo: 'Resultado', tipo: 'select',
    opcoes: REGRAS_RECONTATO.resultados.map((r) => r.rotulo), valor: rotulos[filtro.resultado] || '' });
  selOperador.querySelector('select').addEventListener('change', (e) => { filtro.operador = e.target.value; desenhar(); });
  selResultado.querySelector('select').addEventListener('change', (e) => {
    filtro.resultado = REGRAS_RECONTATO.resultados.find((r) => r.rotulo === e.target.value)?.chave || '';
    desenhar();
  });
  // "Escolha…" vira "Todos" nos filtros.
  [selOperador, selResultado].forEach((c) => { c.querySelector('option[value=""]').textContent = 'Todos'; c.querySelector('.opcional')?.remove(); });

  montar(container,
    h('div', { class: 'tela-topo' }, h('div', {}, h('h1', { class: 'titulo-tela' }, 'Contatos feitos'), contador)),
    chips({ rotulo: 'Período', valor: filtro.periodo,
      opcoes: [{ valor: 1, rotulo: 'Hoje' }, { valor: 7, rotulo: '7 dias' }, { valor: 30, rotulo: '30 dias' }, { valor: 0, rotulo: 'Tudo' }],
      aoMudar: (v) => { filtro.periodo = v; desenhar(); } }),
    h('div', { class: 'filtros' }, selOperador, selResultado),
    resultado);
  desenhar();
}
