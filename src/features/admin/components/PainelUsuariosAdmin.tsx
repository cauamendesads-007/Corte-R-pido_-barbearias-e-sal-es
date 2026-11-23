/**
 * PainelUsuariosAdmin - Gestão de usuários no admin.
 */

import { CampoBusca, Select, Chip, Avatar, BotaoIcone } from '@/componentes';
import { ICONES } from '@/constantes';
import type { UsuarioAdmin } from '../types';

interface PainelUsuariosAdminProps {
  usuarios: UsuarioAdmin[];
  busca: string;
  filtroTipo: 'todos' | 'cliente' | 'barbeiro' | 'admin';
  onBuscaChange: (busca: string) => void;
  onFiltroTipoChange: (tipo: 'todos' | 'cliente' | 'barbeiro' | 'admin') => void;
  onAlterarStatus: (id: string) => void;
  onEditar: (id: string) => void;
}

const TIPO_OPTIONS: { valor: string; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'cliente', rotulo: 'Clientes' },
  { valor: 'barbeiro', rotulo: 'Barbeiros' },
  { valor: 'admin', rotulo: 'Admins' },
];

const PAPEL_LABELS: Record<string, string> = {
  barbeiro: '💈 Barbeiro',
  admin: '⚙️ Admin',
  cliente: '👤 Cliente',
};

const PAPEL_CORES: Record<string, string> = {
  barbeiro: '#e11d48',
  admin: '#dc2626',
  cliente: '#0ea5e9',
};

const STATUS_LABELS: Record<string, string> = {
  ativo: '✓ Ativo',
  suspenso: '⛔ Suspenso',
};

export const PainelUsuariosAdmin = ({
  usuarios,
  busca,
  filtroTipo,
  onBuscaChange,
  onFiltroTipoChange,
  onAlterarStatus,
  onEditar,
}: PainelUsuariosAdminProps) => {
  const filtrados = usuarios.filter((u) => {
    const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || u.papel === filtroTipo;
    return matchBusca && matchTipo;
  });

  return (
    <div className="admin__painel" role="tabpanel" id="painel-usuarios" aria-labelledby="aba-usuarios">
      <div className="admin__filtros" data-testid="admin-usuarios-filtros">
        <CampoBusca
          label="Buscar usuários"
          valor={busca}
          aoAlterar={onBuscaChange}
          placeholder="Buscar por nome ou e-mail..."
          className="admin__busca"
          data-testid="admin-busca-usuarios"
        />
        <Select
          label="Tipo de usuário"
          valor={filtroTipo}
          aoAlterar={(v) => onFiltroTipoChange(v as 'todos' | 'cliente' | 'barbeiro' | 'admin')}
          opcoes={TIPO_OPTIONS}
          data-testid="admin-filtro-tipo-usuario"
        />
      </div>

      <div className="admin__tabela-wrapper" data-testid="admin-usuarios-tabela">
        <table className="admin__tabela" role="table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Tipo</th>
              <th>Estabelecimento</th>
              <th>Status</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="admin__tabela-nome">
                    <Avatar
                      nome={user.nome}
                      tamanho="pequeno"
                      corFundo={PAPEL_CORES[user.papel] || '#0ea5e9'}
                    />
                    <strong>{user.nome}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.telefone}</td>
                <td>
                  <Chip variante="nicho">{PAPEL_LABELS[user.papel] || user.papel}</Chip>
                </td>
                <td>{user.estabelecimento}</td>
                <td>
                  <Chip
                    variante="status"
                    selecionado={user.status === 'ativo'}
                    desabilitado
                  >
                    {STATUS_LABELS[user.status] || user.status}
                  </Chip>
                </td>
                <td>{new Date(user.dataCadastro).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="admin__acoes-linha" data-testid={`admin-user-acoes-${user.id}`}>
                    {user.status === 'ativo' && (
                      <BotaoIcone icone={ICONES.alerta} variante="secundario" tamanho="pequeno" aoClicar={() => onAlterarStatus(user.id)} ariaLabel="Suspender" />
                    )}
                    {user.status === 'suspenso' && (
                      <BotaoIcone icone={ICONES.verificar} variante="primario" tamanho="pequeno" aoClicar={() => onAlterarStatus(user.id)} ariaLabel="Ativar" />
                    )}
                    <BotaoIcone icone={ICONES.editar} variante="fantasma" tamanho="pequeno" aoClicar={() => onEditar(user.id)} ariaLabel="Editar" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <div className="admin__vazio" data-testid="admin-usuarios-vazio">
          <p>Nenhum usuário encontrado.</p>
        </div>
      )}
    </div>
  );
};