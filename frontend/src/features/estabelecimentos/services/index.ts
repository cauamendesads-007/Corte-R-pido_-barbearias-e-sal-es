/**
 * Camada de serviços do domínio de Estabelecimentos.
 * Isola chamadas de API, mappers DTO ↔ Domínio, injetável via ServiceProvider (DIP).
 */

import { api, alternarSeguir, adicionarAvaliacao as apiAdicionarAvaliacao } from '@/servicos/api';
import type {
  Estabelecimento,
  Servico,
  ItemGaleria,
  Avaliacao,
  FiltrosBusca,
  FiltrosEstabelecimento,
  ServicoInput,
  GaleriaItemInput,
  TemaInput,
  ConfiguracaoPixInput,
  MensagensAutomaticasInput,
  ConfiguracaoPix,
  MensagemAutomatica,
  Result,
  EstabelecimentoErrorCode,
  EstabelecimentoComputado,
} from '../types';
import { computarEstabelecimento, filtrarEstabelecimentos, ordenarEstabelecimentos } from '../rules';

/** Interface do serviço de estabelecimentos (para DIP) */
export interface IEstabelecimentoService {
  // Marketplace / Público
  listar(filtros: FiltrosBusca): Promise<Result<EstabelecimentoComputado[]>>;
  obterPorSlug(slug: string): Promise<Result<EstabelecimentoComputado | null>>;
  obterPorId(id: string): Promise<Result<Estabelecimento | null>>;
  seguir(estabelecimentoId: string, usuarioEmail: string): Promise<Result<{ seguindo: boolean }>>;
  entrarNaFila(estabelecimentoId: string, nome: string): Promise<Result<{ posicao: number; esperaEstimada: number }>>;
  obterFila(estabelecimentoId: string): Promise<Result<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>>;
  sairDaFila(estabelecimentoId: string, nome: string): Promise<Result<void>>;
  listarServicos(estabelecimentoId: string): Promise<Result<Servico[]>>;
  listarGaleria(estabelecimentoId: string): Promise<Result<ItemGaleria[]>>;
  listarAvaliacoes(estabelecimentoId: string): Promise<Result<Avaliacao[]>>;
  adicionarAvaliacao(estabelecimentoId: string, nota: number, comentario: string, nomeCliente: string): Promise<Result<Avaliacao>>;
  curtirPublicacao(publicacaoId: string, usuarioEmail: string): Promise<Result<{ curtido: boolean; total: number }>>;
  salvarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<Result<{ salvo: boolean }>>;
  compartilharPublicacao(publicacaoId: string): Promise<Result<void>>;
  denunciarPublicacao(publicacaoId: string, motivo: string): Promise<Result<void>>;

  // Gestão (barbeiro)
  obterGestao(estabelecimentoId: string): Promise<Result<Estabelecimento>>;
  atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<Result<Estabelecimento>>;
  atualizarTema(id: string, tema: TemaInput): Promise<Result<Estabelecimento>>;
  atualizarHorario(id: string, horario: string): Promise<Result<Estabelecimento>>;
  atualizarConfiguracaoPix(id: string, config: ConfiguracaoPixInput): Promise<Result<ConfiguracaoPix>>;
  atualizarMensagensAutomaticas(id: string, mensagens: MensagensAutomaticasInput): Promise<Result<MensagemAutomatica>>;
  // Serviços
  adicionarServico(estabelecimentoId: string, servico: ServicoInput): Promise<Result<Servico>>;
  atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<Result<Servico>>;
  excluirServico(estabelecimentoId: string, servicoId: string): Promise<Result<void>>;
  reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<Result<Servico[]>>;
  // Galeria
  adicionarGaleria(estabelecimentoId: string, item: GaleriaItemInput): Promise<Result<ItemGaleria>>;
  removerGaleria(estabelecimentoId: string, itemId: string): Promise<Result<void>>;
  reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<Result<ItemGaleria[]>>;
  // Avaliações
  responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<Result<Avaliacao>>;

  // Admin
  listarTodos(filtros?: FiltrosEstabelecimento): Promise<Result<Estabelecimento[]>>;
  alterarStatus(id: string, status: 'aprovado' | 'pendente' | 'rejeitado'): Promise<Result<void>>;
  excluir(id: string): Promise<Result<void>>;
}

/** Tratamento unificado de erros da API */
function handleApiError<T>(error: unknown, _defaultCode: EstabelecimentoErrorCode): Result<T> {
  if (error instanceof Error) {
    if (error.message.includes('não encontrado') || error.message.includes('não existe')) {
      return { sucesso: false, erro: error.message };
    }
    if (error.message.includes('conexão') || error.message.includes('rede')) {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
    return { sucesso: false, erro: error.message };
  }
  return { sucesso: false, erro: 'Erro inesperado. Tente novamente.' };
}

/** Implementação concreta do serviço de estabelecimentos */
export class EstabelecimentoService implements IEstabelecimentoService {
  // ============================================================================
  // MARKETPLACE / PÚBLICO
  // ============================================================================

  async listar(filtros: FiltrosBusca): Promise<Result<EstabelecimentoComputado[]>> {
    try {
      const resposta = await api.estabelecimentos.buscar(filtros);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao listar estabelecimentos' };
      }
      const filtrados = filtrarEstabelecimentos(resposta.dados || [], filtros);
      const computados = filtrados.map((e) => computarEstabelecimento(e, filtros.localizacaoUsuario || undefined));
      const ordenados = ordenarEstabelecimentos(computados, filtros.ordenacao);
      return { sucesso: true, dados: ordenados };
    } catch (error) {
      return handleApiError<EstabelecimentoComputado[]>(error, 'ERRO_CONEXAO');
    }
  }

  async obterPorSlug(slug: string): Promise<Result<EstabelecimentoComputado | null>> {
    try {
      const resposta = await api.estabelecimentos.obterPorSlug(slug);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao buscar estabelecimento' };
      }
      if (!resposta.dados) {
        return { sucesso: true, dados: null };
      }
      return { sucesso: true, dados: computarEstabelecimento(resposta.dados) };
    } catch (error) {
      return handleApiError<EstabelecimentoComputado | null>(error, 'ERRO_CONEXAO');
    }
  }

  async obterPorId(id: string): Promise<Result<Estabelecimento | null>> {
    try {
      const resposta = await api.estabelecimentos.obter(id);
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao buscar estabelecimento' };
      }
      return { sucesso: true, dados: resposta.dados };
    } catch (error) {
      return handleApiError<Estabelecimento | null>(error, 'ERRO_CONEXAO');
    }
  }

  async seguir(estabelecimentoId: string, usuarioEmail: string): Promise<Result<{ seguindo: boolean }>> {
    try {
      const resposta = await alternarSeguir(estabelecimentoId, usuarioEmail);
      return resposta;
    } catch (error) {
      return handleApiError<{ seguindo: boolean }>(error, 'ERRO_CONEXAO');
    }
  }

  async entrarNaFila(estabelecimentoId: string, nome: string): Promise<Result<{ posicao: number; esperaEstimada: number }>> {
    try {
      const resposta = await api.estabelecimentos.entrarNaFila(estabelecimentoId, nome);
      return resposta;
    } catch (error) {
      return handleApiError<{ posicao: number; esperaEstimada: number }>(error, 'ERRO_CONEXAO');
    }
  }

  async obterFila(estabelecimentoId: string): Promise<Result<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>> {
    try {
      const resposta = await api.estabelecimentos.obterFila(estabelecimentoId);
      return resposta;
    } catch (error) {
      return handleApiError<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>(error, 'ERRO_CONEXAO');
    }
  }

  async sairDaFila(estabelecimentoId: string, nome: string): Promise<Result<void>> {
    try {
      const resposta = await api.estabelecimentos.sairDaFila(estabelecimentoId, nome);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async listarServicos(estabelecimentoId: string): Promise<Result<Servico[]>> {
    try {
      const resposta = await api.estabelecimentos.listarServicos(estabelecimentoId);
      return resposta;
    } catch (error) {
      return handleApiError<Servico[]>(error, 'ERRO_CONEXAO');
    }
  }

  async listarGaleria(estabelecimentoId: string): Promise<Result<ItemGaleria[]>> {
    try {
      const resposta = await api.estabelecimentos.listarGaleria(estabelecimentoId);
      return resposta;
    } catch (error) {
      return handleApiError<ItemGaleria[]>(error, 'ERRO_CONEXAO');
    }
  }

  async listarAvaliacoes(estabelecimentoId: string): Promise<Result<Avaliacao[]>> {
    try {
      const resposta = await api.estabelecimentos.listarAvaliacoes(estabelecimentoId);
      return resposta;
    } catch (error) {
      return handleApiError<Avaliacao[]>(error, 'ERRO_CONEXAO');
    }
  }

  async adicionarAvaliacao(estabelecimentoId: string, nota: number, comentario: string, nomeCliente: string): Promise<Result<Avaliacao>> {
    try {
      const resposta = await apiAdicionarAvaliacao(estabelecimentoId, {
        nomeCliente,
        estrelas: nota,
        comentario,
        data: new Date().toISOString().split('T')[0],
      });
      return resposta;
    } catch (error) {
      return handleApiError<Avaliacao>(error, 'ERRO_CONEXAO');
    }
  }

  async curtirPublicacao(publicacaoId: string, usuarioEmail: string): Promise<Result<{ curtido: boolean; total: number }>> {
    try {
      const resposta = await api.feed.curtir(publicacaoId, usuarioEmail);
      return resposta;
    } catch (error) {
      return handleApiError<{ curtido: boolean; total: number }>(error, 'ERRO_CONEXAO');
    }
  }

  async salvarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<Result<{ salvo: boolean }>> {
    try {
      const resposta = await api.feed.salvar(publicacaoId, usuarioEmail);
      return resposta;
    } catch (error) {
      return handleApiError<{ salvo: boolean }>(error, 'ERRO_CONEXAO');
    }
  }

  async compartilharPublicacao(publicacaoId: string): Promise<Result<void>> {
    try {
      const resposta = await api.feed.compartilhar(publicacaoId);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async denunciarPublicacao(publicacaoId: string, motivo: string): Promise<Result<void>> {
    try {
      const resposta = await api.feed.denunciar(publicacaoId, motivo);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  // ============================================================================
  // GESTÃO (BARBEIRO)
  // ============================================================================

  async obterGestao(estabelecimentoId: string): Promise<Result<Estabelecimento>> {
    try {
      const resposta = await api.estabelecimentos.obter(estabelecimentoId);
      if (!resposta.sucesso || !resposta.dados) {
        return { sucesso: false, erro: resposta.erro || 'Estabelecimento não encontrado' };
      }
      return { sucesso: true, dados: resposta.dados };
    } catch (error) {
      return handleApiError<Estabelecimento>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<Result<Estabelecimento>> {
    try {
      const resposta = await api.estabelecimentos.atualizar(id, dados);
      return resposta;
    } catch (error) {
      return handleApiError<Estabelecimento>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarTema(id: string, tema: TemaInput): Promise<Result<Estabelecimento>> {
    try {
      const resposta = await api.estabelecimentos.atualizarTema(id, tema);
      return resposta;
    } catch (error) {
      return handleApiError<Estabelecimento>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarHorario(id: string, horario: string): Promise<Result<Estabelecimento>> {
    try {
      const resposta = await api.estabelecimentos.atualizarHorario(id, horario);
      return resposta;
    } catch (error) {
      return handleApiError<Estabelecimento>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarConfiguracaoPix(id: string, config: ConfiguracaoPixInput): Promise<Result<ConfiguracaoPix>> {
    try {
      const resposta = await api.estabelecimentos.atualizarConfiguracaoPix(id, config);
      return resposta;
    } catch (error) {
      return handleApiError<ConfiguracaoPix>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarMensagensAutomaticas(id: string, mensagens: MensagensAutomaticasInput): Promise<Result<MensagemAutomatica>> {
    try {
      const resposta = await api.estabelecimentos.atualizarMensagensAutomaticas(id, mensagens);
      return resposta;
    } catch (error) {
      return handleApiError<MensagemAutomatica>(error, 'ERRO_CONEXAO');
    }
  }

  // Serviços
  async adicionarServico(estabelecimentoId: string, servico: ServicoInput): Promise<Result<Servico>> {
    try {
      const resposta = await api.estabelecimentos.criarServico(estabelecimentoId, servico);
      return resposta;
    } catch (error) {
      return handleApiError<Servico>(error, 'ERRO_CONEXAO');
    }
  }

  async atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<Result<Servico>> {
    try {
      const resposta = await api.estabelecimentos.atualizarServico(estabelecimentoId, servicoId, dados);
      return resposta;
    } catch (error) {
      return handleApiError<Servico>(error, 'ERRO_CONEXAO');
    }
  }

  async excluirServico(estabelecimentoId: string, servicoId: string): Promise<Result<void>> {
    try {
      const resposta = await api.estabelecimentos.excluirServico(estabelecimentoId, servicoId);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<Result<Servico[]>> {
    try {
      const resposta = await api.estabelecimentos.reordenarServicos(estabelecimentoId, servicoIds);
      return resposta;
    } catch (error) {
      return handleApiError<Servico[]>(error, 'ERRO_CONEXAO');
    }
  }

  // Galeria
  async adicionarGaleria(estabelecimentoId: string, item: GaleriaItemInput): Promise<Result<ItemGaleria>> {
    try {
      const resposta = await api.estabelecimentos.adicionarMidiaGaleria(estabelecimentoId, item);
      return resposta;
    } catch (error) {
      return handleApiError<ItemGaleria>(error, 'ERRO_CONEXAO');
    }
  }

  async removerGaleria(estabelecimentoId: string, itemId: string): Promise<Result<void>> {
    try {
      const resposta = await api.estabelecimentos.removerMidiaGaleria(estabelecimentoId, itemId);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<Result<ItemGaleria[]>> {
    try {
      const resposta = await api.estabelecimentos.reordenarGaleria(estabelecimentoId, itemIds);
      return resposta;
    } catch (error) {
      return handleApiError<ItemGaleria[]>(error, 'ERRO_CONEXAO');
    }
  }

  // Avaliações
  async responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<Result<Avaliacao>> {
    try {
      const respostaApi = await api.estabelecimentos.responderAvaliacao(estabelecimentoId, avaliacaoId, resposta);
      return respostaApi;
    } catch (error) {
      return handleApiError<Avaliacao>(error, 'ERRO_CONEXAO');
    }
  }

  // ============================================================================
  // ADMIN
  // ============================================================================

  async listarTodos(filtros?: FiltrosEstabelecimento): Promise<Result<Estabelecimento[]>> {
    try {
      const resposta = await api.admin.listarEstabelecimentos();
      if (!resposta.sucesso) {
        return { sucesso: false, erro: resposta.erro || 'Erro ao listar estabelecimentos' };
      }
      let resultado = resposta.dados || [];
      if (filtros) {
        if (filtros.busca) {
          const busca = filtros.busca.toLowerCase();
          resultado = resultado.filter((e) =>
            e.nome.toLowerCase().includes(busca) ||
            e.cidade.toLowerCase().includes(busca) ||
            e.responsavel.toLowerCase().includes(busca)
          );
        }
        if (filtros.nicho !== 'todos') {
          resultado = resultado.filter((e) => e.nicho === filtros.nicho);
        }
        if (filtros.cidade) {
          resultado = resultado.filter((e) => e.cidade.toLowerCase().includes(filtros.cidade!.toLowerCase()));
        }
        if (filtros.apenasAbertos) {
          resultado = resultado.filter((e) => e.status === 'aprovado');
        }
      }
      return { sucesso: true, dados: resultado };
    } catch (error) {
      return handleApiError<Estabelecimento[]>(error, 'ERRO_CONEXAO');
    }
  }

  async alterarStatus(id: string, status: 'aprovado' | 'pendente' | 'rejeitado'): Promise<Result<void>> {
    try {
      let resposta;
      switch (status) {
        case 'aprovado':
          resposta = await api.admin.aprovarEstabelecimento(id);
          break;
        case 'rejeitado':
          resposta = await api.admin.rejeitarEstabelecimento(id);
          break;
        default:
          resposta = await api.admin.suspenderEstabelecimento(id);
      }
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }

  async excluir(id: string): Promise<Result<void>> {
    try {
      const resposta = await api.estabelecimentos.excluir(id);
      return resposta;
    } catch (error) {
      return handleApiError<void>(error, 'ERRO_CONEXAO');
    }
  }
}

/** Instância singleton (padrão) */
export const estabelecimentoService = new EstabelecimentoService();

/** Factory para injeção de dependência (testes, mocks) */
export function createEstabelecimentoService(): IEstabelecimentoService {
  return new EstabelecimentoService();
}