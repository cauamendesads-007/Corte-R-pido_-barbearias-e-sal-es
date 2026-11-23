/**
 * Implementação Mock do IFeedService.
 */

import { IFeedService } from './IFeedService';
import type { Publicacao, TipoMidia, ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

export class FeedServiceMock implements IFeedService {
  async listar(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>> {
    await simularLatencia();
    simularErroAleatorio();

    let resultados = [...estadoGlobal.publicacoes].sort((a, b) => b.dataCriacao - a.dataCriacao);

    if (filtros.estabelecimentoId) {
      resultados = resultados.filter((p) => p.estabelecimentoId === filtros.estabelecimentoId);
    }

    if (filtros.usuarioEmail && filtros.filtro === 'salvos') {
      const usuario = estadoGlobal.usuarios.find((u) => u.email === filtros.usuarioEmail);
      if (usuario) {
        resultados = resultados.filter((p) => usuario.inspiracoesSalvas.includes(p.id));
      }
    }

    return sucesso(resultados);
  }

  async obter(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>> {
    await simularLatencia();
    simularErroAleatorio();

    const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
    return sucesso(pub ? { ...pub } : null);
  }

  async obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>> {
    await simularLatencia();
    simularErroAleatorio();

    const usuario = estadoGlobal.usuarios.find((u) => u.email === usuarioEmail);
    if (!usuario) return sucesso([]);

    const salvas = estadoGlobal.publicacoes.filter((p) => usuario.inspiracoesSalvas.includes(p.id));
    return sucesso(salvas.sort((a, b) => b.dataCriacao - a.dataCriacao));
  }

  async criar(dados: {
    estabelecimentoId: string;
    tipo: TipoMidia;
    src: string;
    legenda: string;
    tagServico?: string;
  }): Promise<ResultadoServico<Publicacao>> {
    await simularLatencia();
    simularErroAleatorio();

    const est = estadoGlobal.estabelecimentos.find((e) => e.id === dados.estabelecimentoId);
    if (!est) return falha('Estabelecimento não encontrado.');

    const nova: Publicacao = {
      ...dados,
      id: `pub-${gerarId()}`,
      curtidas: [],
      salvos: [],
      comentarios: [],
      visualizacoes: 0,
      compartilhamentos: 0,
      dataCriacao: Date.now(),
    };

    estadoGlobal.publicacoes.unshift(nova);
    persistirEstado();

    // Notificar seguidores
    const seguidores = estadoGlobal.usuarios.filter((u) => u.seguindo.includes(dados.estabelecimentoId));
    seguidores.forEach((s) => {
      estadoGlobal.notificacoes.push({
        id: `notif-${gerarId()}`,
        destinatario: s.email,
        tipo: 'mensagem',
        titulo: `Nova publicação de ${est?.nome}`,
        texto: dados.legenda.slice(0, 100),
        lida: false,
        dataCriacao: Date.now(),
        estabelecimentoId: dados.estabelecimentoId,
      });
    });
    persistirEstado();

    return sucesso(nova);
  }

  async excluir(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.publicacoes.findIndex((p) => p.id === publicacaoId && p.estabelecimentoId === estabelecimentoId);
    if (idx === -1) return falha('Publicação não encontrada ou não autorizado.');

    estadoGlobal.publicacoes.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async curtir(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
    await simularLatencia();
    simularErroAleatorio();

    const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
    if (!pub) return falha('Publicação não encontrada.');

    const idx = pub.curtidas.indexOf(usuarioEmail);
    let curtido: boolean;
    if (idx >= 0) {
      pub.curtidas.splice(idx, 1);
      curtido = false;
    } else {
      pub.curtidas.push(usuarioEmail);
      curtido = true;
    }

    persistirEstado();
    return sucesso({ curtido, total: pub.curtidas.length });
  }

  async salvar(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
    await simularLatencia();
    simularErroAleatorio();

    const usuario = estadoGlobal.usuarios.find((u) => u.email === usuarioEmail);
    if (!usuario) return falha('Usuário não encontrado.');

    const idx = usuario.inspiracoesSalvas.indexOf(publicacaoId);
    let salvo: boolean;
    if (idx >= 0) {
      usuario.inspiracoesSalvas.splice(idx, 1);
      salvo = false;
    } else {
      usuario.inspiracoesSalvas.push(publicacaoId);
      salvo = true;
    }

    persistirEstado();
    return sucesso({ salvo });
  }

  async compartilhar(publicacaoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
    if (pub) {
      pub.compartilhamentos++;
      persistirEstado();
    }
    return sucesso(undefined);
  }

  async denunciar(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    console.log(`[MOCK] Publicação ${publicacaoId} denunciada: ${motivo}`);
    return sucesso(undefined);
  }
}