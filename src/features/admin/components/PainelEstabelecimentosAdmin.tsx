/**
 * PainelEstabelecimentosAdmin - Gestão de estabelecimentos no admin.
 */

import { CampoBusca, Select, Chip, Avatar, BotaoIcone } from '@/componentes';
import { ICONES } from '@/constantes';
import type { EstabelecimentoAdmin } from '../types';

interface PainelEstabelecimentosAdminProps {
  estabelecimentos: EstabelecimentoAdmin[];
  busca: string;
  filtroStatus: 'todos' | 'ativo' | 'pendente' | 'suspenso';
  onBuscaChange: (busca: string) => void;
  onFiltroStatusChange: (status: 'todos' | 'ativo' | 'pendente' | 'suspenso') => void;
  onAprovar: (id: string) => void;
  onSuspender: (id: string) => void;
  onEditar: (id: string) => void;
}

const STATUS_OPTIONS: { valor: string; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativo', rotulo: 'Ativos' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'suspenso', rotulo: 'Suspensos' },
];

const NICHO_LABELS: Record<string, string> = {
  barbearia: 'Barbearia',
  feminino: '♀ Salão',
  visagismo: 'Visagismo',
  infantil: 'Infantil',
};

const PLANO_LABELS: Record<string, string> = {
  essencial: '📦 Essencial',
  profissional: '💼 Profissional',
  premium: '⭐ Premium',
};

const STATUS_LABELS: Record<string, string> = {
  ativo: '✓ Ativo',
  pendente: '⏳ Pendente',
  suspenso: '⛔ Suspenso',
};

const NICHO_CORES: Record<string, string> = {
  feminino: '#ec4899',
  visagismo: '#a855f7',
  infantil: '#22c55e',
  barbearia: '#e11d48',
};

export const PainelEstabelecimentosAdmin = ({
  estabelecimentos,
  busca,
  filtroStatus,
  onBuscaChange,
  onFiltroStatusChange,
  onAprovar,
  onSuspender,
  onEditar,
}: PainelEstabelecimentosAdminProps) => {
  const filtrados = estabelecimentos.filter((e) => {
    const matchBusca = e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.proprietario.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || e.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="admin__painel" role="tabpanel" id="painel-estabelecimentos" aria-labelledby="aba-estabelecimentos">
      <div className="admin__filtros" data-testid="admin-estabelecimentos-filtros">
        <CampoBusca
          label="Buscar estabelecimentos"
          valor={busca}
          aoAlterar={onBuscaChange}
          placeholder="Buscar por nome ou proprietário..."
          className="admin__busca"
          data-testid="admin-busca-estabelecimentos"
        />
        <Select
          label="Status"
          valor={filtroStatus}
          aoAlterar={(v) => onFiltroStatusChange(v as 'todos' | 'ativo' | 'pendente' | 'suspenso')}
          opcoes={STATUS_OPTIONS}
          data-testid="admin-filtro-status-estab"
        />
      </div>

      <div className="admin__tabela-wrapper" data-testid="admin-estabelecimentos-tabela">
        <table className="admin__tabela" role="table">
          <thead>
            <tr>
              <th>Estabelecimento</th>
              <th>Proprietário</th>
              <th>Cidade</th>
              <th>Nicho</th>
              <th>Status</th>
              <th>Plano</th>
              <th>Agend./mês</th>
              <th>Avaliação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((estab) => (
              <tr key={estab.id}>
                <td>
                  <div className="admin__tabela-nome">
                    <Avatar
                      nome={estab.nome}
                      tamanho="pequeno"
                      corFundo={NICHO_CORES[estab.nicho] || '#e11d48'}
                    />
                    <strong>{estab.nome}</strong>
                  </div>
                </td>
                <td>{estab.proprietario}</td>
                <td>{estab.cidade}</td>
                <td>
                  <Chip variante="nicho">{NICHO_LABELS[estab.nicho] || estab.nicho}</Chip>
                </td>
                <td>
                  <Chip
                    variante="status"
                    selecionado={estab.status === 'ativo'}
                    desabilitado
                  >
                    {STATUS_LABELS[estab.status] || estab.status}
                  </Chip>
                </td>
                <td>
                  <Chip variante="padrao" selecionado={false} desabilitado>
                    {PLANO_LABELS[estab.plano] || estab.plano}
                  </Chip>
                </td>
                <td>{estab.agendamentosMes}</td>
                <td>{estab.avaliacao ? `⭐ ${estab.avaliacao}` : '-'}</td>
                <td>
                  <div className="admin__acoes-linha" data-testid={`admin-estab-acoes-${estab.id}`}>
                    {estab.status === 'pendente' && (
                      <BotaoIcone icone={ICONES.verificar} variante="primario" tamanho="pequeno" aoClicar={() => onAprovar(estab.id)} ariaLabel="Aprovar" />
                    )}
                    {estab.status === 'ativo' && (
                      <BotaoIcone icone={ICONES.alerta} variante="secundario" tamanho="pequeno" aoClicar={() => onSuspender(estab.id)} ariaLabel="Suspender" />
                    )}
                    <BotaoIcone icone={ICONES.editar} variante="fantasma" tamanho="pequeno" aoClicar={() => onEditar(estab.id)} ariaLabel="Editar" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <div className="admin__vazio" data-testid="admin-estabelecimentos-vazio">
          <p>Nenhum estabelecimento encontrado.</p>
        </div>
      )}
    </div>
  );
};