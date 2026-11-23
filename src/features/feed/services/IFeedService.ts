/**
 * Interface de contrato para serviço de feed/publicações (DIP).
 */

import type { Publicacao, TipoMidia, ResultadoServico } from '@/tipos';

export interface IFeedService {
  // Listagem
  listar(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>>;
  obter(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>>;
  obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>>;

  // CRUD
  criar(dados: {
    estabelecimentoId: string;
    tipo: TipoMidia;
    src: string;
    legenda: string;
    tagServico?: string;
  }): Promise<ResultadoServico<Publicacao>>;
  excluir(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>>;

  // Interações
  curtir(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>>;
  salvar(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>>;
  compartilhar(publicacaoId: string): Promise<ResultadoServico<void>>;
  denunciar(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>>;
}