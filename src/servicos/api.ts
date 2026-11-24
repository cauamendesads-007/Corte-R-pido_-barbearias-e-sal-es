/**
 * Camada de serviços simulados (Mock API) para a aplicação Corte Rápido.
 * Simula chamadas HTTP com latência realista usando Promises e setTimeout.
 * Estruturada para fácil substituição por endpoints reais no futuro.
 */

import { gerarEstadoInicial } from '@/mocks/dados';
import type {
  Estabelecimento,
  Usuario,
  Agendamento,
  Publicacao,
  Notificacao,
  Servico,
  ItemGaleria,
  Avaliacao,
  FiltrosBusca,
  SessaoUsuario,
  ConfiguracaoPix,
  MensagemAutomatica,
  PlanoAssinatura,
  AssinaturaEstabelecimento,
  ResultadoServico,
  NichoEstabelecimento,
  StatusEstabelecimento,
  StatusAgendamento,
  Comentario,
  TipoLayout,
} from '@/tipos';
import { atrasar, clonarProfundo, gerarId, formatarMoeda, formatarParaExibicao, calcularDistanciaKm } from '@/utilitarios';
import type { EstadoGlobal } from '@/tipos';

// Estado global simulado (em memória)
let estadoGlobal = gerarEstadoInicial() as EstadoGlobal;

// Configuração de latência simulada (ms)
const LATENCIA_MIN = 300;
const LATENCIA_MAX = 800;
const TAXA_ERRO_SIMULADA = 0.05; // 5% de chance de erro aleatório

/** Simula latência de rede */
async function simularLatencia(): Promise<void> {
  const ms = Math.random() * (LATENCIA_MAX - LATENCIA_MIN) + LATENCIA_MIN;
  await atrasar(ms);
}

/** Simula falha aleatória de rede */
function simularErroAleatorio(): void {
  if (Math.random() < TAXA_ERRO_SIMULADA) {
    throw new Error('Erro de conexão. Tente novamente.');
  }
}

/** Cria resultado de sucesso padronizado */
function sucesso<T>(dados: T): ResultadoServico<T> {
  return { sucesso: true, dados };
}

/** Cria resultado de erro padronizado */
function falha(erro: string): ResultadoServico<never> {
  return { sucesso: false, erro };
}

/** Persiste estado no localStorage (simula banco) */
function persistirEstado(): void {
  try {
    localStorage.setItem('cr_estado_v1', JSON.stringify(estadoGlobal));
  } catch {
    // Ignora erro de storage cheio
  }
}

/** Carrega estado do localStorage */
function carregarEstado(): void {
  try {
    const salvo = localStorage.getItem('cr_estado_v1');
    if (salvo) {
      estadoGlobal = JSON.parse(salvo);
    }
  } catch {
    // Ignora erro de parse
  }
}

// Inicializa carregando do localStorage
carregarEstado();

// ============================================================================
// AUTENTICAÇÃO E SESSÃO
// ============================================================================

/** Entrar com e-mail e senha */
export async function entrar(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
  await simularLatencia();
  simularErroAleatorio();

  const usuario = estadoGlobal.usuarios.find(
    (u) => u.email === email && u.senha === senha && u.confirmado
  );

  if (!usuario) {
    return falha('E-mail ou senha inválidos, ou conta não confirmada.');
  }

  const sessao: SessaoUsuario = {
    papel: usuario.papel,
    email: usuario.email,
    estabelecimentoId: usuario.estabelecimentoId,
    nome: usuario.nome,
  };

  estadoGlobal.sessao = sessao;
  persistirEstado();

  return sucesso(sessao);
}

/** Cadastrar novo cliente */
export async function cadastrarCliente(dados: {
  nome: string;
  email: string;
  senha: string;
}): Promise<ResultadoServico<SessaoUsuario>> {
  await simularLatencia();
  simularErroAleatorio();

  if (estadoGlobal.usuarios.some((u) => u.email === dados.email)) {
    return falha('Este e-mail já está cadastrado.');
  }

  const novoUsuario: Usuario = {
    id: `usr-${gerarId()}`,
    email: dados.email,
    senha: dados.senha,
    papel: 'cliente',
    nome: dados.nome,
    confirmado: true, // Em produção: false até confirmação por e-mail
    lembretesWhatsapp: true,
    seguindo: [],
    inspiracoesSalvas: [],
  };

  estadoGlobal.usuarios.push(novoUsuario);
  persistirEstado();

  const sessao: SessaoUsuario = {
    papel: 'cliente',
    email: novoUsuario.email,
    nome: novoUsuario.nome,
  };
  estadoGlobal.sessao = sessao;
  persistirEstado();

  return sucesso(sessao);
}

/** Cadastrar novo profissional/estabelecimento */
export async function cadastrarProfissional(dados: {
  nomeEstabelecimento: string;
  responsavel: string;
  email: string;
  senha: string;
  cidade: string;
  endereco: string;
  whatsapp: string;
  nicho: NichoEstabelecimento;
}): Promise<ResultadoServico<{ estabelecimentoId: string }>> {
  await simularLatencia();
  simularErroAleatorio();

  if (estadoGlobal.usuarios.some((u) => u.email === dados.email)) {
    return falha('Este e-mail já está cadastrado.');
  }

  const slug = dados.nomeEstabelecimento
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const corNicho: Record<NichoEstabelecimento, string> = {
    barbearia: '#B45309',
    feminino: '#E8508A',
    visagismo: '#7C3AED',
    infantil: '#FB923C',
  };

  const novoEstabelecimento: Estabelecimento = {
    id: slug,
    slug,
    nome: dados.nomeEstabelecimento,
    responsavel: dados.responsavel,
    cidade: dados.cidade,
    nicho: dados.nicho,
    avaliacao: 0,
    status: 'pendente',
    latitude: -19.92,
    longitude: -43.94,
    whatsapp: dados.whatsapp,
    endereco: dados.endereco,
    sobre: 'Aguardando aprovação.',
    tema: {
      cor: corNicho[dados.nicho],
      layout: 'classico',
      titulo: dados.nomeEstabelecimento,
      subtitulo: 'Aguardando aprovação.',
    },
    servicos: [],
    galeria: [],
    fila: [],
    tempoMedioAtendimento: 20,
    horarioFuncionamento: 'Seg a Sáb, 9h às 18h',
    permiteAutoEdicao: false,
    configuracaoPix: {
      modo: 'desativado',
      chave: '',
      percentualSinal: 30,
    },
    avaliacoes: [],
    seguidores: 0,
    taxaFidelidade: 0,
  };

  const novoUsuario: Usuario = {
    id: `usr-${gerarId()}`,
    email: dados.email,
    senha: dados.senha,
    papel: 'barbeiro',
    nome: dados.responsavel,
    estabelecimentoId: slug,
    confirmado: false, // Aguarda aprovação do admin
    lembretesWhatsapp: true,
    seguindo: [],
    inspiracoesSalvas: [],
  };

  estadoGlobal.estabelecimentos.push(novoEstabelecimento);
  estadoGlobal.usuarios.push(novoUsuario);
  persistirEstado();

  return sucesso({ estabelecimentoId: slug });
}

/** Sair (logout) */
export async function sair(): Promise<ResultadoServico<void>> {
  await simularLatencia();
  estadoGlobal.sessao = null;
  persistirEstado();
  return sucesso(undefined);
}

/** Obter sessão atual */
export async function obterSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
  await simularLatencia();
  return sucesso(estadoGlobal.sessao);
}

/** Atualizar perfil do cliente */
export async function atualizarPerfilCliente(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao || sessao.papel !== 'cliente') {
    return falha('Não autorizado.');
  }

  const idx = estadoGlobal.usuarios.findIndex((u) => u.email === sessao.email);
  if (idx === -1) return falha('Usuário não encontrado.');

  estadoGlobal.usuarios[idx] = { ...estadoGlobal.usuarios[idx], ...dados };
  persistirEstado();

  return sucesso(estadoGlobal.usuarios[idx]);
}

/** Alterar senha */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao) return falha('Não autenticado.');

  const idx = estadoGlobal.usuarios.findIndex((u) => u.email === sessao.email);
  if (idx === -1) return falha('Usuário não encontrado.');

  if (estadoGlobal.usuarios[idx].senha !== senhaAtual) {
    return falha('Senha atual incorreta.');
  }

  estadoGlobal.usuarios[idx].senha = novaSenha;
  persistirEstado();

  return sucesso(undefined);
}

/** Excluir conta */
export async function excluirConta(): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao) return falha('Não autenticado.');

  estadoGlobal.usuarios = estadoGlobal.usuarios.filter((u) => u.email !== sessao.email);
  // Remove agendamentos, curtidas, etc.
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    estadoGlobal.agendamentos[estId] = estadoGlobal.agendamentos[estId].filter((a) => a.usuarioId !== sessao.email);
  });
  estadoGlobal.publicacoes.forEach((p) => {
    p.curtidas = p.curtidas.filter((id) => id !== sessao.email);
    p.salvos = p.salvos.filter((id) => id !== sessao.email);
  });

  estadoGlobal.sessao = null;
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// AUTENTICAÇÃO - FUNÇÕES AUXILIARES PARA API OBJECT
// ============================================================================

/** Validar token de sessão */
export async function validarToken(): Promise<ResultadoServico<SessaoUsuario | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao) return sucesso(null);

  // Em produção, validaria JWT. Aqui simula: token válido se sessão existe
  return sucesso(sessao);
}

/** Renovar sessão (alias para obterSessao) */
export async function renovarSessao(): Promise<ResultadoServico<SessaoUsuario | null>> {
  return obterSessao();
}

/** Recuperar senha (simulado) */
export async function recuperarSenha(email: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const usuario = estadoGlobal.usuarios.find((u) => u.email === email);
  if (!usuario) {
    // Por segurança, não revela se e-mail existe
    return sucesso(undefined);
  }

  // Em produção, enviaria e-mail com link de recuperação
  console.log(`[MOCK] E-mail de recuperação enviado para ${email}`);
  return sucesso(undefined);
}

/** Confirmar e-mail (simulado) */
export async function confirmarEmail(): Promise<ResultadoServico<SessaoUsuario | null>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, validaria token e confirmaria e-mail
  // Aqui simula: encontra usuário não confirmado e confirma
  const idx = estadoGlobal.usuarios.findIndex((u) => !u.confirmado);
  if (idx === -1) return falha('Token inválido ou expirado.');

  estadoGlobal.usuarios[idx].confirmado = true;
  persistirEstado();

  const sessao: SessaoUsuario = {
    papel: estadoGlobal.usuarios[idx].papel,
    email: estadoGlobal.usuarios[idx].email,
    estabelecimentoId: estadoGlobal.usuarios[idx].estabelecimentoId,
    nome: estadoGlobal.usuarios[idx].nome,
  };
  estadoGlobal.sessao = sessao;
  persistirEstado();

  return sucesso(sessao);
}

/** Login (alias para entrar) */
export async function login(email: string, senha: string): Promise<ResultadoServico<SessaoUsuario>> {
  return entrar(email, senha);
}

/** Cadastro unificado (cliente ou profissional) */
export async function cadastrar(dados: {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  tipo: 'cliente' | 'barbeiro';
  estabelecimentoId?: string;
  nomeEstabelecimento?: string;
  responsavel?: string;
  cidade?: string;
  endereco?: string;
  whatsapp?: string;
  nicho?: NichoEstabelecimento;
}): Promise<ResultadoServico<SessaoUsuario | { estabelecimentoId: string }>> {
  if (dados.tipo === 'cliente') {
    return cadastrarCliente({ nome: dados.nome, email: dados.email, senha: dados.senha });
  }
  return cadastrarProfissional({
    nomeEstabelecimento: dados.nomeEstabelecimento || '',
    responsavel: dados.responsavel || dados.nome,
    email: dados.email,
    senha: dados.senha,
    cidade: dados.cidade || '',
    endereco: dados.endereco || '',
    whatsapp: dados.whatsapp || '',
    nicho: dados.nicho || 'barbearia',
  });
}

// ============================================================================
// ESTABELECIMENTOS (MARKETPLACE / PÚBLICO)
// ============================================================================

/** Listar estabelecimentos com filtros */
export async function listarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
  await simularLatencia();
  simularErroAleatorio();

  let resultado = estadoGlobal.estabelecimentos.filter((e) => e.status === 'aprovado');

  if (filtros.nicho !== 'todos') {
    resultado = resultado.filter((e) => e.nicho === filtros.nicho);
  }

  resultado = resultado.filter((e) => {
    const precoMin = e.servicos.length ? Math.min(...e.servicos.map((s) => s.preco)) : 0;
    return precoMin <= filtros.precoMaximo;
  });

  resultado = resultado.filter((e) => (e.avaliacao || 0) >= filtros.avaliacaoMinima);

  if (filtros.tipoServico) {
    resultado = resultado.filter((e) => e.servicos.some((s) => s.tag === filtros.tipoServico));
  }

  if (filtros.apenasBemAvaliados) {
    resultado = resultado.filter((e) => (e.avaliacao || 0) >= 4.8);
  }

  if (filtros.apenasVagasHoje) {
    // Simulação: verifica se tem horários livres hoje
    resultado = resultado.filter((e) => e.servicos.length > 0);
  }

  if (filtros.localizacaoUsuario) {
    resultado = resultado.map((e) => ({
      ...e,
      _distancia: calcularDistanciaKm(
        filtros.localizacaoUsuario!.latitude,
        filtros.localizacaoUsuario!.longitude,
        e.latitude,
        e.longitude
      ),
    })).sort((a, b) => (a._distancia || 0) - (b._distancia || 0));
  } else {
    switch (filtros.ordenacao) {
      case 'avaliacao':
        resultado.sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0));
        break;
      case 'preco':
        resultado.sort((a, b) => {
          const pa = a.servicos.length ? Math.min(...a.servicos.map((s) => s.preco)) : 9999;
          const pb = b.servicos.length ? Math.min(...b.servicos.map((s) => s.preco)) : 9999;
          return pa - pb;
        });
        break;
      case 'fila':
        resultado.sort((a, b) => a.fila.length - b.fila.length);
        break;
    }
  }

  return sucesso(resultado);
}

/** Buscar estabelecimento por slug */
export async function buscarEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.slug === slug && e.status === 'aprovado');
  return sucesso(est || null);
}

/** Buscar estabelecimento por ID (para barbeiro/admin) */
export async function buscarEstabelecimentoPorId(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
  return sucesso(est || null);
}

/** Atualizar dados do estabelecimento (barbeiro) */
export async function atualizarEstabelecimento(id: string, dados: Partial<Estabelecimento>): Promise<ResultadoServico<Estabelecimento>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx] = { ...estadoGlobal.estabelecimentos[idx], ...dados };
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[idx]);
}

/** Atualizar configuração Pix */
export async function atualizarConfiguracaoPix(id: string, config: ConfiguracaoPix): Promise<ResultadoServico<ConfiguracaoPix>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].configuracaoPix = config;
  persistirEstado();

  return sucesso(config);
}

/** Atualizar mensagens automáticas */
export async function atualizarMensagensAutomaticas(id: string, mensagens: MensagemAutomatica): Promise<ResultadoServico<MensagemAutomatica>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  // Armazenaria em campo separado em produção
  persistirEstado();

  return sucesso(mensagens);
}

// ============================================================================
// SERVIÇOS
// ============================================================================

/** Adicionar serviço */
export async function adicionarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  const novoServico: Servico = { ...servico, id: `svc-${gerarId()}` };
  estadoGlobal.estabelecimentos[idx].servicos.push(novoServico);
  persistirEstado();

  return sucesso(novoServico);
}

/** Atualizar serviço */
export async function atualizarServico(estabelecimentoId: string, servicoId: string, dados: Partial<Servico>): Promise<ResultadoServico<Servico>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const svcIdx = estadoGlobal.estabelecimentos[estIdx].servicos.findIndex((s) => s.id === servicoId);
  if (svcIdx === -1) return falha('Serviço não encontrado.');

  estadoGlobal.estabelecimentos[estIdx].servicos[svcIdx] = {
    ...estadoGlobal.estabelecimentos[estIdx].servicos[svcIdx],
    ...dados,
  };
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[estIdx].servicos[svcIdx]);
}

/** Excluir serviço */
export async function excluirServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[estIdx].servicos = estadoGlobal.estabelecimentos[estIdx].servicos.filter(
    (s) => s.id !== servicoId
  );
  persistirEstado();

  return sucesso(undefined);
}

/** Adicionar mídia ao serviço */
export async function adicionarMidiaServico(estabelecimentoId: string, servicoId: string, midia: { tipo: 'imagem' | 'video'; src: string }): Promise<ResultadoServico<Servico>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const svcIdx = estadoGlobal.estabelecimentos[estIdx].servicos.findIndex((s) => s.id === servicoId);
  if (svcIdx === -1) return falha('Serviço não encontrado.');

  const servico = estadoGlobal.estabelecimentos[estIdx].servicos[svcIdx];
  servico.midias = servico.midias || [];
  servico.midias.push(midia);
  persistirEstado();

  return sucesso(servico);
}

/** Remover mídia do serviço */
export async function removerMidiaServico(estabelecimentoId: string, servicoId: string, midiaIndex: number): Promise<ResultadoServico<Servico>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const svcIdx = estadoGlobal.estabelecimentos[estIdx].servicos.findIndex((s) => s.id === servicoId);
  if (svcIdx === -1) return falha('Serviço não encontrado.');

  const servico = estadoGlobal.estabelecimentos[estIdx].servicos[svcIdx];
  if (servico.midias && midiaIndex < servico.midias.length) {
    servico.midias.splice(midiaIndex, 1);
  }
  persistirEstado();

  return sucesso(servico);
}

// ============================================================================
// GALERIA / PORTFÓLIO
// ============================================================================

/** Adicionar item à galeria */
export async function adicionarGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  const novoItem: ItemGaleria = { ...item, id: `gal-${gerarId()}` };
  estadoGlobal.estabelecimentos[idx].galeria.push(novoItem);
  persistirEstado();

  return sucesso(novoItem);
}

/** Remover item da galeria */
export async function removerGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].galeria = estadoGlobal.estabelecimentos[idx].galeria.filter(
    (i) => i.id !== itemId
  );
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// FILA (TEMPO REAL)
// ============================================================================

/** Entrar na fila */
export async function entrarNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<{ posicao: number; esperaEstimada: number }>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  const est = estadoGlobal.estabelecimentos[idx];
  const agora = new Date();
  const horario = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  est.fila.push({ nome, horarioChegada: horario });
  persistirEstado();

  const posicao = est.fila.length;
  const esperaEstimada = posicao * est.tempoMedioAtendimento;

  return sucesso({ posicao, esperaEstimada });
}

/** Obter fila atual */
export async function obterFila(estabelecimentoId: string): Promise<ResultadoServico<{ fila: Array<{ nome: string; horarioChegada: string }>; esperaEstimada: number }>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  return sucesso({
    fila: est.fila,
    esperaEstimada: est.fila.length * est.tempoMedioAtendimento,
  });
}

/** Chamar próximo da fila (barbeiro) */
export async function chamarProximoFila(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].fila.shift();
  persistirEstado();

  return sucesso(undefined);
}

/** Remover da fila por índice (barbeiro) */
export async function removerDaFila(estabelecimentoId: string, index: number): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].fila.splice(index, 1);
  persistirEstado();

  return sucesso(undefined);
}

/** Adicionar cliente presencial na fila (barbeiro) */
export async function adicionarPresencialNaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  const agora = new Date();
  const horario = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  estadoGlobal.estabelecimentos[idx].fila.push({ nome, horarioChegada: horario });
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// ESTABELECIMENTOS - WRAPPERS PARA API OBJECT
// ============================================================================

/** Buscar estabelecimentos (compatível com FiltrosBusca) */
export async function buscarEstabelecimentos(filtros: FiltrosBusca): Promise<ResultadoServico<Estabelecimento[]>> {
  return listarEstabelecimentos(filtros);
}

/** Obter estabelecimento por ID */
export async function obterEstabelecimento(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === id && e.status === 'aprovado');
  return sucesso(est || null);
}

/** Criar estabelecimento (admin) */
export async function criarEstabelecimento(dados: Omit<Estabelecimento, 'id' | 'slug' | 'avaliacao' | 'status' | 'seguidores' | 'taxaFidelidade'>): Promise<ResultadoServico<Estabelecimento>> {
  await simularLatencia();
  simularErroAleatorio();

  const slug = dados.nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const novoEstabelecimento: Estabelecimento = {
    ...dados,
    id: slug,
    slug,
    avaliacao: 0,
    status: 'aprovado',
    seguidores: 0,
    taxaFidelidade: 0,
  };

  estadoGlobal.estabelecimentos.push(novoEstabelecimento);
  persistirEstado();

  return sucesso(novoEstabelecimento);
}

/** Excluir estabelecimento (admin) */
export async function excluirEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos.splice(idx, 1);
  delete estadoGlobal.agendamentos[id];
  persistirEstado();

  return sucesso(undefined);
}

/** Listar serviços do estabelecimento */
export async function listarServicos(estabelecimentoId: string): Promise<ResultadoServico<Servico[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  return sucesso(est.servicos);
}

/** Obter serviço por ID */
export async function obterServico(estabelecimentoId: string, servicoId: string): Promise<ResultadoServico<Servico | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  const servico = est.servicos.find((s) => s.id === servicoId);
  return sucesso(servico || null);
}

/** Reordenar serviços */
export async function reordenarServicos(estabelecimentoId: string, servicoIds: string[]): Promise<ResultadoServico<Servico[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const servicosOrdenados = servicoIds.map((id) => estadoGlobal.estabelecimentos[estIdx].servicos.find((s) => s.id === id)).filter(Boolean) as Servico[];
  const servicosRestantes = estadoGlobal.estabelecimentos[estIdx].servicos.filter((s) => !servicoIds.includes(s.id));
  estadoGlobal.estabelecimentos[estIdx].servicos = [...servicosOrdenados, ...servicosRestantes];
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[estIdx].servicos);
}

/** Listar galeria do estabelecimento */
export async function listarGaleria(estabelecimentoId: string): Promise<ResultadoServico<ItemGaleria[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  return sucesso(est.galeria);
}

/** Reordenar galeria */
export async function reordenarGaleria(estabelecimentoId: string, itemIds: string[]): Promise<ResultadoServico<ItemGaleria[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const itensOrdenados = itemIds.map((id) => estadoGlobal.estabelecimentos[estIdx].galeria.find((i) => i.id === id)).filter(Boolean) as ItemGaleria[];
  const itensRestantes = estadoGlobal.estabelecimentos[estIdx].galeria.filter((i) => !itemIds.includes(i.id ?? ''));
  estadoGlobal.estabelecimentos[estIdx].galeria = [...itensOrdenados, ...itensRestantes];
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[estIdx].galeria);
}

/** Listar avaliações do estabelecimento */
export async function listarAvaliacoes(estabelecimentoId: string): Promise<ResultadoServico<Avaliacao[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  return sucesso(est.avaliacoes);
}

/** Responder avaliação */
export async function responderAvaliacao(estabelecimentoId: string, avaliacaoId: string, resposta: string): Promise<ResultadoServico<Avaliacao>> {
  await simularLatencia();
  simularErroAleatorio();

  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (estIdx === -1) return falha('Estabelecimento não encontrado.');

  const avIdx = estadoGlobal.estabelecimentos[estIdx].avaliacoes.findIndex((a) => a.id === avaliacaoId);
  if (avIdx === -1) return falha('Avaliação não encontrada.');

  estadoGlobal.estabelecimentos[estIdx].avaliacoes[avIdx] = {
    ...estadoGlobal.estabelecimentos[estIdx].avaliacoes[avIdx],
    resposta,
  };
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[estIdx].avaliacoes[avIdx]);
}

/** Sair da fila (cliente) */
export async function sairDaFila(estabelecimentoId: string, nome: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].fila = estadoGlobal.estabelecimentos[idx].fila.filter((p) => p.nome !== nome);
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// AGENDAMENTOS
// ============================================================================

/** Listar agendamentos do estabelecimento */
export async function listarAgendamentosEstabelecimento(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const agendamentos = estadoGlobal.agendamentos[estabelecimentoId] || [];
  return sucesso(clonarProfundo(agendamentos).sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario)));
}

/** Listar agendamentos do cliente */
export async function listarAgendamentosCliente(email: string): Promise<ResultadoServico<Agendamento[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const todos: Agendamento[] = [];
  Object.values(estadoGlobal.agendamentos).forEach((lista) => {
    lista.forEach((a) => {
      if (a.usuarioId === email) todos.push(clonarProfundo(a));
    });
  });

  return sucesso(todos.sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario)));
}

/** Obter horários disponíveis para um dia */
export async function obterHorariosDisponiveis(
  estabelecimentoId: string,
  dia: string,
  duracaoMinutos: number
): Promise<ResultadoServico<Array<{ horario: string; disponivel: boolean }>>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  const agendamentos = estadoGlobal.agendamentos[estabelecimentoId] || [];
  const agendamentosDia = agendamentos.filter((a) => a.dia === dia);

  // Gera horários das 9h às 18h em intervalos de 30 min
  const horarios: Array<{ horario: string; disponivel: boolean }> = [];
  for (let h = 9; h < 18; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) continue;
      const horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const inicio = h * 60 + m;
      const fim = inicio + duracaoMinutos;

      const ocupado = agendamentosDia.some((a) => {
        const [ah, am] = a.horario.split(':').map(Number);
        const aInicio = ah * 60 + am;
        const aFim = aInicio + a.duracaoMinutos;
        return inicio < aFim && aInicio < fim;
      });

      const passado = new Date(`${dia}T${horario}`) < new Date();
      horarios.push({ horario, disponivel: !ocupado && !passado });
    }
  }

  return sucesso(horarios);
}

/** Criar agendamento */
export async function criarAgendamento(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === dados.estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  // Verifica disponibilidade
  const agendamentos = estadoGlobal.agendamentos[dados.estabelecimentoId] || [];
  const conflito = agendamentos.some((a) => {
    if (a.dia !== dados.dia) return false;
    const [ah, am] = a.horario.split(':').map(Number);
    const [dh, dm] = dados.horario.split(':').map(Number);
    const aInicio = ah * 60 + am;
    const aFim = aInicio + a.duracaoMinutos;
    const dInicio = dh * 60 + dm;
    const dFim = dInicio + dados.duracaoMinutos;
    return dInicio < aFim && aInicio < dFim;
  });

  if (conflito) return falha('Esse horário acabou de ser ocupado. Escolha outro.');

  const novoAgendamento: Agendamento = { ...dados, id: `bk-${gerarId()}` };
  estadoGlobal.agendamentos[dados.estabelecimentoId] = [...(estadoGlobal.agendamentos[dados.estabelecimentoId] || []), novoAgendamento];
  persistirEstado();

  // Notifica barbeiro
  const barbeiros = estadoGlobal.usuarios.filter((u) => u.papel === 'barbeiro' && u.estabelecimentoId === dados.estabelecimentoId);
  barbeiros.forEach((b) => {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: b.email,
      tipo: 'agendamento',
      titulo: 'Novo agendamento',
      texto: `${dados.nomeCliente} agendou ${dados.servicos} para ${formatarParaExibicao(new Date(dados.dia + 'T00:00:00'))} às ${dados.horario}.`,
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId: dados.estabelecimentoId,
    });
  });

  // Notifica cliente se logado
  if (dados.usuarioId) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: dados.usuarioId,
      tipo: 'agendamento',
      titulo: 'Horário confirmado',
      texto: `${dados.servicos} em ${est.nome}, ${formatarParaExibicao(new Date(dados.dia + 'T00:00:00'))} às ${dados.horario}. Total ${formatarMoeda(dados.valorTotal)}.`,
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId: dados.estabelecimentoId,
    });
  }

  persistirEstado();
  return sucesso(novoAgendamento);
}

/** Cancelar agendamento */
export async function cancelarAgendamento(agendamentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado = false;
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const idx = estadoGlobal.agendamentos[estId].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      const agendamento = estadoGlobal.agendamentos[estId][idx];
      estadoGlobal.agendamentos[estId].splice(idx, 1);
      encontrado = true;

      // Notifica barbeiro
      const barbeiros = estadoGlobal.usuarios.filter((u) => u.papel === 'barbeiro' && u.estabelecimentoId === estId);
      barbeiros.forEach((b) => {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: b.email,
          tipo: 'cancelamento',
          titulo: 'Agendamento cancelado',
          texto: `${agendamento.nomeCliente} cancelou ${agendamento.servicos} de ${formatarParaExibicao(new Date(agendamento.dia + 'T00:00:00'))} às ${agendamento.horario}.`,
          lida: false,
          dataCriacao: Date.now(),
          estabelecimentoId: estId,
        });
      });

      // Notifica cliente
      if (agendamento.usuarioId) {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: agendamento.usuarioId,
          tipo: 'cancelamento',
          titulo: 'Agendamento cancelado',
          texto: `${agendamento.servicos} em ${estadoGlobal.estabelecimentos.find(e => e.id === estId)?.nome} (${formatarParaExibicao(new Date(agendamento.dia + 'T00:00:00'))} às ${agendamento.horario}) foi cancelado.`,
          lida: false,
          dataCriacao: Date.now(),
          estabelecimentoId: estId,
        });
      }
    }
  });

  if (!encontrado) return falha('Agendamento não encontrado.');

  persistirEstado();
  return sucesso(undefined);
}

/** Reagendar agendamento (cancela antigo e cria novo) */
export async function reagendarAgendamento(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
  await simularLatencia();
  simularErroAleatorio();

  let agendamentoOriginal: Agendamento | null = null;
  let estIdOriginal = '';

  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const idx = estadoGlobal.agendamentos[estId].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      agendamentoOriginal = estadoGlobal.agendamentos[estId][idx];
      estIdOriginal = estId;
      estadoGlobal.agendamentos[estId].splice(idx, 1);
    }
  });

  if (!agendamentoOriginal) return falha('Agendamento não encontrado.');

  // Cria novo agendamento
  const novoAgendamento: Agendamento = {
    ...(agendamentoOriginal as Agendamento),
    id: `bk-${gerarId()}`,
    dia: novoDia,
    horario: novoHorario,
  };

  estadoGlobal.agendamentos[estIdOriginal] = [...(estadoGlobal.agendamentos[estIdOriginal] || []), novoAgendamento];

  // Notifica
  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estIdOriginal);
  const barbeiros = estadoGlobal.usuarios.filter((u) => u.papel === 'barbeiro' && u.estabelecimentoId === estIdOriginal);
  barbeiros.forEach((b) => {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: b.email,
      tipo: 'reagendamento',
      titulo: 'Agendamento reagendado',
      texto: `${novoAgendamento.nomeCliente} reagendou ${novoAgendamento.servicos} para ${formatarParaExibicao(new Date(novoDia + 'T00:00:00'))} às ${novoHorario}.`,
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId: estIdOriginal,
    });
  });

  if (novoAgendamento.usuarioId) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: novoAgendamento.usuarioId,
      tipo: 'reagendamento',
      titulo: 'Horário reagendado',
      texto: `${novoAgendamento.servicos} em ${est?.nome}, ${formatarParaExibicao(new Date(novoDia + 'T00:00:00'))} às ${novoHorario}. Total ${formatarMoeda(novoAgendamento.valorTotal)}.`,
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId: estIdOriginal,
    });
  }

  persistirEstado();
  return sucesso(novoAgendamento);
}

/** Confirmar pagamento Pix (simulado) */
export async function confirmarPagamentoPix(agendamentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado = false;
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const agendamento = estadoGlobal.agendamentos[estId].find((a) => a.id === agendamentoId);
    if (agendamento) {
      agendamento.statusPagamento = 'pago';
      encontrado = true;
    }
  });

  if (!encontrado) return falha('Agendamento não encontrado.');

  persistirEstado();
  return sucesso(undefined);
}

// ============================================================================
// AGENDAMENTOS - WRAPPERS PARA API OBJECT
// ============================================================================

/** Listar agendamentos (unificado - por estabelecimento ou cliente) */
export async function listarAgendamentos(filtros: { estabelecimentoId?: string; usuarioId?: string }): Promise<ResultadoServico<Agendamento[]>> {
  if (filtros.estabelecimentoId) {
    return listarAgendamentosEstabelecimento(filtros.estabelecimentoId);
  }
  if (filtros.usuarioId) {
    return listarAgendamentosCliente(filtros.usuarioId);
  }
  // Retorna todos
  const todos: Agendamento[] = [];
  Object.values(estadoGlobal.agendamentos).forEach((lista) => {
    lista.forEach((a) => todos.push(clonarProfundo(a)));
  });
  return sucesso(todos.sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario)));
}

/** Obter agendamento por ID */
export async function obterAgendamento(agendamentoId: string): Promise<ResultadoServico<Agendamento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado: Agendamento | null = null;
  Object.values(estadoGlobal.agendamentos).forEach((lista) => {
    const a = lista.find((ag) => ag.id === agendamentoId);
    if (a) encontrado = clonarProfundo(a);
  });
  return sucesso(encontrado);
}

/** Criar agendamento (wrapper) */
export async function criarAgendamentoWrapper(dados: Omit<Agendamento, 'id'>): Promise<ResultadoServico<Agendamento>> {
  return criarAgendamento(dados);
}

/** Reagendar agendamento (wrapper) */
export async function reagendarAgendamentoWrapper(agendamentoId: string, novoDia: string, novoHorario: string): Promise<ResultadoServico<Agendamento>> {
  return reagendarAgendamento(agendamentoId, novoDia, novoHorario);
}

/** Cancelar agendamento (wrapper) */
export async function cancelarAgendamentoWrapper(agendamentoId: string): Promise<ResultadoServico<void>> {
  return cancelarAgendamento(agendamentoId);
}

/** Confirmar presença */
export async function confirmarPresenca(agendamentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado = false;
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const idx = estadoGlobal.agendamentos[estId].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      estadoGlobal.agendamentos[estId][idx].status = 'confirmado';
      encontrado = true;
    }
  });

  if (!encontrado) return falha('Agendamento não encontrado.');

  persistirEstado();
  return sucesso(undefined);
}

/** Listar agendamentos do barbeiro (wrapper) */
export async function listarBarbeiro(estabelecimentoId: string): Promise<ResultadoServico<Agendamento[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const agendamentos = estadoGlobal.agendamentos[estabelecimentoId] || [];
  return sucesso(clonarProfundo(agendamentos).sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario)));
}

/** Atualizar status do agendamento (wrapper) */
export async function atualizarStatus(agendamentoId: string, status: StatusAgendamento): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado = false;
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const idx = estadoGlobal.agendamentos[estId].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      estadoGlobal.agendamentos[estId][idx].status = status;
      encontrado = true;
    }
  });

  if (!encontrado) return falha('Agendamento não encontrado.');

  persistirEstado();
  return sucesso(undefined);
}

/** Definir horário real do agendamento (wrapper) */
export async function definirHorarioReal(agendamentoId: string, horarioReal: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let encontrado = false;
  Object.keys(estadoGlobal.agendamentos).forEach((estId) => {
    const idx = estadoGlobal.agendamentos[estId].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      estadoGlobal.agendamentos[estId][idx].horario = horarioReal;
      estadoGlobal.agendamentos[estId][idx].status = 'concluido';
      encontrado = true;
    }
  });

  if (!encontrado) return falha('Agendamento não encontrado.');

  persistirEstado();
  return sucesso(undefined);
}

/** Avaliar agendamento */
export async function avaliarAgendamento(agendamentoId: string, estrelas: number, comentario: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  let agendamento: Agendamento | null = null;
  let estId = '';
  for (const estIdKey of Object.keys(estadoGlobal.agendamentos)) {
    const idx = estadoGlobal.agendamentos[estIdKey].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      agendamento = estadoGlobal.agendamentos[estIdKey][idx];
      estId = estIdKey;
      break;
    }
  }

  if (!agendamento) return falha('Agendamento não encontrado.');

  // Adiciona avaliação ao estabelecimento
  const estIdx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estId);
  if (estIdx !== -1 && agendamento) {
    const novaAvaliacao: Avaliacao = {
      id: `av-${gerarId()}`,
      nomeCliente: agendamento.nomeCliente,
      estrelas,
      comentario,
      data: formatarParaExibicao(new Date()),
    };
    estadoGlobal.estabelecimentos[estIdx].avaliacoes.push(novaAvaliacao);

    // Recalcula média
    const avals = estadoGlobal.estabelecimentos[estIdx].avaliacoes;
    const soma = avals.reduce((acc, a) => acc + a.estrelas, 0);
    estadoGlobal.estabelecimentos[estIdx].avaliacao = soma / avals.length;
  }

  // Marca agendamento como concluído
  Object.keys(estadoGlobal.agendamentos).forEach((estIdKey) => {
    const idx = estadoGlobal.agendamentos[estIdKey].findIndex((a) => a.id === agendamentoId);
    if (idx !== -1) {
      estadoGlobal.agendamentos[estIdKey][idx].status = 'concluido';
    }
  });

  persistirEstado();
  return sucesso(undefined);
}

// ============================================================================
// FEED / PUBLICAÇÕES
// ============================================================================

/** Listar publicações do feed (com algoritmo de recomendação) */
export async function listarFeed(filtro: string, usuarioEmail?: string): Promise<ResultadoServico<Publicacao[]>> {
  await simularLatencia();
  simularErroAleatorio();

  let pubs = [...estadoGlobal.publicacoes].filter((p) => {
    const est = estadoGlobal.estabelecimentos.find((e) => e.id === p.estabelecimentoId);
    return est && est.status === 'aprovado';
  });

  if (filtro !== 'todos' && filtro !== 'salvos') {
    pubs = pubs.filter((p) => p.tagServico === filtro);
  }

  if (filtro === 'salvos' && usuarioEmail) {
    pubs = pubs.filter((p) => p.salvos.includes(usuarioEmail));
  }

  // Algoritmo simples de recomendação
  if (usuarioEmail) {
    const usuario = estadoGlobal.usuarios.find((u) => u.email === usuarioEmail);
    if (usuario) {
      pubs = pubs.map((p) => {
        const est = estadoGlobal.estabelecimentos.find((e) => e.id === p.estabelecimentoId);
        let score = 0;
        if (usuario.seguindo.includes(p.estabelecimentoId)) score += 10;
        if (usuario.inspiracoesSalvas.includes(p.id)) score += 5;
        if (est && (est.avaliacao || 0) >= 4.7) score += 3;
        const idadeHoras = (Date.now() - p.dataCriacao) / 3600000;
        score += Math.max(0, 10 - idadeHoras / 2);
        return { ...p, _score: score };
      }).sort((a, b) => (b._score || 0) - (a._score || 0));
    }
  } else {
    pubs.sort((a, b) => b.dataCriacao - a.dataCriacao);
  }

  return sucesso(pubs);
}

/** Obter publicação por ID */
export async function obterPublicacao(id: string): Promise<ResultadoServico<Publicacao | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const pub = estadoGlobal.publicacoes.find((p) => p.id === id);
  return sucesso(pub || null);
}

/** Criar publicação */
export async function criarPublicacao(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'visualizacoes' | 'compartilhamentos' | 'comentarios' | 'dataCriacao'>): Promise<ResultadoServico<Publicacao>> {
  await simularLatencia();
  simularErroAleatorio();

  const nova: Publicacao = {
    ...dados,
    id: `post-${gerarId()}`,
    curtidas: [],
    salvos: [],
    visualizacoes: 0,
    compartilhamentos: 0,
    comentarios: [],
    dataCriacao: Date.now(),
  };

  estadoGlobal.publicacoes.unshift(nova);
  persistirEstado();

  // Notifica seguidores
  const est = estadoGlobal.estabelecimentos.find((e) => e.id === dados.estabelecimentoId);
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

/** Curtir/descurtir publicação */
export async function alternarCurtida(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
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

/** Salvar/remover inspiração */
export async function alternarInspiracao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
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

/** Seguir/deixar de seguir estabelecimento */
export async function alternarSeguir(estabelecimentoId: string, usuarioEmail: string): Promise<ResultadoServico<{ seguindo: boolean }>> {
  await simularLatencia();
  simularErroAleatorio();

  const usuario = estadoGlobal.usuarios.find((u) => u.email === usuarioEmail);
  if (!usuario) return falha('Usuário não encontrado.');

  const idx = usuario.seguindo.indexOf(estabelecimentoId);
  let seguindo: boolean;
  if (idx >= 0) {
    usuario.seguindo.splice(idx, 1);
    seguindo = false;
  } else {
    usuario.seguindo.push(estabelecimentoId);
    seguindo = true;
  }

  persistirEstado();
  return sucesso({ seguindo });
}

/** Adicionar comentário */
export async function adicionarComentario(publicacaoId: string, autorNome: string, texto: string): Promise<ResultadoServico<Comentario>> {
  await simularLatencia();
  simularErroAleatorio();

  const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
  if (!pub) return falha('Publicação não encontrada.');

  const comentario: Comentario = {
    id: `cmt-${gerarId()}`,
    nomeAutor: autorNome,
    texto,
    dataCriacao: Date.now(),
  };

  pub.comentarios.push(comentario);
  persistirEstado();

  return sucesso(comentario);
}

/** Excluir publicação */
export async function excluirPublicacao(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.publicacoes.findIndex((p) => p.id === publicacaoId && p.estabelecimentoId === estabelecimentoId);
  if (idx === -1) return falha('Publicação não encontrada ou não autorizado.');

  estadoGlobal.publicacoes.splice(idx, 1);
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// FEED / PUBLICAÇÕES - WRAPPERS PARA API OBJECT
// ============================================================================

/** Listar publicações (wrapper para feed) */
export async function listarPublicacoes(filtros: { estabelecimentoId?: string; usuarioEmail?: string; filtro?: string }): Promise<ResultadoServico<Publicacao[]>> {
  return listarFeed(filtros.filtro || 'todos', filtros.usuarioEmail);
}

/** Obter publicação por ID (wrapper) */
export async function obterPublicacaoWrapper(publicacaoId: string): Promise<ResultadoServico<Publicacao | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
  return sucesso(pub ? clonarProfundo(pub) : null);
}

/** Criar publicação (core) */
export async function criarPublicacaoFeed(dados: Omit<Publicacao, 'id' | 'curtidas' | 'salvos' | 'comentarios' | 'dataCriacao' | 'visualizacoes' | 'compartilhamentos'>): Promise<ResultadoServico<Publicacao>> {
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

  // Notifica seguidores
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

/** Excluir publicação (wrapper) */
export async function excluirPublicacaoWrapper(publicacaoId: string, estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return excluirPublicacao(publicacaoId, estabelecimentoId);
}

/** Curtir/descurtir publicação (wrapper) */
export async function curtirPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ curtido: boolean; total: number }>> {
  return alternarCurtida(publicacaoId, usuarioEmail);
}

/** Salvar/remover inspiração (wrapper) */
export async function salvarPublicacao(publicacaoId: string, usuarioEmail: string): Promise<ResultadoServico<{ salvo: boolean }>> {
  return alternarInspiracao(publicacaoId, usuarioEmail);
}

/** Obter publicações salvas do usuário (wrapper) */
export async function obterSalvas(usuarioEmail: string): Promise<ResultadoServico<Publicacao[]>> {
  await simularLatencia();
  simularErroAleatorio();

  const usuario = estadoGlobal.usuarios.find((u) => u.email === usuarioEmail);
  if (!usuario) return sucesso([]);

  const salvas = estadoGlobal.publicacoes.filter((p) => usuario.inspiracoesSalvas.includes(p.id));
  return sucesso(salvas.sort((a, b) => b.dataCriacao - a.dataCriacao));
}

/** Compartilhar publicação */
export async function compartilharPublicacao(publicacaoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const pub = estadoGlobal.publicacoes.find((p) => p.id === publicacaoId);
  if (pub) {
    pub.compartilhamentos++;
    persistirEstado();
  }
  return sucesso(undefined);
}

/** Denunciar publicação */
export async function denunciarPublicacao(publicacaoId: string, motivo: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, salvaria denúncia
  console.log(`[MOCK] Publicação ${publicacaoId} denunciada: ${motivo}`);
  return sucesso(undefined);
}

// ============================================================================
// AVALIAÇÕES
// ============================================================================

/** Adicionar avaliação */
export async function adicionarAvaliacao(estabelecimentoId: string, avaliacao: Omit<Avaliacao, 'id'>): Promise<ResultadoServico<Avaliacao>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  const nova: Avaliacao = { ...avaliacao, id: `av-${gerarId()}` };
  estadoGlobal.estabelecimentos[idx].avaliacoes.unshift(nova);

  // Recalcula média
  const avaliacoes = estadoGlobal.estabelecimentos[idx].avaliacoes;
  const soma = avaliacoes.reduce((acc, a) => acc + a.estrelas, 0);
  estadoGlobal.estabelecimentos[idx].avaliacao = Number((soma / avaliacoes.length).toFixed(1));

  persistirEstado();
  return sucesso(nova);
}

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

/** Listar notificações do usuário */
export async function listarNotificacoes(usuarioEmail: string, filtro: string): Promise<ResultadoServico<Notificacao[]>> {
  await simularLatencia();
  simularErroAleatorio();

  let notifs = estadoGlobal.notificacoes.filter((n) => n.destinatario === usuarioEmail);

  if (filtro === 'agendamentos') {
    notifs = notifs.filter((n) => ['agendamento', 'reagendamento', 'cancelamento'].includes(n.tipo));
  } else if (filtro === 'mensagens') {
    notifs = notifs.filter((n) => ['mensagem', 'administracao', 'pagamento'].includes(n.tipo));
  }

  return sucesso(notifs.sort((a, b) => b.dataCriacao - a.dataCriacao));
}

/** Marcar notificação como lida */
export async function marcarNotificacaoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const notif = estadoGlobal.notificacoes.find((n) => n.id === notificacaoId);
  if (notif) notif.lida = true;

  persistirEstado();
  return sucesso(undefined);
}

/** Marcar todas como lidas */
export async function marcarTodasNotificacoesLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  estadoGlobal.notificacoes
    .filter((n) => n.destinatario === usuarioEmail)
    .forEach((n) => { n.lida = true; });

  persistirEstado();
  return sucesso(undefined);

}
/** Enviar mensagem para clientes (barbeiro) */
export async function enviarMensagemClientes(estabelecimentoId: string, destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
  await simularLatencia();
  simularErroAleatorio();

  let enviadas = 0;
  destinatarios.forEach((email) => {
    if (email === 'all') {
      // Todos os clientes que agendaram
      const agendamentos = estadoGlobal.agendamentos[estabelecimentoId] || [];
      const clientesUnicos = [...new Set(agendamentos.map((a) => a.usuarioId).filter(Boolean))];
      clientesUnicos.forEach((e) => {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: e!,
          tipo: 'mensagem',
          titulo: `Mensagem de ${estadoGlobal.estabelecimentos.find(e => e.id === estabelecimentoId)?.nome}`,
          texto,
          lida: false,
          dataCriacao: Date.now(),
          estabelecimentoId,
        });
        enviadas++;
      });
    } else {
      estadoGlobal.notificacoes.push({
        id: `notif-${gerarId()}`,
        destinatario: email,
        tipo: 'mensagem',
        titulo: `Mensagem de ${estadoGlobal.estabelecimentos.find(e => e.id === estabelecimentoId)?.nome}`,
        texto,
        lida: false,
        dataCriacao: Date.now(),
        estabelecimentoId,
      });
      enviadas++;
    }
  });

  persistirEstado();
  return sucesso(enviadas);
}

/** Enviar aviso para barbeiros (admin) */
export async function enviarAvisoBarbeiros(destinatarios: string[], texto: string): Promise<ResultadoServico<number>> {
  await simularLatencia();
  simularErroAleatorio();

  let enviadas = 0;
  destinatarios.forEach((id) => {
    if (id === 'all') {
      const barbeiros = estadoGlobal.usuarios.filter((u) => u.papel === 'barbeiro');
      barbeiros.forEach((b) => {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: b.email,
          tipo: 'administracao',
          titulo: 'Aviso da administração',
          texto,
          lida: false,
          dataCriacao: Date.now(),
        });
        enviadas++;
      });
    } else {
      const barbeiro = estadoGlobal.usuarios.find((u) => u.estabelecimentoId === id);
      if (barbeiro) {
        estadoGlobal.notificacoes.push({
          id: `notif-${gerarId()}`,
          destinatario: barbeiro.email,
          tipo: 'administracao',
          titulo: 'Aviso da administração',
          texto,
          lida: false,
          dataCriacao: Date.now(),
          estabelecimentoId: id,
        });
        enviadas++;
      }
    }
  });

  persistirEstado();
  return sucesso(enviadas);
}

// ============================================================================
// NOTIFICAÇÕES - WRAPPERS PARA API OBJECT
// ============================================================================

/** Excluir notificação */
export async function excluirNotificacao(notificacaoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.notificacoes.findIndex((n) => n.id === notificacaoId);
  if (idx === -1) return falha('Notificação não encontrada.');

  estadoGlobal.notificacoes.splice(idx, 1);
  persistirEstado();

  return sucesso(undefined);
}

/** Excluir todas as lidas do usuário */
export async function excluirTodasLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  estadoGlobal.notificacoes = estadoGlobal.notificacoes.filter(
    (n) => !(n.destinatario === usuarioEmail && n.lida)
  );
  persistirEstado();

  return sucesso(undefined);
}

// ============================================================================
// ESTABELECIMENTOS - WRAPPERS PARA API OBJECT
// ============================================================================

/** Obter estabelecimento por slug (wrapper) */
export async function obterEstabelecimentoPorSlug(slug: string): Promise<ResultadoServico<Estabelecimento | null>> {
  return buscarEstabelecimentoPorSlug(slug);
}

/** Atualizar tema do estabelecimento */
export async function atualizarTemaEstabelecimento(id: string, tema: { cor?: string; layout?: TipoLayout; titulo?: string; subtitulo?: string }): Promise<ResultadoServico<Estabelecimento>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].tema = { ...estadoGlobal.estabelecimentos[idx].tema, ...tema };
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[idx]);
}

/** Atualizar horário de funcionamento */
export async function atualizarHorarioFuncionamento(id: string, horario: string): Promise<ResultadoServico<Estabelecimento>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].horarioFuncionamento = horario;
  persistirEstado();

  return sucesso(estadoGlobal.estabelecimentos[idx]);
}

/** Criar serviço (wrapper) */
export async function criarServico(estabelecimentoId: string, servico: Omit<Servico, 'id'>): Promise<ResultadoServico<Servico>> {
  return adicionarServico(estabelecimentoId, servico);
}

/** Adicionar mídia à galeria (wrapper) */
export async function adicionarMidiaGaleria(estabelecimentoId: string, item: Omit<ItemGaleria, 'id'>): Promise<ResultadoServico<ItemGaleria>> {
  return adicionarGaleria(estabelecimentoId, item);
}

/** Remover mídia da galeria (wrapper) */
export async function removerMidiaGaleria(estabelecimentoId: string, itemId: string): Promise<ResultadoServico<void>> {
  return removerGaleria(estabelecimentoId, itemId);
}

/** Chamar próximo da fila (wrapper) */
export async function chamarProximo(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  return chamarProximoFila(estabelecimentoId);
}

/** Marcar notificação como lida (wrapper) */
export async function marcarComoLida(notificacaoId: string): Promise<ResultadoServico<void>> {
  return marcarNotificacaoLida(notificacaoId);
}

/** Marcar todas notificações como lidas (wrapper) */
export async function marcarTodasComoLidas(usuarioEmail: string): Promise<ResultadoServico<void>> {
  return marcarTodasNotificacoesLidas(usuarioEmail);
}

// ============================================================================
// PERFIL - WRAPPERS PARA API OBJECT
// ============================================================================

/** Obter perfil do usuário logado */
export async function obterPerfil(): Promise<ResultadoServico<Usuario | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao) return falha('Não autenticado.');

  const usuario = estadoGlobal.usuarios.find((u) => u.email === sessao.email);
  if (!usuario) return falha('Usuário não encontrado.');

  return sucesso(usuario);
}

/** Atualizar perfil (wrapper) */
export async function atualizarPerfil(dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
  return atualizarPerfilCliente(dados);
}

// ============================================================================
// BARBEIRO - WRAPPERS PARA API OBJECT
// ============================================================================

/** Obter dashboard do barbeiro */
export async function obterDashboardBarbeiro(): Promise<ResultadoServico<{
  agendamentosHoje: number;
  agendamentosSemana: number;
  faturamentoMes: number;
  avaliacaoMedia: number;
  filaAtual: number;
  proximosAgendamentos: Agendamento[];
}>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao || sessao.papel !== 'barbeiro' || !sessao.estabelecimentoId) {
    return falha('Não autorizado.');
  }

  const estId = sessao.estabelecimentoId;
  const agendamentos = estadoGlobal.agendamentos[estId] || [];
  const hoje = new Date().toISOString().split('T')[0];
  const umaSemana = new Date();
  umaSemana.setDate(umaSemana.getDate() + 7);
  const semanaStr = umaSemana.toISOString().split('T')[0];

  const agendamentosHoje = agendamentos.filter((a) => a.dia === hoje).length;
  const agendamentosSemana = agendamentos.filter((a) => a.dia >= hoje && a.dia <= semanaStr).length;

  const mesAtual = new Date().getMonth();
  const faturamentoMes = agendamentos
    .filter((a) => new Date(a.dia).getMonth() === mesAtual && a.statusPagamento === 'pago')
    .reduce((acc, a) => acc + a.valorTotal, 0);

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estId);
  const avaliacaoMedia = est?.avaliacao || 0;
  const filaAtual = est?.fila.length || 0;

  const proximosAgendamentos = agendamentos
    .filter((a) => a.dia >= hoje)
    .sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario))
    .slice(0, 5);

  return sucesso({
    agendamentosHoje,
    agendamentosSemana,
    faturamentoMes,
    avaliacaoMedia,
    filaAtual,
    proximosAgendamentos,
  });
}

/** Obter estatísticas do barbeiro */
export async function obterEstatisticasBarbeiro(): Promise<ResultadoServico<{
  totalAgendamentos: number;
  totalClientes: number;
  faturamentoTotal: number;
  servicosMaisProcurados: Array<{ nome: string; quantidade: number }>;
}>> {
  await simularLatencia();
  simularErroAleatorio();

  const sessao = estadoGlobal.sessao;
  if (!sessao || sessao.papel !== 'barbeiro' || !sessao.estabelecimentoId) {
    return falha('Não autorizado.');
  }

  const estId = sessao.estabelecimentoId;
  const agendamentos = estadoGlobal.agendamentos[estId] || [];

  // Conta serviços
  const servicosCount: Record<string, number> = {};
  agendamentos.forEach((a) => {
    a.servicoIds.forEach((id) => {
      servicosCount[id] = (servicosCount[id] || 0) + 1;
    });
  });

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estId);
  const servicosMaisProcurados = Object.entries(servicosCount)
    .map(([id, qtd]) => ({
      nome: est?.servicos.find((s) => s.id === id)?.nome || id,
      quantidade: qtd,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  const totalClientes = new Set(agendamentos.map((a) => a.usuarioId).filter(Boolean)).size;
  const faturamentoTotal = agendamentos
    .filter((a) => a.statusPagamento === 'pago')
    .reduce((acc, a) => acc + a.valorTotal, 0);

  return sucesso({
    totalAgendamentos: agendamentos.length,
    totalClientes,
    faturamentoTotal,
    servicosMaisProcurados,
  });
}

// ============================================================================
// ADMIN - GESTÃO DE ESTABELECIMENTOS
// ============================================================================

/** Listar todos estabelecimentos (admin) */
export async function listarTodosEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>> {
  await simularLatencia();
  simularErroAleatorio();

  return sucesso(clonarProfundo(estadoGlobal.estabelecimentos));
}

/** Aprovar/rejeitar estabelecimento */
export async function alterarStatusEstabelecimento(id: string, status: StatusEstabelecimento): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === id);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].status = status;

  // Notifica o barbeiro
  const barbeiro = estadoGlobal.usuarios.find((u) => u.estabelecimentoId === id);
  if (barbeiro) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: barbeiro.email,
      tipo: 'administracao',
      titulo: status === 'aprovado' ? 'Cadastro aprovado!' : 'Cadastro reprovado',
      texto: status === 'aprovado'
        ? 'Seu cadastro foi aprovado. Bem-vindo ao Corte Rápido!'
        : 'Seu cadastro não foi aprovado. Entre em contato para mais detalhes.',
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId: id,
    });
  }

  persistirEstado();
  return sucesso(undefined);
}

// ============================================================================
// ADMIN - PAGAMENTOS / PLANOS
// ============================================================================

/** Listar planos */
export async function listarPlanos(): Promise<ResultadoServico<PlanoAssinatura[]>> {
  await simularLatencia();
  simularErroAleatorio();

  // Carrega do estado ou usa padrão
  return sucesso(estadoGlobal.planos || [
    { id: 'mensal', nome: 'Mensalidade', tipo: 'mensal', preco: 89.90 },
    { id: 'diario', nome: 'Diária', tipo: 'diario', preco: 9.90 },
  ]);
}

/** Adicionar plano */
export async function adicionarPlano(plano: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
  await simularLatencia();
  simularErroAleatorio();

  const novo: PlanoAssinatura = { ...plano, id: `plano-${gerarId()}` };
  estadoGlobal.planos = [...(estadoGlobal.planos || []), novo];
  persistirEstado();

  return sucesso(novo);
}

/** Atualizar plano */
export async function atualizarPlano(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = (estadoGlobal.planos || []).findIndex((p) => p.id === planoId);
  if (idx === -1) return falha('Plano não encontrado.');

  estadoGlobal.planos![idx] = { ...estadoGlobal.planos![idx], ...dados };
  persistirEstado();

  return sucesso(estadoGlobal.planos![idx]);
}

/** Obter assinatura do estabelecimento */
export async function obterAssinatura(estabelecimentoId: string): Promise<ResultadoServico<AssinaturaEstabelecimento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, buscaria de tabela separada
  // Aqui simulamos gerando na hora baseado em dados fixos
  const est = estadoGlobal.estabelecimentos.find((e) => e.id === estabelecimentoId);
  if (!est) return falha('Estabelecimento não encontrado.');

  // Simulação simples
  const assinatura: AssinaturaEstabelecimento = {
    planoId: 'mensal',
    inicioContrato: '2024-01-01',
    vencimento: '2024-02-01',
    historicoPagamentos: [
      { data: '2024-01-01', descricao: 'Mensalidade · 30 dias', valor: 89.90 },
    ],
  };

  return sucesso(assinatura);
}

/** Atualizar contrato/assinatura (admin) */
export async function atualizarContrato(
  estabelecimentoId: string
): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, atualizaria tabela de assinaturas
  // Notifica barbeiro
  const barbeiro = estadoGlobal.usuarios.find((u) => u.estabelecimentoId === estabelecimentoId);
  if (barbeiro) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: barbeiro.email,
      tipo: 'pagamento',
      titulo: 'Contrato atualizado',
      texto: 'A administração alterou seu contrato.',
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId,
    });
  }

  persistirEstado();
  return sucesso(undefined);
}

/** Registrar pagamento recebido (admin) */
export async function registrarPagamento(estabelecimentoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const barbeiro = estadoGlobal.usuarios.find((u) => u.estabelecimentoId === estabelecimentoId);
  if (barbeiro) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: barbeiro.email,
      tipo: 'pagamento',
      titulo: 'Pagamento registrado',
      texto: 'A administração registrou seu pagamento. Novo vencimento atualizado.',
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId,
    });
  }

  persistirEstado();
  return sucesso(undefined);
}

/** Ajustar vencimento (+ dias) */
export async function ajustarVencimento(estabelecimentoId: string, dias: number): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const barbeiro = estadoGlobal.usuarios.find((u) => u.estabelecimentoId === estabelecimentoId);
  if (barbeiro) {
    estadoGlobal.notificacoes.push({
      id: `notif-${gerarId()}`,
      destinatario: barbeiro.email,
      tipo: 'pagamento',
      titulo: 'Vencimento alterado',
      texto: `Novo vencimento do seu plano em ${dias} dia(s).`,
      lida: false,
      dataCriacao: Date.now(),
      estabelecimentoId,
    });
  }

  persistirEstado();
  return sucesso(undefined);
}

// ============================================================================
// ADMIN - PÁGINAS E TEMPLATES
// ============================================================================

/** Permitir auto-edição da página pelo barbeiro */
export async function definirAutoEdicao(estabelecimentoId: string, permitido: boolean): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.estabelecimentos.findIndex((e) => e.id === estabelecimentoId);
  if (idx === -1) return falha('Estabelecimento não encontrado.');

  estadoGlobal.estabelecimentos[idx].permiteAutoEdicao = permitido;
  persistirEstado();

  return sucesso(undefined);
}

/** Atualizar seções da página (ordem/visibilidade) */

// ============================================================================
// ADMIN - WRAPPERS PARA API OBJECT
// ============================================================================

/** Listar usuários (admin) */
export async function listarUsuariosAdmin(): Promise<ResultadoServico<Usuario[]>> {
  await simularLatencia();
  simularErroAleatorio();

  return sucesso(estadoGlobal.usuarios);
}

/** Obter usuário por ID (admin) */
export async function obterUsuarioAdmin(id: string): Promise<ResultadoServico<Usuario | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const usuario = estadoGlobal.usuarios.find((u) => u.id === id);
  if (!usuario) return falha('Usuário não encontrado.');

  return sucesso(usuario);
}

/** Atualizar usuário (admin) */
export async function atualizarUsuarioAdmin(id: string, dados: Partial<Usuario>): Promise<ResultadoServico<Usuario>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.usuarios.findIndex((u) => u.id === id);
  if (idx === -1) return falha('Usuário não encontrado.');

  estadoGlobal.usuarios[idx] = { ...estadoGlobal.usuarios[idx], ...dados };
  persistirEstado();

  return sucesso(estadoGlobal.usuarios[idx]);
}

/** Excluir usuário (admin) */
export async function excluirUsuarioAdmin(id: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  const idx = estadoGlobal.usuarios.findIndex((u) => u.id === id);
  if (idx === -1) return falha('Usuário não encontrado.');

  estadoGlobal.usuarios.splice(idx, 1);
  persistirEstado();

  return sucesso(undefined);
}

/** Listar todos estabelecimentos (admin) - wrapper */
export async function listarEstabelecimentosAdmin(): Promise<ResultadoServico<Estabelecimento[]>> {
  return listarTodosEstabelecimentosAdmin();
}

/** Obter estabelecimento (admin) */
export async function obterEstabelecimentoAdmin(id: string): Promise<ResultadoServico<Estabelecimento | null>> {
  await simularLatencia();
  simularErroAleatorio();

  const est = estadoGlobal.estabelecimentos.find((e) => e.id === id);
  return sucesso(est ? clonarProfundo(est) : null);
}

/** Aprovar estabelecimento */
export async function aprovarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return alterarStatusEstabelecimento(id, 'aprovado');
}

/** Rejeitar estabelecimento */
export async function rejeitarEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return alterarStatusEstabelecimento(id, 'rejeitado');
}

/** Suspender estabelecimento */
export async function suspenderEstabelecimento(id: string): Promise<ResultadoServico<void>> {
  return alterarStatusEstabelecimento(id, 'pendente');
}

/** Listar pagamentos (admin) */
export async function listarPagamentosAdmin(): Promise<ResultadoServico<Array<{ estabelecimento: string; data: string; valor: number; status: string }>>> {
  await simularLatencia();
  simularErroAleatorio();

  // Simula histórico de pagamentos
  const pagamentos = estadoGlobal.estabelecimentos.flatMap((est) =>
    (estadoGlobal.assinaturas?.[est.id]?.historicoPagamentos || []).map((p) => ({
      estabelecimento: est.nome,
      data: p.data,
      valor: p.valor,
      status: 'pago',
    }))
  );

  return sucesso(pagamentos.sort((a, b) => b.data.localeCompare(a.data)));
}

/** Obter planos (admin) */
export async function obterPlanosAdmin(): Promise<ResultadoServico<PlanoAssinatura[]>> {
  return listarPlanos();
}

/** Criar plano (admin) */
export async function criarPlanoAdmin(dados: Omit<PlanoAssinatura, 'id'>): Promise<ResultadoServico<PlanoAssinatura>> {
  return adicionarPlano(dados);
}

/** Atualizar plano (admin) */
export async function atualizarPlanoAdmin(planoId: string, dados: Partial<PlanoAssinatura>): Promise<ResultadoServico<PlanoAssinatura>> {
  return atualizarPlano(planoId, dados);
}

/** Excluir plano (admin) */
export async function excluirPlanoAdmin(planoId: string): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  estadoGlobal.planos = (estadoGlobal.planos || []).filter((p) => p.id !== planoId);
  persistirEstado();

  return sucesso(undefined);
}

/** Listar assinaturas (admin) */
export async function listarAssinaturasAdmin(): Promise<ResultadoServico<Record<string, AssinaturaEstabelecimento>>> {
  await simularLatencia();
  simularErroAleatorio();

  // Simula assinaturas baseadas nos estabelecimentos aprovados
  const assinaturas: Record<string, AssinaturaEstabelecimento> = {};
  estadoGlobal.estabelecimentos.filter((e) => e.status === 'aprovado').forEach((est) => {
    assinaturas[est.id] = {
      planoId: 'mensal',
      inicioContrato: '2024-01-01',
      vencimento: '2024-02-01',
      historicoPagamentos: [
        { data: '2024-01-01', descricao: 'Mensalidade · 30 dias', valor: 89.90 },
      ],
    };
  });

  return sucesso(assinaturas);
}

// ============================================================================
// MENSAGENS - WRAPPERS PARA API OBJECT
// ============================================================================

/** Listar conversas (simulado) */
export async function listarConversas(): Promise<ResultadoServico<Array<{ id: string; participante: string; ultimaMensagem: string; data: number; naoLidas: number }>>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, buscaria de tabela de conversas
  // Aqui retorna vazio como placeholder
  return sucesso([]);
}

/** Obter mensagens de uma conversa (simulado) */
export async function obterMensagens(): Promise<ResultadoServico<Array<{ id: string; remetente: string; texto: string; data: number; lida: boolean }>>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, buscaria de tabela de mensagens
  return sucesso([]);
}

/** Enviar mensagem (simulado) */
export async function enviarMensagem(): Promise<ResultadoServico<void>> {
  await simularLatencia();
  simularErroAleatorio();

  // Em produção, salvaria na tabela de mensagens
  console.log('[MOCK] Mensagem enviada na conversa');
  return sucesso(undefined);
}

/** Objeto API agrupado por domínio para fácil importação */
export const api = {
  autenticacao: {
    login,
    cadastrar,
    renovarSessao,
    recuperarSenha,
    confirmarEmail,
    validarToken,
    alterarSenha,
    excluirConta,
  },
  estabelecimentos: {
    buscar: buscarEstabelecimentos,
    obter: obterEstabelecimento,
    obterPorSlug: obterEstabelecimentoPorSlug,
    criar: criarEstabelecimento,
    atualizar: atualizarEstabelecimento,
    excluir: excluirEstabelecimento,
    atualizarTema: atualizarTemaEstabelecimento,
    atualizarHorario: atualizarHorarioFuncionamento,
    atualizarConfiguracaoPix,
    atualizarMensagensAutomaticas,
    definirAutoEdicao,
    listarServicos,
    obterServico,
    criarServico,
    atualizarServico,
    excluirServico,
    reordenarServicos,
    listarGaleria,
    adicionarMidiaGaleria,
    removerMidiaGaleria,
    reordenarGaleria,
    listarAvaliacoes,
    responderAvaliacao,
    obterFila,
    entrarNaFila,
    sairDaFila,
    chamarProximo,
  },
  agendamentos: {
    listar: listarAgendamentos,
    obter: obterAgendamento,
    criar: criarAgendamento,
    reagendar: reagendarAgendamento,
    cancelar: cancelarAgendamento,
    confirmarPresenca,
    avaliar: avaliarAgendamento,
    obterHorariosDisponiveis,
    listarBarbeiro,
    atualizarStatus,
    definirHorarioReal,
  },
  feed: {
    listar: listarPublicacoes,
    obter: obterPublicacaoWrapper,
    criar: criarPublicacao,
    excluir: excluirPublicacao,
    curtir: curtirPublicacao,
    salvar: salvarPublicacao,
    obterSalvas,
    compartilhar: compartilharPublicacao,
    denunciar: denunciarPublicacao,
  },
  notificacoes: {
    listar: listarNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
    excluir: excluirNotificacao,
    excluirTodasLidas,
  },
  perfil: {
    obter: obterPerfil,
    atualizar: atualizarPerfil,
    alterarSenha,
    excluirConta,
  },
  barbeiro: {
    obterDashboard: obterDashboardBarbeiro,
    obterEstatisticas: obterEstatisticasBarbeiro,
  },
  admin: {
    listarUsuarios: listarUsuariosAdmin,
    obterUsuario: obterUsuarioAdmin,
    atualizarUsuario: atualizarUsuarioAdmin,
    excluirUsuario: excluirUsuarioAdmin,
    listarEstabelecimentos: listarEstabelecimentosAdmin,
    obterEstabelecimento: obterEstabelecimentoAdmin,
    aprovarEstabelecimento,
    rejeitarEstabelecimento,
    suspenderEstabelecimento,
    listarPagamentos: listarPagamentosAdmin,
    obterPlanos: obterPlanosAdmin,
    criarPlano: criarPlanoAdmin,
    atualizarPlano: atualizarPlanoAdmin,
    excluirPlano: excluirPlanoAdmin,
    listarAssinaturas: listarAssinaturasAdmin,
  },
  mensagens: {
    listarConversas,
    obterMensagens,
    enviarMensagem,
    enviarMensagemClientes,
  },
} as const;

