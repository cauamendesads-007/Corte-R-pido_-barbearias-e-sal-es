/**
 * PainelAdmin - Dashboard administrativo principal.
 * Compose todos os sub-componentes do feature admin.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Container, ToastProvider, Avatar, useGlobalToast } from '@/componentes';
import type { AbaAdmin, EstabelecimentoAdmin, UsuarioAdmin, PlanoAdmin, MetricasAdminData } from '../types';
import { MetricasAdmin } from './MetricasAdmin';
import { AbasAdmin } from './AbasAdmin';
import { PainelEstabelecimentosAdmin } from './PainelEstabelecimentosAdmin';
import { PainelUsuariosAdmin } from './PainelUsuariosAdmin';
import { PainelAnalisesAdmin } from './PainelAnalisesAdmin';
import { PainelConfiguracoesAdmin } from './PainelConfiguracoesAdmin';
import './PainelAdmin.css';

const ESTABELECIMENTOS_INICIAIS: EstabelecimentoAdmin[] = [
  { id: '1', nome: 'Barbearia do João', proprietario: 'João Silva', cidade: 'Belo Horizonte', nicho: 'barbearia', status: 'ativo', plano: 'profissional', agendamentosMes: 124, avaliacao: 4.8, dataCadastro: '2024-01-15' },
  { id: '2', nome: 'Salão Bella', proprietario: 'Maria Santos', cidade: 'Belo Horizonte', nicho: 'feminino', status: 'ativo', plano: 'essencial', agendamentosMes: 89, avaliacao: 4.6, dataCadastro: '2024-02-20' },
  { id: '3', nome: 'Visagismo Arte', proprietario: 'Carlos Lima', cidade: 'Contagem', nicho: 'visagismo', status: 'pendente', plano: 'premium', agendamentosMes: 0, avaliacao: 0, dataCadastro: '2024-12-01' },
  { id: '4', nome: 'Kids Cut', proprietario: 'Ana Paula', cidade: 'Betim', nicho: 'infantil', status: 'suspenso', plano: 'essencial', agendamentosMes: 45, avaliacao: 4.2, dataCadastro: '2024-03-10' },
  { id: '5', nome: 'Barbearia Premium', proprietario: 'Roberto', cidade: 'Belo Horizonte', nicho: 'barbearia', status: 'ativo', plano: 'premium', agendamentosMes: 203, avaliacao: 4.9, dataCadastro: '2023-11-05' },
];

const USUARIOS_INICIAIS: UsuarioAdmin[] = [
  { id: '1', nome: 'João Silva', email: 'joao@email.com', telefone: '(31) 99999-1111', papel: 'barbeiro', estabelecimento: 'Barbearia do João', status: 'ativo', dataCadastro: '2024-01-15' },
  { id: '2', nome: 'Maria Santos', email: 'maria@email.com', telefone: '(31) 99999-2222', papel: 'barbeiro', estabelecimento: 'Salão Bella', status: 'ativo', dataCadastro: '2024-02-20' },
  { id: '3', nome: 'Carlos Cliente', email: 'carlos@email.com', telefone: '(31) 99999-3333', papel: 'cliente', estabelecimento: '-', status: 'ativo', dataCadastro: '2024-03-01' },
  { id: '4', nome: 'Ana Paula', email: 'ana@email.com', telefone: '(31) 99999-4444', papel: 'barbeiro', estabelecimento: 'Kids Cut', status: 'suspenso', dataCadastro: '2024-03-10' },
  { id: '5', nome: 'Roberto Admin', email: 'roberto@admin.com', telefone: '(31) 99999-5555', papel: 'admin', estabelecimento: '-', status: 'ativo', dataCadastro: '2023-10-01' },
];

const PLANOS_INICIAIS: PlanoAdmin[] = [
  { id: 'essencial', nome: 'Essencial', preco: 49, cor: '#64748b', limites: { barbeiros: 1, servicos: 10, fotos: 20, analises: false, api: false } },
  { id: 'profissional', nome: 'Profissional', preco: 99, cor: '#0ea5e9', limites: { barbeiros: 3, servicos: 50, fotos: 100, analises: true, api: false } },
  { id: 'premium', nome: 'Premium', preco: 199, cor: '#f59e0b', limites: { barbeiros: 10, servicos: -1, fotos: -1, analises: true, api: true } },
];

const PainelAdmin = () => {
  const { usuario } = useAuth();
  const { sucesso } = useGlobalToast();

  const [abaAtiva, setAbaAtiva] = useState<AbaAdmin>('visao');
  const [buscaEstabelecimentos, setBuscaEstabelecimentos] = useState('');
  const [buscaUsuarios, setBuscaUsuarios] = useState('');
  const [filtroStatusEstab, setFiltroStatusEstab] = useState<'todos' | 'ativo' | 'pendente' | 'suspenso'>('todos');
  const [filtroTipoUsuario, setFiltroTipoUsuario] = useState<'todos' | 'cliente' | 'barbeiro' | 'admin'>('todos');
  const [estabelecimentos] = useState<EstabelecimentoAdmin[]>(ESTABELECIMENTOS_INICIAIS);
  const [usuarios] = useState<UsuarioAdmin[]>(USUARIOS_INICIAIS);
  const [planos] = useState<PlanoAdmin[]>(PLANOS_INICIAIS);

  const metricas = useMemo((): MetricasAdminData => ({
    totalEstabelecimentos: estabelecimentos.length,
    ativos: estabelecimentos.filter((e) => e.status === 'ativo').length,
    pendentes: estabelecimentos.filter((e) => e.status === 'pendente').length,
    suspensos: estabelecimentos.filter((e) => e.status === 'suspenso').length,
    totalUsuarios: usuarios.length,
    barbeiros: usuarios.filter((u) => u.papel === 'barbeiro').length,
    clientes: usuarios.filter((u) => u.papel === 'cliente').length,
    agendamentosMes: estabelecimentos.reduce((s, e) => s + e.agendamentosMes, 0),
    receitaEstimada: estabelecimentos.reduce((s, e) => s + (e.plano === 'premium' ? 199 : e.plano === 'profissional' ? 99 : 49), 0),
  }), [estabelecimentos, usuarios]);

  const abasConfig = useMemo(() => [
    { id: 'visao' as AbaAdmin, contador: undefined },
    { id: 'estabelecimentos' as AbaAdmin, contador: metricas.totalEstabelecimentos },
    { id: 'usuarios' as AbaAdmin, contador: metricas.totalUsuarios },
    { id: 'analises' as AbaAdmin, contador: undefined },
    { id: 'configuracoes' as AbaAdmin, contador: undefined },
  ], [metricas.totalEstabelecimentos, metricas.totalUsuarios]);

  const handleAprovarEstabelecimento = () => sucesso('Estabelecimento aprovado!');
  const handleSuspenderEstabelecimento = () => sucesso('Estabelecimento suspenso!');
  const handleAlterarStatusUsuario = () => sucesso('Status do usuário alterado!');

  if (!usuario || usuario.papel !== 'admin') {
    return (
      <Container variante="com-cabecalho">
        <div className="admin__acesso-negado" data-testid="admin-acesso-negado">
          <h1>Acesso restrito</h1>
          <p>Esta área é exclusiva para administradores.</p>
        </div>
      </Container>
    );
  }

  return (
    <ToastProvider>
      <Container variante="com-cabecalho" data-testid="painel-admin-container">
        {/* Header */}
        <header className="admin__cabecalho" data-testid="admin-cabecalho">
          <div className="admin__info">
            <h1 className="admin__titulo">Painel Admin</h1>
            <p className="admin__subtitulo">Corte Rápido - Administração</p>
          </div>
          <Avatar
            src={usuario.avatar}
            nome={usuario.nome}
            corFundo="#dc2626"
            tamanho="pequeno"
            data-testid="admin-avatar"
          />
        </header>

        {/* Métricas */}
        <MetricasAdmin metricas={metricas} />

        {/* Abas */}
        <AbasAdmin
          abaAtiva={abaAtiva}
          onMudarAba={setAbaAtiva}
          abas={abasConfig}
        />

        {/* Painéis por aba */}
        <PainelEstabelecimentosAdmin
          estabelecimentos={estabelecimentos}
          busca={buscaEstabelecimentos}
          filtroStatus={filtroStatusEstab}
          onBuscaChange={setBuscaEstabelecimentos}
          onFiltroStatusChange={setFiltroStatusEstab}
          onAprovar={handleAprovarEstabelecimento}
          onSuspender={handleSuspenderEstabelecimento}
          onEditar={() => {}}
        />

        <PainelUsuariosAdmin
          usuarios={usuarios}
          busca={buscaUsuarios}
          filtroTipo={filtroTipoUsuario}
          onBuscaChange={setBuscaUsuarios}
          onFiltroTipoChange={setFiltroTipoUsuario}
          onAlterarStatus={handleAlterarStatusUsuario}
          onEditar={() => {}}
        />

        <PainelAnalisesAdmin metricas={metricas} />

        <PainelConfiguracoesAdmin planos={planos} />
      </Container>
    </ToastProvider>
  );
};

export default PainelAdmin;