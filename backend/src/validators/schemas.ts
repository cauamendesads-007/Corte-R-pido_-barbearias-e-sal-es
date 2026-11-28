import { z } from 'zod';

export const cadastroSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  senha: z.string().min(8).max(100).regex(/[A-Za-z]/).regex(/[0-9]/),
  telefone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/).optional(),
  tipo: z.enum(['cliente', 'profissional', 'estabelecimento']),
  estabelecimentoId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export const estabelecimentoSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  nome: z.string().min(2).max(100),
  responsavel: z.string().min(2).max(100),
  cidade: z.string().min(2).max(50),
  nicho: z.string().min(2).max(50),
  whatsapp: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/),
  endereco: z.string().min(5).max(200),
  sobre: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  temaCor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  temaLayout: z.enum(['classico', 'moderno', 'minimalista']).optional(),
  temaTitulo: z.string().max(50).optional(),
  temaSubtitulo: z.string().max(100).optional(),
  tempoMedioAtendimento: z.number().int().positive().optional(),
  horarioFuncionamento: z.record(z.string()).optional(),
  permiteAutoEdicao: z.boolean().optional(),
  configuracaoPixModo: z.enum(['obrigatorio', 'opcional', 'desativado']).optional(),
  configuracaoPixChave: z.string().max(100).optional(),
  configuracaoPixPercentualSinal: z.number().int().min(0).max(100).optional(),
  taxaFidelidade: z.number().int().min(0).max(100).optional(),
});

export const servicoSchema = z.object({
  nome: z.string().min(2).max(100),
  descricao: z.string().max(500).optional(),
  preco: z.number().positive(),
  duracaoMinutos: z.number().int().positive(),
  ordemExibicao: z.number().int().min(0).optional(),
  ativo: z.boolean().optional(),
});

export const profissionalSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email().optional(),
  telefone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/).optional(),
  especialidades: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export const agendamentoSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  profissionalId: z.string().uuid(),
  servicos: z.array(z.object({
    servicoId: z.string().uuid(),
    quantidade: z.number().int().positive().default(1),
  })).min(1),
  dataHoraInicio: z.string().datetime(),
  observacoes: z.string().max(500).optional(),
});

export const avaliacaoSchema = z.object({
  agendamentoId: z.string().uuid(),
  estrelas: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

export const pagamentoSchema = z.object({
  agendamentoId: z.string().uuid(),
  valor: z.number().positive(),
  metodo: z.enum(['pix', 'cartao_credito', 'cartao_debito', 'dinheiro']),
  status: z.enum(['pendente', 'pago', 'estornado', 'falhou']).default('pendente'),
});

export const publicacaoSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  legenda: z.string().max(500).optional(),
  arquivoUrl: z.string().url().optional(),
  tipo: z.enum(['imagem', 'video']),
});

export const notificacaoSchema = z.object({
  usuarioId: z.string().uuid(),
  tipo: z.enum(['agendamento', 'pagamento', 'avaliacao', 'mensagem', 'sistema']),
  titulo: z.string().min(1).max(100),
  mensagem: z.string().min(1).max(500),
  dadosExtras: z.record(z.unknown()).optional(),
});

export const planoAssinaturaSchema = z.object({
  nome: z.string().min(2).max(50),
  descricao: z.string().max(200).optional(),
  precoMensal: z.number().positive(),
  precoAnual: z.number().positive().optional(),
  limiteProfissionais: z.number().int().positive().default(5),
  limiteServicos: z.number().int().positive().default(20),
  recursos: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export const assinaturaSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  planoId: z.string().uuid(),
  ciclo: z.enum(['mensal', 'anual']).default('mensal'),
  formaPagamento: z.enum(['cartao', 'pix', 'boleto']).optional(),
});

export const relatorioFaturamentoSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  meses: z.number().int().positive().max(24).default(6),
});

export const relatorioAgendaSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  data: z.string().date(),
  profissionalId: z.string().uuid().optional(),
});

export const relatorioServicosSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  dias: z.number().int().positive().max(365).default(30),
});

export const relatorioClientesFieisSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  limite: z.number().int().positive().max(100).default(10),
});

export const relatorioHorariosPicoSchema = z.object({
  estabelecimentoId: z.string().uuid(),
});

export const relatorioAvaliacoesSchema = z.object({
  estabelecimentoId: z.string().uuid(),
});

export const relatorioAuditoriaPrecosSchema = z.object({
  estabelecimentoId: z.string().uuid(),
});

export const adminModeracaoSchema = z.object({
  estabelecimentoId: z.string().uuid(),
  acao: z.enum(['aprovar', 'rejeitar', 'suspender', 'reativar']),
  motivo: z.string().max(500).optional(),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EstabelecimentoInput = z.infer<typeof estabelecimentoSchema>;
export type ServicoInput = z.infer<typeof servicoSchema>;
export type ProfissionalInput = z.infer<typeof profissionalSchema>;
export type AgendamentoInput = z.infer<typeof agendamentoSchema>;
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;
export type PagamentoInput = z.infer<typeof pagamentoSchema>;
export type PublicacaoInput = z.infer<typeof publicacaoSchema>;
export type NotificacaoInput = z.infer<typeof notificacaoSchema>;
export type PlanoAssinaturaInput = z.infer<typeof planoAssinaturaSchema>;
export type AssinaturaInput = z.infer<typeof assinaturaSchema>;
export type RelatorioFaturamentoInput = z.infer<typeof relatorioFaturamentoSchema>;
export type RelatorioAgendaInput = z.infer<typeof relatorioAgendaSchema>;
export type RelatorioServicosInput = z.infer<typeof relatorioServicosSchema>;
export type RelatorioClientesFieisInput = z.infer<typeof relatorioClientesFieisSchema>;
export type RelatorioHorariosPicoInput = z.infer<typeof relatorioHorariosPicoSchema>;
export type RelatorioAvaliacoesInput = z.infer<typeof relatorioAvaliacoesSchema>;
export type RelatorioAuditoriaPrecosInput = z.infer<typeof relatorioAuditoriaPrecosSchema>;
export type AdminModeracaoInput = z.infer<typeof adminModeracaoSchema>;