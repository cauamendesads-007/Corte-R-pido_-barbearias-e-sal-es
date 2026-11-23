/**
 * Implementação Mock do IEstabelecimentosService.
 */

import { IEstabelecimentosService } from './IEstabelecimentosService';
import type { Estabelecimento, Servico, ItemGaleria, Avaliacao, ConfiguracaoPix, MensagemAutomatica, FiltrosBusca, ResultadoServico, StatusEstabelecimento, TipoLayout } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

export class EstabelecimentosServiceMock implements IEstabelecimentosService {
  async buscar(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
    await simularLatencia();
    simularErroAleatorio();

    let resultados = estadoGlobal.estabelecimentos.filter((e) => e.status === 'aprovado');

    if (filtros.nicho && filtros.nicho !== 'todos') {
      resultados = resultados.filter((e) => e.nicho === filtros.nicho);
    }

    if (filtros.precoMaximo) {
      resultados = resultados.filter((e) =>
        e.servicos.some((s) => s.preco <= filtros.precoMaximo!)
      );
    }

    if (filtros.avaliacaoMinima) {
      resultados = resultados.filter((e) => e.avaliacao >= filtros.avaliacaoMinima!);
    }

    if (filtros.tipoServico) {
      resultados = resultados.filter((e) =>
        e.servicos.some((s) => s.tag === filtros.tipoServico || s.nome.toLowerCase().includes(filtros.tipoServico!.toLowerCase()))
      );
    }

    if (filtros.apenasBemAvaliados) {
      resultados = resultados.filter((e) => e.avaliacao >= 4.8);
    }

    if (filtros.apenasVagasHoje) {
      resultados = resultados.filter((e) => e.fila.length > 0);
    }

    switch (filtros.ordenacao) {
      case 'avaliacao':
        resultados.sort((a, b) => b.avaliacao - a.avaliacao);
        break;
      case 'preco':
        resultados.sort((a, b) => {
          const minA = Math.min(...a.servicos.map((s) => s.preco), Infinity);
          const minB = Math.min(...b.servicos.map((s) => s.preco), Infinity);
          return minA - minB;
        });
        break;
      case 'distancia':
        // Simulado - em produção usaria coordenadas
        break;
      default:
        // relevancia
        break;
    }

    return sucesso(resultados);
  }

  async obter(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    return sucesso(est ? { ...est } : null);
  }

  async obterPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.slug === slug);
    return sucesso(est ? { ...est } : null);
  }

  async criar(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const slug = dados.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const novo: Estabelecimento = {
      ...dados,
      id: `est-${gerarId()}`,
      slug,
      avaliacao: 0,
      status: 'pendente' as StatusEstabelecimento,
      seguidores: 0,
      taxaFidelidade: 0,
      servicos: [],
      galeria: [],
      avaliacoes: [],
      fila: [],
      tempoMedioAtendimento: 20,
      horarioFuncionamento: '09:00-18:00',
      permiteAutoEdicao: false,
      configuracaoPix: { modo: 'desativado', chave: '', percentualSinal: 30 },
      tema: { cor: '#3b82f6', layout: 'classico' as TipoLayout, titulo: dados.nome, subtitulo: '' },
    };

    estadoGlobal.estabelecimentos.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async atualizar(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], ...dados };
    persistirEstado();

    return sucesso(estadoGlobal.estabelecimentos[idx]);
  }

  async excluir(id: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.configuracaoPix = config;
    persistirEstado();

    return sucesso(config);
  }

  async atualizarMensagensAutomaticas(id: string, mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    // Mensagens automáticas são salvas separadamente em produção
    persistirEstado();

    return sucesso(mensagens);
  }

  async atualizarTema(id: string, tema: { cor?: string; layout?: string; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    if (tema.cor) est.tema.cor = tema.cor;
    if (tema.layout) est.tema.layout = tema.layout as TipoLayout;
    if (tema.titulo) est.tema.titulo = tema.titulo;
    if (tema.subtitulo) est.tema.subtitulo = tema.subtitulo;

    persistirEstado();
    return sucesso(est);
  }

  async atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.horarioFuncionamento = horario;
    persistirEstado();

    return sucesso(est);
  }

  async definirAutoEdicao(id: string, permitido: boolean): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    if (!est) return falha('Estabelecimento não encontrado.');

    est.permiteAutoEdicao = permitido;
    persistirEstado();

    return sucesso(undefined);
  }

  // Serviços
  async listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    return sucesso([...est.servicos]);
  }

  async obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const servico = est.servicos.find((s) => s.id === servicoId);
    return sucesso(servico ? { ...servico } : null);
  }

  async criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const novo: Servico = { ...servico, id: `svc-${gerarId()}` };
    est.servicos.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.servicos.findIndex((s) => s.id === servicoId);
    if (idx === -1) return falha('Serviço não encontrado.');

    est.servicos[idx] = { ...est.servicos[idx], ...dados };
    persistirEstado();

    return sucesso(est.servicos[idx]);
  }

  async excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.servicos.findIndex((s) => s.id === servicoId);
    if (idx === -1) return falha('Serviço não encontrado.');

    est.servicos.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const reordenados = servicoIds.map((id) => est.servicos.find((s) => s.id === id)).filter(Boolean) as Servico[];
    est.servicos = [...reordenados, ...est.servicos.filter((s) => !servicoIds.includes(s.id))];
    persistirEstado();

    return sucesso(est.servicos);
  }

  async adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const servico = est.servicos.find((s) => s.id === servicoId);
    if (!servico) return falha('Serviço não encontrado.');

    servico.midias = servico.midias || [];
    servico.midias.push(midia);
    persistirEstado();

    return sucesso(servico);
  }

  async removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const servico = est.servicos.find((s) => s.id === servicoId);
    if (!servico) return falha('Serviço não encontrado.');

    if (servico.midias && midiaIndex >= 0 && midiaIndex < servico.midias.length) {
      servico.midias.splice(midiaIndex, 1);
      persistirEstado();
    }

    return sucesso(servico);
  }

  // Galeria
  async listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    return sucesso([...est.galeria]);
  }

  async adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const novo: ItemGaleria = { ...item, id: `gal-${gerarId()}` };
    est.galeria.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.galeria.findIndex((g) => g.id === itemId);
    if (idx === -1) return falha('Item não encontrado.');

    est.galeria.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const reordenados = itemIds.map((id) => est.galeria.find((g) => g.id === id)).filter(Boolean) as ItemGaleria[];
    est.galeria = [...reordenados, ...est.galeria.filter((g) => !itemIds.includes(g.id ?? ''))];
    persistirEstado();

    return sucesso(est.galeria);
  }

  async adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
    return this.adicionarGaleria(estabelecimentoId, item);
  }

  async removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
    return this.removerGaleria(estabelecimentoId, itemId);
  }

  // Avaliações
  async listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    return sucesso([...est.avaliacoes].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
  }

  async responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.avaliacoes.findIndex((a) => a.id === avaliacaoId);
    if (idx === -1) return falha('Avaliação não encontrada.');

    est.avaliacoes[idx] = { ...est.avaliacoes[idx], resposta };
    persistirEstado();

    return sucesso(est.avaliacoes[idx]);
  }

  // Fila
  async obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const esperaEstimada = est.fila.length * 15 || 0;
    return sucesso({
      fila: est.fila.map((f) => ({ nome: f.nome, horarioChegada: f.horarioChegada })),
      esperaEstimada
    });
  }

  async entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const agora = new Date();
    const horario = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    est.fila.push({ nome, horarioChegada: horario });
    persistirEstado();

    const posicao = est.fila.length;
    return sucesso({ posicao, esperaEstimada: posicao * 15 });
  }

  async sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const idx = est.fila.findIndex((f) => f.nome === nome);
    if (idx === -1) return falha('Nome não encontrado na fila.');

    est.fila.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est || est.fila.length === 0) return falha('Fila vazia.');

    est.fila.shift();
    persistirEstado();

    return sucesso(undefined);
  }

  async adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
    return this.entrarNaFila(estabelecimentoId, nome).then((r) => (r.sucesso ? sucesso(undefined) : falha(r.erro!)));
  }

  async removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    if (index >= 0 && index < est.fila.length) {
      est.fila.splice(index, 1);
      persistirEstado();
    }

    return sucesso(undefined);
  }
}