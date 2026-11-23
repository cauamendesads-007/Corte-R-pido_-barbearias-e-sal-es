/**
 * Implementação Mock do INotificacoesService.
 */

import { INotificacoesService } from './INotificacoesService';
import type { Notificacao, ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso, falha } from '@/servicos/api';

export class NotificacoesServiceMock implements INotificacoesService {
  async listar(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>> {
    await simularLatencia();
    simularErroAleatorio();

    let resultados = estadoGlobal.notificacoes.filter((n) => n.destinatario === usuarioEmail);

    if (filtro === 'nao-lidas') {
      resultados = resultados.filter((n) => !n.lida);
    } else if (filtro === 'lidas') {
      resultados = resultados.filter((n) => n.lida);
    }

    resultados.sort((a, b) => b.dataCriacao - a.dataCriacao);
    return sucesso(resultados);
  }

  async marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.notificacoes.findIndex((n) => n.id === notificacaoId);
    if (idx === -1) return falha('Notificação não encontrada.');

    estadoGlobal.notificacoes[idx] = { ...estadoGlobal.notificacoes[idx], lida: true };
    persistirEstado();

    return sucesso(undefined);
  }

  async marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    estadoGlobal.notificacoes
      .filter((n) => n.destinatario === usuarioEmail && !n.lida)
      .forEach((n) => {
        n.lida = true;
      });
    persistirEstado();

    return sucesso(undefined);
  }

  async excluir(notificacaoId: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    const idx = estadoGlobal.notificacoes.findIndex((n) => n.id === notificacaoId);
    if (idx === -1) return falha('Notificação não encontrada.');

    estadoGlobal.notificacoes.splice(idx, 1);
    persistirEstado();

    return sucesso(undefined);
  }

  async excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();

    estadoGlobal.notificacoes = estadoGlobal.notificacoes.filter(
      (n) => !(n.destinatario === usuarioEmail && n.lida)
    );
    persistirEstado();

    return sucesso(undefined);
  }

  async enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    await simularLatencia();
    simularErroAleatorio();

    let enviadas = 0;
    const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);

    for (const email of destinatarios) {
      const usuario = estadoGlobal.usuarios.find((u) => u.email === email);
      if (usuario) {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: email,
          tipo: 'mensagem',
          titulo: `Mensagem de ${est?.nome}`,
          texto,
          lida: false,
          dataCriacao: Date.now(),
          estabelecimentoId,
        });
        enviadas++;
      }
    }
    persistirEstado();

    return sucesso(enviadas);
  }

  async enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
    await simularLatencia();
    simularErroAleatorio();

    let enviadas = 0;
    for (const email of destinatarios) {
      const usuario = estadoGlobal.usuarios.find((u) => u.email === email && u.papel === 'barbeiro');
      if (usuario) {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: email,
          tipo: 'administracao',
          titulo: 'Aviso da plataforma',
          texto,
          lida: false,
          dataCriacao: Date.now(),
        });
        enviadas++;
      }
    }
    persistirEstado();

    return sucesso(enviadas);
  }
}