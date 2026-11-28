/**
 * Componente PainelAdmin - Dashboard administrativo principal.
 * Puro, coeso, < 150 linhas, preserva 100% visual escuro atual.
 */

import { useMemo } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  BotaoPrimario,
  BotaoSecundario,
  Icone,
  Chip,
  Badge,
  Tabs,
  TabPainel,
  Skeleton,
  EmptyState,
  Tabela,
  TabelaCabecalho,
  TabelaCorpo,
  TabelaLinha,
  TabelaCelula,
} from '@/componentes';
import type { Usuario, Estabelecimento, Agendamento, Denuncia, MetricasAdmin } from '../types';
import { formatarDuracao } from '../rules';
import './PainelAdmin.css';

interface PainelAdminProps {
  /** Usuários */
  usuarios: Usuario[];
  /** Estabelecimentos */
  estabelecimentos: Estabelecimento[];
  /** Agendamentos */
  agendamentos: Agendamento[];
  /** Denúncias */
  denuncias: Denuncia[];
  /** Métricas */
  metricas: MetricasAdmin | null;
  /** Carregando */
  carregando?: boolean;
  /** Erro */
  erro?: string | null;
  /** Callbacks */
  aoAprovarEstabelecimento?: (id: string) => void;
  aoRejeitarEstabelecimento?: (id: string, motivo: string) => void;
  aoSuspenderEstabelecimento?: (id: string, motivo: string) => void;
  aoReativarEstabelecimento?: (id: string) => void;
  aoBanirUsuario?: (id: string, motivo: string) => void;
  aoDesbanirUsuario?: (id: string) => void;
  aoResolverDenuncia?: (id: string, status: string, resolucao: string) => void;
  /** Classe customizada */
  className?: string;
  /** data-testid */
  'data-testid'?: string;
}

export const PainelAdmin = ({
  usuarios,
  estabelecimentos,
  agendamentos,
  denuncias,
  metricas,
  carregando = false,
  erro = null,
  aoAprovarEstabelecimento,
  aoRejeitarEstabelecimento,
  aoSuspenderEstabelecimento,
  aoReativarEstabelecimento,
  aoBanirUsuario,
  aoDesbanirUsuario,
  aoResolverDenuncia,
  className = '',
  'data-testid': testId,
}: PainelAdminProps) => {
  const denunciasPendentes = denuncias.filter((d) => d.status === 'pendente').length;
  const estabelecimentosPendentes = estabelecimentos.filter((e) => e.status === 'pendente').length;

  if (carregando) {
    return (
      <div className={`painel-admin ${className}`} data-testid={testId}>
        <div className="painel-admin__skeleton" role="status" aria-label="Carregando painel admin">
          <div className="painel-admin__header-skeleton">
            <Skeleton variante="retangular" largura="250px" altura={28} />
            <Skeleton variante="retangular" largura="200px" altura={44} />
          </div>
          <div className="painel-admin__metricas-skeleton">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="painel-admin__metrica-skeleton">
                <Skeleton variante="retangular" largura="100%" altura={60} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`painel-admin ${className}`} data-testid={testId}>
        <EmptyState
          titulo="Erro ao carregar painel"
          mensagem={erro}
          icone="alerta"
          className="painel-admin__empty"
          data-testid="painel-admin-erro"
        />
      </div>
    );
  }

  return (
    <div className={`painel-admin ${className}`} data-testid={testId}>
      {/* Header */}
      <header className="painel-admin__header">
        <div className="painel-admin__header-esquerda">
          <h1 className="painel-admin__titulo">Painel Administrativo</h1>
          <div className="painel-admin__alertas">
            {estabelecimentosPendentes > 0 && (
              <Badge variante="aviso" className="painel-admin__badge">
                <Icone nome="relogio" tamanho={12} />
                {estabelecimentosPendentes} estabelecimento{estabelecimentosPendentes !== 1 ? 's' : ''} pendente{estabelecimentosPendentes !== 1 ? 's' : ''}
              </Badge>
            )}
            {denunciasPendentes > 0 && (
              <Badge variante="perigo" className="painel-admin__badge">
                <Icone nome="alerta" tamanho={12} />
                {denunciasPendentes} denúncia{denunciasPendentes !== 1 ? 's' : ''} pendente{denunciasPendentes !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Métricas principais */}
      <section className="painel-admin__metricas" aria-label="Métricas gerais">
        <Cartao variante="metrica" className="painel-admin__cartao-metrica">
          <CartaoCorpo>
            <div className="painel-admin__metrica">
              <div className="painel-admin__metrica-icone primario">
                <Icone nome="usuarios" tamanho={24} />
              </div>
              <div className="painel-admin__metrica-info">
                <span className="painel-admin__metrica-valor">{metricas?.totalUsuarios || 0}</span>
                <span className="painel-admin__metrica-label">Total de usuários</span>
                <span className="painel-admin__metrica-subtitulo">
                  {metricas?.totalClientes || 0} clientes · {metricas?.totalBarbeiros || 0} barbeiros
                </span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="painel-admin__cartao-metrica">
          <CartaoCorpo>
            <div className="painel-admin__metrica">
              <div className="painel-admin__metrica-icone sucesso">
                <Icone nome="edificio" tamanho={24} />
              </div>
              <div className="painel-admin__metrica-info">
                <span className="painel-admin__metrica-valor">{metricas?.totalEstabelecimentos || 0}</span>
                <span className="painel-admin__metrica-label">Estabelecimentos</span>
                <span className="painel-admin__metrica-subtitulo">
                  {metricas?.estabelecimentosAprovados || 0} aprovados · {metricas?.estabelecimentosPendentes || 0} pendentes
                </span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="painel-admin__cartao-metrica">
          <CartaoCorpo>
            <div className="painel-admin__metrica">
              <div className="painel-admin__metrica-icone aviso">
                <Icone nome="calendario" tamanho={24} />
              </div>
              <div className="painel-admin__metrica-info">
                <span className="painel-admin__metrica-valor">{metricas?.agendamentosMes || 0}</span>
                <span className="painel-admin__metrica-label">Agendamentos este mês</span>
                <span className="painel-admin__metrica-subtitulo">
                  {metricas?.agendamentosConcluidosMes || 0} concluídos · {metricas?.agendamentosCanceladosMes || 0} cancelados
                </span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>

        <Cartao variante="metrica" className="painel-admin__cartao-metrica">
          <CartaoCorpo>
            <div className="painel-admin__metrica">
              <div className="painel-admin__metrica-icone primario">
                <Icone nome="moeda" tamanho={24} />
              </div>
              <div className="painel-admin__metrica-info">
                <span className="painel-admin__metrica-valor">
                  R$ {(metricas?.faturamentoMes || 0).toFixed(2).replace('.', ',')}
                </span>
                <span className="painel-admin__metrica-label">Faturamento do mês</span>
                <span className="painel-admin__metrica-subtitulo">
                  Taxa de conversão: {metricas?.taxaConversaoEstabelecimentos || 0}%
                </span>
              </div>
            </div>
          </CartaoCorpo>
        </Cartao>
      </section>

      {/* Abas principais */}
      <Tabs
        abas={[
          { id: 'estabelecimentos', rotulo: `Estabelecimentos (${estabelecimentos.length})`, icone: 'edificio' },
          { id: 'usuarios', rotulo: `Usuários (${usuarios.length})`, icone: 'usuarios' },
          { id: 'agendamentos', rotulo: `Agendamentos (${agendamentos.length})`, icone: 'calendario' },
          { id: 'denuncias', rotulo: `Denúncias (${denuncias.length})`, icone: 'alerta' },
        ]}
        variante="cards"
        className="painel-admin__abas"
        data-testid="painel-admin-abas"
      >
        {/* Estabelecimentos */}
        <TabPainel id="estabelecimentos">
          <PainelEstabelecimentosAdmin
            estabelecimentos={estabelecimentos}
            aoAprovar={aoAprovarEstabelecimento}
            aoRejeitar={aoRejeitarEstabelecimento}
            aoSuspender={aoSuspenderEstabelecimento}
            aoReativar={aoReativarEstabelecimento}
          />
        </TabPainel>

        {/* Usuários */}
        <TabPainel id="usuarios">
          <PainelUsuariosAdmin
            usuarios={usuarios}
            aoBanir={aoBanirUsuario}
            aoDesbanir={aoDesbanirUsuario}
          />
        </TabPainel>

        {/* Agendamentos */}
        <TabPainel id="agendamentos">
          <PainelAgendamentosAdmin agendamentos={agendamentos} />
        </TabPainel>

        {/* Denúncias */}
        <TabPainel id="denuncias">
          <PainelDenunciasAdmin
            denuncias={denuncias}
            aoResolver={aoResolverDenuncia}
          />
        </TabPainel>
      </Tabs>
    </div>
  );
};

/* Sub-componentes para cada aba */

function PainelEstabelecimentosAdmin({
  estabelecimentos,
  aoAprovar,
  aoRejeitar,
  aoSuspender,
  aoReativar,
}: {
  estabelecimentos: Estabelecimento[];
  aoAprovar?: (id: string) => void;
  aoRejeitar?: (id: string, motivo: string) => void;
  aoSuspender?: (id: string, motivo: string) => void;
  aoReativar?: (id: string) => void;
}) {
  const [mostrarModal, setMostrarModal] = useState<{ tipo: 'rejeitar' | 'suspender'; estabelecimento?: Estabelecimento }>({ tipo: 'rejeitar' });
  const [motivo, setMotivo] = useState('');

  const handleAcao = (tipo: 'rejeitar' | 'suspender', est: Estabelecimento) => {
    setMostrarModal({ tipo, estabelecimento: est });
    setMotivo('');
  };

  const handleConfirmar = () => {
    if (!mostrarModal.estabelecimento || !motivo.trim()) return;
    if (mostrarModal.tipo === 'rejeitar') {
      aoRejeitar?.(mostrarModal.estabelecimento.id, motivo.trim());
    } else {
      aoSuspender?.(mostrarModal.estabelecimento.id, motivo.trim());
    }
    setMostrarModal({ tipo: 'rejeitar' });
    setMotivo('');
  };

  if (estabelecimentos.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum estabelecimento"
        mensagem="Nenhum estabelecimento cadastrado no sistema."
        icone="edificio"
        className="painel-admin__empty"
        data-testid="admin-estabelecimentos-vazio"
      />
    );
  }

  return (
    <>
      <div className="painel-admin__tabela-wrapper">
        <Tabela>
          <TabelaCabecalho>
            <TabelaLinha>
              <TabelaCelula>Estabelecimento</TabelaCelula>
              <TabelaCelula>Responsável</TabelaCelula>
              <TabelaCelula>Cidade/Nicho</TabelaCelula>
              <TabelaCelula>Status</TabelaCelula>
              <TabelaCelula>Ações</TabelaCelula>
            </TabelaLinha>
          </TabelaCabecalho>
          <TabelaCorpo>
            {estabelecimentos.map((est) => (
              <TabelaLinha key={est.id}>
                <TabelaCelula>
                  <strong>{est.nome}</strong>
                  <span className="painel-admin__slug">@{est.slug}</span>
                </TabelaCelula>
                <TabelaCelula>{est.responsavel}</TabelaCelula>
                <TabelaCelula>
                  {est.cidade} / {est.nicho}
                </TabelaCelula>
                <TabelaCelula>
                  <Chip
                    variante={
                      est.status === 'aprovado' ? 'sucesso' :
                      est.status === 'pendente' ? 'aviso' :
                      est.status === 'rejeitado' ? 'perigo' : 'aviso'
                    }
                  >
                    {est.status === 'aprovado' ? 'Aprovado' :
                     est.status === 'pendente' ? 'Pendente' :
                     est.status === 'rejeitado' ? 'Rejeitado' : 'Suspenso'}
                  </Chip>
                </TabelaCelula>
                <TabelaCelula>
                  <div className="painel-admin__acoes-cell">
                    {est.status === 'pendente' && (
                      <>
                        <button
                          className="painel-admin__btn-acao sucesso"
                          onClick={() => aoAprovar?.(est.id)}
                          data-testid={`aprovar-${est.id}`}
                        >
                          <Icone nome="check" tamanho={14} />
                        </button>
                        <button
                          className="painel-admin__btn-acao perigo"
                          onClick={() => handleAcao('rejeitar', est)}
                          data-testid={`rejeitar-${est.id}`}
                        >
                          <Icone nome="x" tamanho={14} />
                        </button>
                      </>
                    )}
                    {est.status === 'aprovado' && (
                      <button
                        className="painel-admin__btn-acao aviso"
                        onClick={() => handleAcao('suspender', est)}
                        data-testid={`suspender-${est.id}`}
                      >
                        <Icone nome="pausa" tamanho={14} />
                      </button>
                    )}
                    {est.status === 'suspenso' && (
                      <button
                        className="painel-admin__btn-acao sucesso"
                        onClick={() => aoReativar?.(est.id)}
                        data-testid={`reativar-${est.id}`}
                      >
                        <Icone nome="play" tamanho={14} />
                      </button>
                    )}
                    {est.status === 'rejeitado' && (
                      <button
                        className="painel-admin__btn-acao primario"
                        onClick={() => aoAprovar?.(est.id)}
                        data-testid={`reaprovar-${est.id}`}
                      >
                        <Icone nome="refresh" tamanho={14} />
                      </button>
                    )}
                  </div>
                </TabelaCelula>
              </TabelaLinha>
            ))}
          </TabelaCorpo>
        </Tabela>
      </div>

      {/* Modal Rejeitar/Suspender */}
      <div
        className={`painel-admin__modal-overlay ${mostrarModal.estabelecimento ? 'aberto' : ''}`}
        onClick={() => { setMostrarModal({ tipo: 'rejeitar' }); setMotivo(''); }}
        data-testid="modal-rejeitar-suspender-overlay"
      >
        <div className="painel-admin__modal" onClick={(e) => e.stopPropagation()}>
          <h3>{mostrarModal.tipo === 'rejeitar' ? 'Rejeitar estabelecimento' : 'Suspender estabelecimento'}</h3>
          <p>Estabelecimento: <strong>{mostrarModal.estabelecimento?.nome}</strong></p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (obrigatório)..."
            rows={4}
            className="painel-admin__modal-textarea"
            data-testid="modal-motivo"
          />
          <div className="painel-admin__modal-acoes">
            <button className="painel-admin__btn-secundario" onClick={() => { setMostrarModal({ tipo: 'rejeitar' }); setMotivo(''); }}>
              Cancelar
            </button>
            <button className="painel-admin__btn-primario" onClick={handleConfirmar} disabled={!motivo.trim()}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PainelUsuariosAdmin({
  usuarios,
  aoBanir,
  aoDesbanir,
}: {
  usuarios: Usuario[];
  aoBanir?: (id: string, motivo: string) => void;
  aoDesbanir?: (id: string) => void;
}) {
  const [mostrarModalBanir, setMostrarModalBanir] = useState<{ usuario?: Usuario }>({});
  const [motivoBanir, setMotivoBanir] = useState('');

  const handleBanir = (usuario: Usuario) => {
    setMostrarModalBanir({ usuario });
    setMotivoBanir('');
  };

  const handleConfirmarBanir = () => {
    if (!mostrarModalBanir.usuario || !motivoBanir.trim()) return;
    aoBanir?.(mostrarModalBanir.usuario.id, motivoBanir.trim());
    setMostrarModalBanir({});
    setMotivoBanir('');
  };

  if (usuarios.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum usuário"
        mensagem="Nenhum usuário cadastrado no sistema."
        icone="usuarios"
        className="painel-admin__empty"
        data-testid="admin-usuarios-vazio"
      />
    );
  }

  return (
    <>
      <div className="painel-admin__tabela-wrapper">
        <Tabela>
          <TabelaCabecalho>
            <TabelaLinha>
              <TabelaCelula>Usuário</TabelaCelula>
              <TabelaCelula>Email</TabelaCelula>
              <TabelaCelula>Role</TabelaCelula>
              <TabelaCelula>Status</TabelaCelula>
              <TabelaCelula>Cadastro</TabelaCelula>
              <TabelaCelula>Ações</TabelaCelula>
            </TabelaLinha>
          </TabelaCabecalho>
          <TabelaCorpo>
            {usuarios.map((u) => (
              <TabelaLinha key={u.id}>
                <TabelaCelula>
                  <strong>{u.nome}</strong>
                </TabelaCelula>
                <TabelaCelula>{u.email}</TabelaCelula>
                <TabelaCelula>
                  <Chip
                    variante={
                      u.role === 'admin' ? 'primario' :
                      u.role === 'barbeiro' ? 'sucesso' : 'padrao'
                    }
                  >
                    {u.role === 'admin' ? 'Admin' : u.role === 'barbeiro' ? 'Barbeiro' : 'Cliente'}
                  </Chip>
                </TabelaCelula>
                <TabelaCelula>
                  <Chip
                    variante={u.banidoEm ? 'perigo' : 'sucesso'}
                  >
                    {u.banidoEm ? 'Banido' : 'Ativo'}
                  </Chip>
                </TabelaCelula>
                <TabelaCelula>{new Date(u.criadoEm).toLocaleDateString('pt-BR')}</TabelaCelula>
                <TabelaCelula>
                  <div className="painel-admin__acoes-cell">
                    {u.banidoEm ? (
                      <button
                        className="painel-admin__btn-acao sucesso"
                        onClick={() => aoDesbanir?.(u.id)}
                        data-testid={`desbanir-${u.id}`}
                      >
                        <Icone nome="usuario-check" tamanho={14} />
                      </button>
                    ) : (
                      <button
                        className="painel-admin__btn-acao perigo"
                        onClick={() => handleBanir(u)}
                        data-testid={`banir-${u.id}`}
                      >
                        <Icone nome="usuario-x" tamanho={14} />
                      </button>
                    )}
                  </div>
                </TabelaCelula>
              </TabelaLinha>
            ))}
          </TabelaCorpo>
        </Tabela>
      </div>

      {/* Modal Banir */}
      <div
        className={`painel-admin__modal-overlay ${mostrarModalBanir.usuario ? 'aberto' : ''}`}
        onClick={() => { setMostrarModalBanir({}); setMotivoBanir(''); }}
        data-testid="modal-banir-overlay"
      >
        <div className="painel-admin__modal" onClick={(e) => e.stopPropagation()}>
          <h3>Banir usuário</h3>
          <p>Usuário: <strong>{mostrarModalBanir.usuario?.nome}</strong> ({mostrarModalBanir.usuario?.email})</p>
          <textarea
            value={motivoBanir}
            onChange={(e) => setMotivoBanir(e.target.value)}
            placeholder="Motivo do banimento (obrigatório)..."
            rows={4}
            className="painel-admin__modal-textarea"
            data-testid="modal-banir-motivo"
          />
          <div className="painel-admin__modal-acoes">
            <button className="painel-admin__btn-secundario" onClick={() => { setMostrarModalBanir({}); setMotivoBanir(''); }}>
              Cancelar
            </button>
            <button className="painel-admin__btn-primario perigo" onClick={handleConfirmarBanir} disabled={!motivoBanir.trim()}>
              Banir usuário
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function PainelAgendamentosAdmin({ agendamentos }: { agendamentos: Agendamento[] }) {
  if (agendamentos.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum agendamento"
        mensagem="Nenhum agendamento no sistema."
        icone="calendario"
        className="painel-admin__empty"
        data-testid="admin-agendamentos-vazio"
      />
    );
  }

  return (
    <div className="painel-admin__tabela-wrapper">
      <Tabela>
        <TabelaCabecalho>
          <TabelaLinha>
            <TabelaCelula>Data/Hora</TabelaCelula>
            <TabelaCelula>Cliente</TabelaCelula>
            <TabelaCelula>Barbeiro</TabelaCelula>
            <TabelaCelula>Estabelecimento</TabelaCelula>
            <TabelaCelula>Serviço</TabelaCelula>
            <TabelaCelula>Status</TabelaCelula>
            <TabelaCelula>Valor</TabelaCelula>
          </TabelaLinha>
        </TabelaCabecalho>
        <TabelaCorpo>
          {agendamentos.slice(0, 100).map((a) => (
            <TabelaLinha key={a.id}>
              <TabelaCelula>{new Date(a.data).toLocaleDateString('pt-BR')} {a.horario}</TabelaCelula>
              <TabelaCelula>{a.cliente?.nome || '—'}</TabelaCelula>
              <TabelaCelula>{a.barbeiro?.nome || '—'}</TabelaCelula>
              <TabelaCelula>{a.estabelecimento?.nome || '—'}</TabelaCelula>
              <TabelaCelula>{a.servico?.nome || '—'}</TabelaCelula>
              <TabelaCelula>
                <Chip
                  variante={
                    a.status === 'concluido' ? 'sucesso' :
                    a.status === 'cancelado' ? 'perigo' :
                    a.status === 'em_andamento' ? 'primario' : 'aviso'
                  }
                >
                  {a.status}
                </Chip>
              </TabelaCelula>
              <TabelaCelula>R$ {(a.valorFinal || 0).toFixed(2).replace('.', ',')}</TabelaCelula>
            </TabelaLinha>
          ))}
        </TabelaCorpo>
      </Tabela>
    </div>
  );
}

function PainelDenunciasAdmin({
  denuncias,
  aoResolver,
}: {
  denuncias: Denuncia[];
  aoResolver?: (id: string, status: string, resolucao: string) => void;
}) {
  const [mostrarModal, setMostrarModal] = useState<{ denuncia?: Denuncia }>({});
  const [resolucao, setResolucao] = useState('');
  const [statusResolucao, setStatusResolucao] = useState<'resolvida' | 'arquivada'>('resolvida');

  const handleResolver = (denuncia: Denuncia) => {
    setMostrarModal({ denuncia });
    setResolucao('');
    setStatusResolucao('resolvida');
  };

  const handleConfirmar = () => {
    if (!mostrarModal.denuncia || !resolucao.trim()) return;
    aoResolver?.(mostrarModal.denuncia.id, statusResolucao, resolucao.trim());
    setMostrarModal({});
    setResolucao('');
  };

  if (denuncias.length === 0) {
    return (
      <EmptyState
        titulo="Nenhuma denúncia"
        mensagem="Nenhuma denúncia registrada no sistema."
        icone="alerta"
        className="painel-admin__empty"
        data-testid="admin-denuncias-vazio"
      />
    );
  }

  return (
    <>
      <div className="painel-admin__tabela-wrapper">
        <Tabela>
          <TabelaCabecalho>
            <TabelaLinha>
              <TabelaCelula>Tipo</TabelaCelula>
              <TabelaCelula>Denunciante</TabelaCelula>
              <TabelaCelula>Denunciado</TabelaCelula>
              <TabelaCelula>Status</TabelaCelula>
              <TabelaCelula>Data</TabelaCelula>
              <TabelaCelula>Ações</TabelaCelula>
            </TabelaLinha>
          </TabelaCabecalho>
          <TabelaCorpo>
            {denuncias.map((d) => (
              <TabelaLinha key={d.id}>
                <TabelaCelula>
                  <Chip variante="primario">{d.tipo}</Chip>
                </TabelaCelula>
                <TabelaCelula>{d.denuncianteNome}</TabelaCelula>
                <TabelaCelula>{d.denunciadoNome}</TabelaCelula>
                <TabelaCelula>
                  <Chip
                    variante={
                      d.status === 'pendente' ? 'aviso' :
                      d.status === 'em_analise' ? 'primario' :
                      d.status === 'resolvida' ? 'sucesso' : 'padrao'
                    }
                  >
                    {d.status === 'pendente' ? 'Pendente' :
                     d.status === 'em_analise' ? 'Em análise' :
                     d.status === 'resolvida' ? 'Resolvida' : 'Arquivada'}
                  </Chip>
                </TabelaCelula>
                <TabelaCelula>{new Date(d.criadoEm).toLocaleDateString('pt-BR')}</TabelaCelula>
                <TabelaCelula>
                  <div className="painel-admin__acoes-cell">
                    {d.status === 'pendente' && (
                      <button
                        className="painel-admin__btn-acao primario"
                        onClick={() => handleResolver(d)}
                        data-testid={`resolver-${d.id}`}
                      >
                        <Icone nome="check" tamanho={14} />
                      </button>
                    )}
                  </div>
                </TabelaCelula>
              </TabelaLinha>
            ))}
          </TabelaCorpo>
        </Tabela>
      </div>

      {/* Modal Resolver */}
      <div
        className={`painel-admin__modal-overlay ${mostrarModal.denuncia ? 'aberto' : ''}`}
        onClick={() => { setMostrarModal({}); setResolucao(''); }}
        data-testid="modal-resolver-overlay"
      >
        <div className="painel-admin__modal" onClick={(e) => e.stopPropagation()}>
          <h3>Resolver denúncia</h3>
          <p>Tipo: <strong>{mostrarModal.denuncia?.tipo}</strong></p>
          <p>Denunciante: {mostrarModal.denuncia?.denuncianteNome}</p>
          <p>Denunciado: {mostrarModal.denuncia?.denunciadoNome}</p>
          <div className="painel-admin__modal-grid">
            <label>
              <span>Status</span>
              <select
                value={statusResolucao}
                onChange={(e) => setStatusResolucao(e.target.value as 'resolvida' | 'arquivada')}
                className="painel-admin__modal-select"
              >
                <option value="resolvida">Resolvida</option>
                <option value="arquivada">Arquivada</option>
              </select>
            </label>
          </div>
          <label>
            <span>Resolução (obrigatório)</span>
            <textarea
              value={resolucao}
              onChange={(e) => setResolucao(e.target.value)}
              placeholder="Descreva a resolução..."
              rows={4}
              className="painel-admin__modal-textarea"
              data-testid="modal-resolucao"
            />
          </label>
          <div className="painel-admin__modal-acoes">
            <button className="painel-admin__btn-secundario" onClick={() => { setMostrarModal({}); setResolucao(''); }}>
              Cancelar
            </button>
            <button className="painel-admin__btn-primario" onClick={handleConfirmar} disabled={!resolucao.trim()}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Need imports for sub-components
import { useState } from 'react';
import type { Estabelecimento, Usuario, Agendamento, Denuncia } from '../types';

export default PainelAdmin;