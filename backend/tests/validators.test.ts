import { describe, it, expect } from 'vitest';
import { cadastroSchema, loginSchema, estabelecimentoSchema, servicoSchema, profissionalSchema, agendamentoSchema } from '@/validators/schemas';

describe('Validadores Zod', () => {
  describe('cadastroSchema', () => {
    it('deve validar dados corretos de cadastro', () => {
      const data = {
        nome: 'João Silva',
        email: 'joao@email.com',
        senha: 'Senha123',
        telefone: '(11) 99999-9999',
        tipo: 'cliente' as const,
      };
      const result = cadastroSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const data = {
        nome: 'João',
        email: 'email-invalido',
        senha: 'Senha123',
        tipo: 'cliente' as const,
      };
      const result = cadastroSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha sem número', () => {
      const data = {
        nome: 'João',
        email: 'joao@email.com',
        senha: 'SenhaSemNumero',
        tipo: 'cliente' as const,
      };
      const result = cadastroSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar senha muito curta', () => {
      const data = {
        nome: 'João',
        email: 'joao@email.com',
        senha: 'Sen1',
        tipo: 'cliente' as const,
      };
      const result = cadastroSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar telefone com formato inválido', () => {
      const data = {
        nome: 'João',
        email: 'joao@email.com',
        senha: 'Senha123',
        telefone: '11999999999',
        tipo: 'cliente' as const,
      };
      const result = cadastroSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('deve validar login correto', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com', senha: '123456' });
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const result = loginSchema.safeParse({ email: 'invalido', senha: '123456' });
      expect(result.success).toBe(false);
    });
  });

  describe('estabelecimentoSchema', () => {
    it('deve validar estabelecimento correto', () => {
      const data = {
        slug: 'barbearia-do-carlos',
        nome: 'Barbearia do Carlos',
        responsavel: 'Carlos Silva',
        cidade: 'Belo Horizonte',
        nicho: 'Barbearia',
        whatsapp: '(31) 99999-9999',
        endereco: 'Rua das Flores, 123',
      };
      const result = estabelecimentoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar slug inválido', () => {
      const data = {
        slug: 'Barbearia Do Carlos',
        nome: 'Barbearia do Carlos',
        responsavel: 'Carlos Silva',
        cidade: 'Belo Horizonte',
        nicho: 'Barbearia',
        whatsapp: '(31) 99999-9999',
        endereco: 'Rua das Flores, 123',
      };
      const result = estabelecimentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('servicoSchema', () => {
    it('deve validar serviço correto', () => {
      const data = {
        nome: 'Corte de Cabelo',
        descricao: 'Corte masculino',
        preco: 35.00,
        duracaoMinutos: 30,
      };
      const result = servicoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar preço negativo', () => {
      const data = {
        nome: 'Corte',
        preco: -10,
        duracaoMinutos: 30,
      };
      const result = servicoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('profissionalSchema', () => {
    it('deve validar profissional correto', () => {
      const data = {
        nome: 'Carlos Barbeiro',
        email: 'carlos@barbearia.com',
        telefone: '(31) 99999-9999',
        especialidades: ['Corte', 'Barba'],
      };
      const result = profissionalSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('agendamentoSchema', () => {
    it('deve validar agendamento correto', () => {
      const data = {
        estabelecimentoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        profissionalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        servicos: [{ servicoId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', quantidade: 1 }],
        dataHoraInicio: '2026-12-01T10:00:00.000Z',
      };
      const result = agendamentoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar array de serviços vazio', () => {
      const data = {
        estabelecimentoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        profissionalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        servicos: [],
        dataHoraInicio: '2026-12-01T10:00:00.000Z',
      };
      const result = agendamentoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});