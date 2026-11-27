/**
 * Implementação Mock do IOnboardingService.
 * Usa localStorage para persistir progresso do onboarding.
 */

import { IOnboardingService } from './IOnboardingService';
import type { DadosOnboarding } from '../types';
import type { Estabelecimento, ResultadoServico } from '@/tipos';
import { sucesso, falha, gerarId } from '@/servicos/api';

const CHAVE_STORAGE = 'corte-rapido-onboarding-progresso';
const CHAVE_CONCLUIDO = 'corte-rapido-onboarding-concluido';

export class OnboardingServiceMock implements IOnboardingService {
  async salvarProgresso(dados: DadosOnboarding): Promise<ResultadoServico<void>> {
    try {
      // Simular latência de rede
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dadosParaSalvar = {
        ...dados,
        servicos: dados.servicos.map((s: typeof dados.servicos[0]) => ({ ...s })),
        tema: { ...dados.tema },
        configuracaoPix: { ...dados.configuracaoPix },
      };

      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dadosParaSalvar));
      return sucesso(undefined);
    } catch (erro) {
      return falha('Erro ao salvar progresso do onboarding.');
    }
  }

  async obterProgresso(): Promise<ResultadoServico<DadosOnboarding | null>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const salvo = localStorage.getItem(CHAVE_STORAGE);
      if (!salvo) return sucesso(null);

      const dados = JSON.parse(salvo) as DadosOnboarding;
      return sucesso(dados);
    } catch (erro) {
      return falha('Erro ao recuperar progresso do onboarding.');
    }
  }

  async limparProgresso(): Promise<ResultadoServico<void>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      localStorage.removeItem(CHAVE_STORAGE);
      localStorage.removeItem(CHAVE_CONCLUIDO);
      return sucesso(undefined);
    } catch (erro) {
      return falha('Erro ao limpar progresso do onboarding.');
    }
  }

  async finalizarOnboarding(dados: DadosOnboarding): Promise<ResultadoServico<Estabelecimento>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Validar dados obrigatórios
      const erros = this.validarDadosCompletos(dados);
      if (erros.length > 0) {
        return falha(erros.join('; '));
      }

      // Gerar slug único
      let slug = dados.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Verificar se slug já existe (em produção faria query no banco)
      const estabelecimentosSalvos = JSON.parse(localStorage.getItem('corte-rapido-estabelecimentos') || '[]');
      let contador = 1;
      const slugBase = slug;
      while (estabelecimentosSalvos.some((e: Estabelecimento) => e.slug === slug)) {
        slug = `${slugBase}-${contador}`;
        contador++;
      }

      // Criar estabelecimento completo
      const novoEstabelecimento: Estabelecimento = {
        id: `est-${gerarId()}`,
        slug,
        nome: dados.nome,
        responsavel: dados.responsavel,
        cidade: dados.cidade,
        nicho: dados.nicho,
        avaliacao: 0,
        status: 'pendente',
        latitude: dados.latitude ?? -23.5505,
        longitude: dados.longitude ?? -46.6333,
        whatsapp: dados.whatsapp,
        endereco: dados.endereco,
        sobre: dados.sobre,
        tema: dados.tema,
        servicos: dados.servicos.map((s: typeof dados.servicos[0]) => ({ ...s, id: `svc-${gerarId()}` })),
        galeria: [],
        fila: [],
        tempoMedioAtendimento: 20,
        horarioFuncionamento: dados.horarioFuncionamento,
        permiteAutoEdicao: false,
        configuracaoPix: dados.configuracaoPix,
        avaliacoes: [],
        seguidores: 0,
        taxaFidelidade: 0,
      };

      // Salvar estabelecimento
      estabelecimentosSalvos.push(novoEstabelecimento);
      localStorage.setItem('corte-rapido-estabelecimentos', JSON.stringify(estabelecimentosSalvos));

      // Marcar onboarding como concluído
      localStorage.setItem(CHAVE_CONCLUIDO, 'true');
      localStorage.removeItem(CHAVE_STORAGE);

      return sucesso(novoEstabelecimento);
    } catch (erro) {
      return falha('Erro ao finalizar onboarding. Tente novamente.');
    }
  }

  async verificarConcluido(): Promise<ResultadoServico<boolean>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const concluido = localStorage.getItem(CHAVE_CONCLUIDO) === 'true';
      return sucesso(concluido);
    } catch (erro) {
      return falha('Erro ao verificar status do onboarding.');
    }
  }

  private validarDadosCompletos(dados: DadosOnboarding): string[] {
    const erros: string[] = [];

    if (!dados.nome?.trim()) erros.push('Nome do estabelecimento é obrigatório');
    if (!dados.responsavel?.trim()) erros.push('Nome do responsável é obrigatório');
    if (!dados.endereco?.trim()) erros.push('Endereço é obrigatório');
    if (!dados.cidade?.trim()) erros.push('Cidade é obrigatória');
    if (!dados.whatsapp?.trim()) erros.push('WhatsApp é obrigatório');
    if (dados.servicos.length === 0) erros.push('Pelo menos um serviço é obrigatório');

    // Validar serviços
    dados.servicos.forEach((s: typeof dados.servicos[0], i) => {
      if (!s.nome?.trim()) erros.push(`Serviço ${i + 1}: nome é obrigatório`);
      if (!s.preco || s.preco <= 0) erros.push(`Serviço ${i + 1}: preço deve ser maior que zero`);
      if (!s.duracaoMinutos || s.duracaoMinutos <= 0) erros.push(`Serviço ${i + 1}: duração deve ser maior que zero`);
    });

    // Validar Pix se modo não for desativado
    if (dados.configuracaoPix.modo !== 'desativado') {
      if (!dados.configuracaoPix.chave?.trim()) erros.push('Chave Pix é obrigatória quando Pix está ativo');
      if (!dados.configuracaoPix.percentualSinal || dados.configuracaoPix.percentualSinal < 10 || dados.configuracaoPix.percentualSinal > 100) {
        erros.push('Percentual de sinal deve ser entre 10% e 100%');
      }
    }

    return erros;
  }
}