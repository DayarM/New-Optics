/**
 * Tela "Clientes": busca simples (ação principal) e exportação de backup.
 */
import { APP_CONFIG } from '../../config/app.config.js';
import { el, icone, limpar } from '../../core/dom.js';
import { mensagemParaOperador, registrarErro } from '../../core/erros.js';
import { store } from '../../core/store.js';
import { buscarClientes, COLUNAS_CSV_CLIENTES, gerarCSV } from '../../services/clientes.js';
import { formatarDataBR, hojeISO } from '../../services/datas.js';
import { formatarWhatsApp } from '../../services/telefone.js';
import { avisar } from '../componentes/aviso.js';
import { estadoCarregando, estadoErro } from '../layout.js';

let ultimoTermo = ''; // mantém a busca ao voltar da ficha

export async function telaClientes(principal) {
  limpar(principal);

  const campoBusca = el('input', {
    id: 'busca', type: 'search', value: ultimoTermo, autocomplete: 'off',
    placeholder: 'Nome ou número', 'aria-describedby': 'busca-resumo',
  });
  const resumo = el('p', { id: 'busca-resumo', class: 'nota' });
  const lista = el('ul', { class: 'lista-clientes' });

  principal.append(
    el('header', { class: 'tela-cab' }, el('h1', { class: 'tela-titulo' }, 'Clientes')),
    el('div', { class: 'busca' },
      el('label', { for: 'busca', class: 'visualmente-oculto' }, 'Buscar cliente'),
      icone('busca'), campoBusca),
    resumo,
    lista,
    el('div', { class: 'rodape-tela' },
      el('button', { type: 'button', class: 'btn btn-texto', onclick: exportarCSV },
        icone('baixar'), 'Exportar planilha (CSV)')),
  );

  const desenhar = () => {
    const { resultados, total } = buscarClientes(store.clientes, campoBusca.value, APP_CONFIG.busca.maxResultados);
    limpar(lista);

    if (store.clientes.length === 0) {
      resumo.textContent = '';
      lista.append(el('li', { class: 'estado' },
        el('p', { class: 'estado-titulo' }, 'Nenhum cliente cadastrado ainda'),
        el('a', { href: '#/clientes/novo', class: 'btn btn-primario' }, 'Cadastrar o primeiro cliente')));
      return;
    }
    if (total === 0) {
      resumo.textContent = 'Nenhum cliente encontrado. Confira a grafia ou busque pelo número.';
      return;
    }
    resumo.textContent = total > resultados.length
      ? `Mostrando ${resultados.length} de ${total}. Digite mais letras para achar mais rápido.`
      : `${total} ${total === 1 ? 'cliente' : 'clientes'}`;

    for (const c of resultados) {
      lista.append(el('li', {},
        el('a', { href: `#/cliente/${encodeURIComponent(c.id)}`, class: 'linha-cliente' },
          el('span', { class: 'linha-nome' }, c.nome),
          el('span', { class: 'linha-info' }, formatarWhatsApp(c.whatsapp)),
          el('span', { class: 'linha-info so-largo' },
            c.dataUltimaCompra ? `Compra em ${formatarDataBR(c.dataUltimaCompra)}` : 'Sem compra registrada'),
          c.naoQuerContato === 'SIM' || c.consentimento !== 'SIM'
            ? el('span', { class: 'marca-sem-contato' }, 'Sem contato')
            : null,
        )));
    }
  };

  campoBusca.addEventListener('input', () => { ultimoTermo = campoBusca.value; desenhar(); });

  if (store.jaCarregou) desenhar();
  else lista.append(estadoCarregando());

  try {
    const mudou = await store.carregar();
    if (mudou) desenhar();
  } catch (erro) {
    registrarErro(erro, 'carregar clientes');
    if (!store.jaCarregou) limpar(lista).append(estadoErro(mensagemParaOperador(erro, 'carregar'), () => telaClientes(principal)));
    else avisar(mensagemParaOperador(erro, 'carregar'), 'erro');
  }
}

function exportarCSV() {
  if (store.clientes.length === 0) {
    avisar('Não há clientes para exportar.', 'info');
    return;
  }
  const csv = gerarCSV(store.clientes, COLUNAS_CSV_CLIENTES);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `clientes-${hojeISO(APP_CONFIG.fusoHorario)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avisar('Planilha exportada. Guarde o arquivo em local seguro: ele contém dados pessoais.', 'info');
}
