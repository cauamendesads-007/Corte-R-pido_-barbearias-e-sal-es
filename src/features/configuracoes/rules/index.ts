/**
 * Regras puras de negócio do domínio Configurações.
 * Zero dependências de React, < 30 linhas cada, early returns, constantes no topo.
 */

import type {
  ConfiguracoesConta,
  ConfiguracoesAparencia,
  ConfiguracoesNotificacoes,
  ConfiguracoesPrivacidade,
  ConfiguracoesSeguranca,
} from '../types';

// Constantes
const TEMAS_VALIDOS = ['claro', 'escuro', 'sistema'] as const;
const TAMANHOS_FONTE = ['pequeno', 'medio', 'grande'] as const;
const IDIOMAS_VALIDOS = ['pt-BR', 'en', 'es'] as const;
const FORMATOS_HORA = ['12h', '24h'] as const;
const VISIBILIDADES = ['publico', 'apenas_conexoes', 'privado'] as const;
const PERMISSOES_MENSAGENS = ['todos', 'conexoes', 'ninguem'] as const;
const METODOS_2FA = ['app', 'sms', 'email'] as const;

/**
 * Valida configurações da conta.
 */
export function validarConfiguracoesConta(dados: Partial<ConfiguracoesConta>): string | null {
  if (dados.nome !== undefined) {
    const nome = dados.nome.trim();
    if (!nome) return 'Nome é obrigatório';
    if (nome.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
    if (nome.length > 100) return 'Nome deve ter no máximo 100 caracteres';
  }

  if (dados.email !== undefined) {
    if (!dados.email?.trim()) return 'E-mail é obrigatório';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return 'E-mail inválido';
  }

  if (dados.telefone !== undefined && dados.telefone) {
    const numeros = dados.telefone.replace(/\D/g, '');
    if (numeros.length < 10 || numeros.length > 11) return 'Telefone inválido';
  }

  if (dados.username !== undefined && dados.username) {
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(dados.username)) {
      return 'Nome de usuário inválido (3-30 caracteres, apenas letras, números e _)';
    }
  }

  if (dados.bio !== undefined && dados.bio.length > 500) {
    return 'Bio deve ter no máximo 500 caracteres';
  }

  return null;
}

/**
 * Valida configurações de aparência.
 */
export function validarConfiguracoesAparencia(dados: Partial<ConfiguracoesAparencia>): string | null {
  if (dados.tema !== undefined && !TEMAS_VALIDOS.includes(dados.tema)) {
    return 'Tema inválido';
  }

  if (dados.fonteTamanho !== undefined && !TAMANHOS_FONTE.includes(dados.fonteTamanho)) {
    return 'Tamanho de fonte inválido';
  }

  if (dados.idioma !== undefined && !IDIOMAS_VALIDOS.includes(dados.idioma)) {
    return 'Idioma inválido';
  }

  if (dados.formatoHora !== undefined && !FORMATOS_HORA.includes(dados.formatoHora)) {
    return 'Formato de hora inválido';
  }

  if (dados.primeiraDiaSemana !== undefined && ![0, 1, 6].includes(dados.primeiraDiaSemana)) {
    return 'Primeiro dia da semana inválido';
  }

  return null;
}

/**
 * Valida configurações de notificações.
 */
export function validarConfiguracoesNotificacoes(dados: Partial<ConfiguracoesNotificacoes>): string | null {
  if (dados.naoPerturbarInicio !== undefined && dados.naoPerturbarInicio) {
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dados.naoPerturbarInicio)) {
      return 'Horário de início do "Não perturbar" inválido (use HH:mm)';
    }
  }

  if (dados.naoPerturbarFim !== undefined && dados.naoPerturbarFim) {
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(dados.naoPerturbarFim)) {
      return 'Horário de fim do "Não perturbar" inválido (use HH:mm)';
    }
  }

  return null;
}

/**
 * Valida configurações de privacidade.
 */
export function validarConfiguracoesPrivacidade(dados: Partial<ConfiguracoesPrivacidade>): string | null {
  if (dados.visibilidadePerfil !== undefined && !VISIBILIDADES.includes(dados.visibilidadePerfil)) {
    return 'Visibilidade de perfil inválida';
  }

  if (dados.permitirMensagens !== undefined && !PERMISSOES_MENSAGENS.includes(dados.permitirMensagens)) {
    return 'Permissão de mensagens inválida';
  }

  if (dados.permitirConvites !== undefined && !PERMISSOES_MENSAGENS.includes(dados.permitirConvites)) {
    return 'Permissão de convites inválida';
  }

  return null;
}

/**
 * Valida configurações de segurança.
 */
export function validarConfiguracoesSeguranca(dados: Partial<ConfiguracoesSeguranca>): string | null {
  if (dados.doisFatoresMetodo !== undefined && !METODOS_2FA.includes(dados.doisFatoresMetodo)) {
    return 'Método de 2FA inválido';
  }

  if (dados.bloquearAposTentativas !== undefined) {
    if (dados.bloquearAposTentativas < 3 || dados.bloquearAposTentativas > 20) {
      return 'Bloqueio deve ser entre 3 e 20 tentativas';
    }
  }

  if (dados.tempoBloqueio !== undefined) {
    if (dados.tempoBloqueio < 5 || dados.tempoBloqueio > 1440) {
      return 'Tempo de bloqueio deve ser entre 5 e 1440 minutos';
    }
  }

  return null;
}

/**
 * Valida senha.
 */
export function validarSenha(senhaAtual: string, novaSenha: string, confirmarNovaSenha: string): string | null {
  if (!senhaAtual) return 'Senha atual é obrigatória';
  if (!novaSenha) return 'Nova senha é obrigatória';
  if (novaSenha.length < 8) return 'Nova senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(novaSenha)) return 'Nova senha deve conter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(novaSenha)) return 'Nova senha deve conter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(novaSenha)) return 'Nova senha deve conter pelo menos um número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(novaSenha)) {
    return 'Nova senha deve conter pelo menos um caractere especial';
  }
  if (novaSenha !== confirmarNovaSenha) return 'As senhas não conferem';
  if (senhaAtual === novaSenha) return 'Nova senha deve ser diferente da atual';
  return null;
}

/**
 * Valida exclusão de conta.
 */
export function validarExclusaoConta(senha: string, confirmacao: string): string | null {
  if (!senha) return 'Senha é obrigatória para confirmar exclusão';
  if (confirmacao !== 'EXCLUIR MINHA CONTA') return 'Digite "EXCLUIR MINHA CONTA" para confirmar';
  return null;
}

/**
 * Sanitiza configurações da conta.
 */
export function sanitizarConfiguracoesConta(dados: Partial<ConfiguracoesConta>): Partial<ConfiguracoesConta> {
  return {
    ...dados,
    nome: dados.nome?.trim(),
    email: dados.email?.trim().toLowerCase(),
    telefone: dados.telefone?.replace(/\D/g, ''),
    username: dados.username?.trim().toLowerCase(),
    bio: dados.bio?.trim(),
  };
}

/**
 * Cria erro padronizado para configurações.
 */
export function criarConfiguracoesError(mensagem: string, codigo: string = 'CONFIGURACOES_ERROR'): Error & { codigo: string } {
  const error = new Error(mensagem) as Error & { codigo: string };
  error.codigo = codigo;
  return error;
}

/**
 * Trata erros de API de forma padronizada.
 */
export function handleApiError(status: number, errorData: Record<string, unknown>): import('../types').ConfiguracoesResult<never> {
  const mensagens: Record<number, string> = {
    400: 'Dados inválidos',
    401: 'Não autorizado',
    403: 'Acesso negado',
    404: 'Não encontrado',
    409: 'Conflito',
    422: 'Dados de entrada inválidos',
    429: 'Muitas requisições',
    500: 'Erro interno do servidor',
    503: 'Serviço indisponível',
  };

  const mensagem = (errorData?.mensagem as string) || mensagens[status] || 'Erro desconhecido';
  const codigo = (errorData?.codigo as string) || `HTTP_${status}`;

  return { sucesso: false, erro: mensagem, codigo };
}

/**
 * Obtém label do tema.
 */
export function obterLabelTema(tema: string): string {
  const labels: Record<string, string> = {
    claro: 'Claro',
    escuro: 'Escuro',
    sistema: 'Sistema',
  };
  return labels[tema] || tema;
}

/**
 * Obtém label do tamanho de fonte.
 */
export function obterLabelFonteTamanho(tamanho: string): string {
  const labels: Record<string, string> = {
    pequeno: 'Pequeno',
    medio: 'Médio',
    grande: 'Grande',
  };
  return labels[tamanho] || tamanho;
}

/**
 * Obtém label da visibilidade.
 */
export function obterLabelVisibilidade(visibilidade: string): string {
  const labels: Record<string, string> = {
    publico: 'Público',
    apenas_conexoes: 'Apenas conexões',
    privado: 'Privado',
  };
  return labels[visibilidade] || visibilidade;
}

/**
 * Obtém label da permissão de mensagens.
 */
export function obterLabelPermissaoMensagens(permissao: string): string {
  const labels: Record<string, string> = {
    todos: 'Todos',
    conexoes: 'Apenas conexões',
    ninguem: 'Ninguém',
  };
  return labels[permissao] || permissao;
}

/**
 * Obtém label do método 2FA.
 */
export function obterLabelMetodo2FA(metodo: string): string {
  const labels: Record<string, string> = {
    app: 'App autenticador (Google Authenticator, Authy, etc.)',
    sms: 'SMS',
    email: 'E-mail',
  };
  return labels[metodo] || metodo;
}

/**
 * Formata data relativa (ex: "2 dias atrás", "Hoje", "Em 3 dias").
 */
export function formatarDataRelativa(dataISO: string): string {
  const data = new Date(dataISO);
  const agora = new Date();
  const diffMs = data.getTime() - agora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return `${Math.abs(diffDias)} dia${Math.abs(diffDias) !== 1 ? 's' : ''} atrás`;
  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  if (diffDias <= 7) return `Em ${diffDias} dia${diffDias !== 1 ? 's' : ''}`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}