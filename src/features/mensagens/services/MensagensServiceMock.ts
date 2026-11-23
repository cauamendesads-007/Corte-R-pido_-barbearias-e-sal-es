/**
 * Implementação Mock do IMensagensService.
 */

import { IMensagensService } from './IMensagensService';
import type { ResultadoServico } from '@/tipos';
import { estadoGlobal, simularLatencia, simularErroAleatorio, gerarId, persistirEstado, sucesso } from '@/servicos/api';

export class MensagensServiceMock implements IMensagensService {
  async listarConversas(_usuarioEmail: string): Promise<ResultadoServico<Array<{ id: string; participante: string; ultimaMensagem: string; data: number; naoLidas: number }>>> {
    await simularLatencia();
    simularErroAleatorio();

    // Mock simples - em produção buscaria de uma tabela de conversas
    const conversas = [
      {
        id: 'conv-1',
        participante: 'João Cliente',
        ultimaMensagem: 'Olá, gostaria de agendar',
        data: Date.now() - 3600000,
        naoLidas: 1,
      },
      {
        id: 'conv-2',
        participante: 'Maria Silva',
        ultimaMensagem: 'Obrigada pelo corte!',
        data: Date.now() - 7200000,
        naoLidas: 0,
      },
    ];

    return sucesso(conversas);
  }

  async obterMensagens(_conversaId: string): Promise<ResultadoServico<Array<{ id: string; remetente: string; texto: string; data: number; lida: boolean }>>> {
    await simularLatencia();
    simularErroAleatorio();

    const mensagens = [
      { id: 'msg-1', remetente: 'João Cliente', texto: 'Olá, gostaria de agendar', data: Date.now() - 3600000, lida: false },
      { id: 'msg-2', remetente: 'Barbeiro', texto: 'Olá! Qual serviço?', data: Date.now() - 3500000, lida: true },
    ];

    return sucesso(mensagens);
  }

  async enviarMensagem(_conversaId: string, _texto: string): Promise<ResultadoServico<void>> {
    await simularLatencia();
    simularErroAleatorio();
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