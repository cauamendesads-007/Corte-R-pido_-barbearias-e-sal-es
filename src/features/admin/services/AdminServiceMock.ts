/**
 * Implementação Mock do IAdminService.
 */

import { IAdminService } from './IAdminService';
import type { Usuario, Estabelecimento, PlanoAssinatura, AssinaturaEstabelecimento, StatusEstabelecimento, PagamentoHistorico, ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

export class AdminServiceMock implements IAdminService {
  async listarUsuarios(): Promise<ResultadoServico<Usuario[]>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso([...estadoGlobal.usuarios]);
  }

  async obterUsuario(id: string): Promise<ResultadoServico<Usuario | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const usuario = estadoGlobal.usuarios.find((u) => u.id === id);
    return sucesso(usuario ? { ...usuario } : null);
  }

  async atualizarUsuario(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return falha('Usuário não encontrado.');

    estadoGlobal.usuarios[idx] = { ...estadoGlobal.usuarios[idx], ...dados };
    persistirEstado();

    return sucesso(estadoGlobal.usuarios[idx]);
  }

  async excluirUsuario(id: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.usuarios.findIndex((u) => u.id === id);
    if (idx === -1) return falha('Usuário não encontrado.');

    estadoGlobal.usuarios.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async listarEstabelecimentos(): Promise<ResultadoServico<Estabelecimento[]>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso([...estadoGlobal.estabelecimentos]);
  }

  async obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
    return sucesso(est ? { ...est } : null);
  }

  async aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], status: 'aprovado' };
    persistirEstado();

    return sucesso(undefined);
  }

  async rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], status: 'rejeitado' };
    persistirEstado();

    return sucesso(undefined);
  }

  async suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    // Status 'suspenso' não existe no tipo, usa 'rejeitado' como alternativa
    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], status: 'rejeitado' };
    persistirEstado();

    return sucesso(undefined);
  }

  async alterarStatusEstabelecimento(id: string, status: StatusEstabelecimento): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
    if (idx === -1) return falha('Estabelecimento não encontrado.');

    estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], status };
    persistirEstado();

    return sucesso(undefined);
  }

  async listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso([...estadoGlobal.planos]);
  }

  async obterPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
    return this.listarPlanos();
  }

  async criarPlano(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
    await simularLatencia();
    simularErroAleatorio();

    const novo: PlanoAssinatura = { ...dados, id: `plano-${gerarId()}` };
    estadoGlobal.planos.push(novo);
    persistirEstado();

    return sucesso(novo);
  }

  async atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.planos.findIndex((p) => p.id === planoId);
    if (idx === -1) return falha('Plano não encontrado.');

    estadoGlobal.planos[idx] = { ...estadoGlobal.planos[idx], ...dados };
    persistirEstado();

    return sucesso(estadoGlobal.planos[idx]);
  }

  async excluirPlano(planoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.planos.findIndex((p) => p.id === planoId);
    if (idx === -1) return falha('Plano não encontrado.');

    estadoGlobal.planos.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async listarAssinaturas(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>> {
    await simularLatencia();
    simularErroAleatorio();
    return sucesso({ ...estadoGlobal.assinaturas });
  }

  async listarPagamentos(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
    await simularLatencia();
    simularErroAleatorio();

    const pagamentos = Object.entries(estadoGlobal.assinaturas).flatMap(([estId, assinatura]) =>
      assinatura.historicoPagamentos.map((p: PagamentoHistorico) => ({
        estabelecimento: estId,
        data: new Date(p.data).toLocaleDateString('pt-BR'),
        valor: p.valor,
        status: 'pago',
      }))
    );

    return sucesso(pagamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));
  }
}