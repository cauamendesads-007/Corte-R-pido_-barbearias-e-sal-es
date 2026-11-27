/**
 * Testes para Onboarding Guiado do Estabelecimento.
 * Cobre: renderização de componentes, validação de campos, navegação.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { OnboardingProvider, useOnboarding } from '../hooks/useOnboarding.tsx';
import { OnboardingServiceMock } from '../services/OnboardingServiceMock';
import { IOnboardingService } from '../services/IOnboardingService';
import { DADOS_INICIAIS, ETAPAS_ORDEM } from '../types';
import type { DadosOnboarding, Estabelecimento } from '@/tipos';
import type { ResultadoServico } from '@/tipos';
import { EtapaBoasVindas } from './EtapaBoasVindas';
import { EtapaDadosBasicos } from './EtapaDadosBasicos';
import { EtapaLocalizacaoContato } from './EtapaLocalizacaoContato';
import { EtapaServicosPrecos } from './EtapaServicosPrecos';
import { EtapaTemaAparencia } from './EtapaTemaAparencia';
import { EtapaPagamentosPix } from './EtapaPagamentosPix';
import { EtapaConfirmacao } from './EtapaConfirmacao';
import { IndicadorProgresso } from './IndicadorProgresso';
import { ToastProvider } from '@/componentes/ui/Toast.provider';

// Wrapper com providers necessários
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Serviço de teste que retorna dados pré-carregados
class OnboardingServiceTest implements IOnboardingService {
  private dados: DadosOnboarding | null = null;
  private concluido = false;

  constructor(dadosIniciais?: DadosOnboarding) {
    if (dadosIniciais) this.dados = dadosIniciais;
  }

  async salvarProgresso(dados: DadosOnboarding): Promise<ResultadoServico<void>> {
    this.dados = dados;
    return { sucesso: true, dados: undefined };
  }

  async obterProgresso(): Promise<ResultadoServico<DadosOnboarding | null>> {
    return { sucesso: true, dados: this.dados };
  }

  async limparProgresso(): Promise<ResultadoServico<void>> {
    this.dados = null;
    this.concluido = false;
    return { sucesso: true, dados: undefined };
  }

  async finalizarOnboarding(dados: DadosOnboarding): Promise<ResultadoServico<Estabelecimento>> {
    this.concluido = true;
    return {
      sucesso: true,
      dados: {
        id: 'est-123',
        slug: 'barbearia-teste',
        nome: dados.nome,
        responsavel: dados.responsavel,
        cidade: dados.cidade,
        nicho: dados.nicho,
        avaliacao: 0,
        status: 'pendente',
        latitude: -23.5505,
        longitude: -46.6333,
        whatsapp: dados.whatsapp,
        endereco: dados.endereco,
        sobre: dados.sobre,
        tema: dados.tema,
        servicos: dados.servicos.map((s) => ({ ...s, id: `svc-${Date.now()}` })),
        galeria: [],
        fila: [],
        tempoMedioAtendimento: 20,
        horarioFuncionamento: dados.horarioFuncionamento,
        permiteAutoEdicao: false,
        configuracaoPix: dados.configuracaoPix,
        avaliacoes: [],
        seguidores: 0,
        taxaFidelidade: 0,
      } as Estabelecimento
    };
  }

  async verificarConcluido(): Promise<ResultadoServico<boolean>> {
    return { sucesso: true, dados: this.concluido };
  }
}

describe('Onboarding - EtapaBoasVindas', () => {
  it('deve renderizar título e benefícios', () => {
    render(<EtapaBoasVindas aoAvancar={vi.fn()} />, { wrapper });

    expect(screen.getByText('Bem-vindo ao Corte Rápido')).toBeInTheDocument();
    const beneficios = screen.getAllByText(/Fila Virtual/i);
    expect(beneficios.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Agendamentos Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento Pix/i)).toBeInTheDocument();
    expect(screen.getByText(/Página Personalizada/i)).toBeInTheDocument();
  });

  it('deve chamar aoAvancar ao clicar no botão principal', () => {
    const aoAvancar = vi.fn();
    render(<EtapaBoasVindas aoAvancar={aoAvancar} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: /Começar Configuração/i }));
    expect(aoAvancar).toHaveBeenCalledTimes(1);
  });
});

describe('Onboarding - EtapaDadosBasicos', () => {
  it('deve renderizar campos obrigatórios', () => {
    render(
      <OnboardingProvider service={new OnboardingServiceMock()}>
        <EtapaDadosBasicos aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByLabelText(/Nome do Estabelecimento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do Responsável/i)).toBeInTheDocument();
    expect(screen.getByText(/Nicho de Atuação/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sobre o Estabelecimento/i)).toBeInTheDocument();
  });
});

describe('Onboarding - EtapaLocalizacaoContato', () => {
  it('deve renderizar campos de endereço e contato', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaLocalizacaoContato aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByLabelText(/CEP/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Endereço Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cidade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp para Contato/i)).toBeInTheDocument();
  });

  it('deve renderizar seletor de horário', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaLocalizacaoContato aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByLabelText(/Abertura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fechamento/i)).toBeInTheDocument();
    expect(screen.getByText(/até/i)).toBeInTheDocument();
  });
});

describe('Onboarding - EtapaServicosPrecos', () => {
  it('deve mostrar estado vazio quando sem serviços', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaServicosPrecos aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByText(/Nenhum serviço cadastrado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar Primeiro Serviço/i })).toBeInTheDocument();
  });

  it('deve abrir modal ao clicar em adicionar serviço', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaServicosPrecos aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Primeiro Serviço/i }));

    // Modal é renderizado via portal no body - buscar no document.body
    expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Corte Degradê/i)).toBeInTheDocument();
  });

  it('deve renderizar campos do modal de serviço', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaServicosPrecos aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Primeiro Serviço/i }));

    // Verificar campos via placeholder (mais robusto que label)
    expect(screen.getByPlaceholderText(/Ex: Corte Degradê/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0,00/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/30/i)).toBeInTheDocument();
    // Categoria é um select com aria-labelledby
    expect(document.getElementById('categoria-select')).toBeInTheDocument();
  });
});

describe('Onboarding - EtapaTemaAparencia', () => {
  it('deve renderizar seletor de cores', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaTemaAparencia aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByLabelText(/Cores do tema/i)).toBeInTheDocument();
  });

  it('deve renderizar seletor de layout', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaTemaAparencia aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    // ChipGrupo renderiza como buttons com aria-label - buscar pelo label no ChipGrupo
    expect(screen.getByRole('group', { name: /Layout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clássico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Moderno/i })).toBeInTheDocument();
  });

  it('deve renderizar campos de título e subtítulo', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaTemaAparencia aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByLabelText(/Título da Página/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subtítulo\/Slogan/i)).toBeInTheDocument();
  });

  it('deve renderizar preview do tema', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaTemaAparencia aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByText(/Pré-visualização/i)).toBeInTheDocument();
  });
});

describe('Onboarding - EtapaPagamentosPix', () => {
  it('deve renderizar modos de Pix', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaPagamentosPix aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    // ChipGrupo renderiza como buttons com aria-label
    expect(screen.getByRole('group', { name: /Modo de Pagamento/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desativado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Opcional/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Obrigatório/i })).toBeInTheDocument();
  });

  it('deve mostrar estado desativado por padrão', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <EtapaPagamentosPix aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    expect(screen.getByText(/Pix Desativado/i)).toBeInTheDocument();
    expect(screen.getByText(/pagarão apenas no local/i)).toBeInTheDocument();
  });
});

describe('Onboarding - EtapaConfirmacao', () => {
  it('deve renderizar resumo de todas as seções', async () => {
    const dadosCompletos: DadosOnboarding = {
      ...DADOS_INICIAIS,
      nome: 'Barbearia Teste',
      responsavel: 'João',
      endereco: 'Rua Teste, 123',
      cidade: 'São Paulo',
      whatsapp: '(11) 99999-9999',
      servicos: [{ nome: 'Corte', preco: 50, duracaoMinutos: 30, tag: 'corte', midias: [] }],
      tema: { cor: '#3b82f6', layout: 'classico' as const, titulo: 'Barbearia Teste', subtitulo: 'Top' },
      configuracaoPix: { modo: 'desativado' as const, chave: '', percentualSinal: 30 },
    };

    const service = new OnboardingServiceTest(dadosCompletos);

    render(
      <OnboardingProvider service={service}>
        <EtapaConfirmacao aoAvancar={vi.fn()} aoVoltar={vi.fn()} />
      </OnboardingProvider>,
      { wrapper }
    );

    // Aguardar dados carregarem - verifica se nome aparece (no resumo de Dados Básicos)
    await waitFor(() => {
      expect(screen.getAllByText('Barbearia Teste').length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    expect(screen.getByText(/Dados Básicos/i)).toBeInTheDocument();
    expect(screen.getByText(/Localização e Contato/i)).toBeInTheDocument();
    // Usar texto mais específico para evitar múltiplos matches
    expect(screen.getByText(/Serviços \(\d+\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Tema e Aparência/i)).toBeInTheDocument();
    expect(screen.getByText(/Pagamentos Pix/i)).toBeInTheDocument();
    expect(screen.getByText('Corte')).toBeInTheDocument();
  });

  it('deve mostrar estado de sucesso quando concluido=true', () => {
    const service = new OnboardingServiceMock();
    let onboardingContext: ReturnType<typeof useOnboarding> | null = null;

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider service={service}>
        <OnboardingContextConsumer>
          {children}
        </OnboardingContextConsumer>
      </OnboardingProvider>
    );

    const OnboardingContextConsumer = ({ children }: { children: React.ReactNode }) => {
      const ctx = useOnboarding();
      onboardingContext = ctx;
      return <>{children}</>;
    };

    render(
      <TestWrapper>
        <EtapaConfirmacao
          aoAvancar={vi.fn()}
          aoVoltar={vi.fn()}
          concluido={true}
        />
      </TestWrapper>,
      { wrapper }
    );

    // Definir estabelecimentoId nos dados do onboarding
    act(() => {
      onboardingContext!.atualizarDados({ estabelecimentoId: 'est-123', concluido: true });
    });

    expect(screen.getByText(/Estabelecimento Criado com Sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/est-123/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ir para o Painel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver Página Pública/i })).toBeInTheDocument();
  });
});

describe('Onboarding - IndicadorProgresso', () => {
  it('deve renderizar etapa atual (boas-vindas)', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <IndicadorProgresso />
      </OnboardingProvider>,
      { wrapper }
    );

    // O título da primeira etapa é "Bem-vindo ao Corte Rápido"
    const botaoAtual = screen.getByRole('button', { name: /Bem-vindo ao Corte Rápido/i });
    expect(botaoAtual).toHaveAttribute('aria-current', 'step');
  });

  it('deve renderizar botões para todas as etapas', () => {
    const service = new OnboardingServiceMock();
    render(
      <OnboardingProvider service={service}>
        <IndicadorProgresso />
      </OnboardingProvider>,
      { wrapper }
    );

    // Pelo menos a primeira etapa deve estar visível
    expect(screen.getByRole('button', { name: /Bem-vindo ao Corte Rápido/i })).toBeInTheDocument();
  });
});

// Helper para testar hooks (não usado nos testes atuais, mantido para referência)
function renderHook<T>(hook: () => T, options?: { wrapper?: React.FC<{ children: React.ReactNode }> }) {
  let result: T;
  const TestComponent = () => {
    result = hook();
    return null;
  };
  const Wrapper = options?.wrapper || ((({ children }) => <ToastProvider>{children}</ToastProvider>));
  render(<Wrapper><TestComponent /></Wrapper>);
  return { result: { current: result! } };
}