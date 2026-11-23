/**
 * PainelConfiguracoesBarbeiro - Configurações do estabelecimento.
 */

import { BotaoPrimario, BotaoSecundario, CampoTexto, Textarea } from '@/componentes';

interface PainelConfiguracoesBarbeiroProps {
  usuario: {
    nome?: string;
    whatsapp?: string;
    avatar?: string;
  };
}

const TEMA_CORES = ['#e11d48', '#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];

export const PainelConfiguracoesBarbeiro = ({ usuario }: PainelConfiguracoesBarbeiroProps) => {
  return (
    <div className="painel__painel" role="tabpanel" id="painel-configuracoes" aria-labelledby="aba-configuracoes">
      <section className="painel__secao">
        <h2>Informações do estabelecimento</h2>
        <CampoTexto label="Nome" valor={usuario.nome || ''} aoAlterar={() => {}} data-testid="painel-config-nome" />
        <CampoTexto label="Telefone/WhatsApp" valor={usuario.whatsapp || ''} aoAlterar={() => {}} data-testid="painel-config-telefone" />
        <Textarea label="Descrição" valor="" aoAlterar={() => {}} linhas={3} data-testid="painel-config-descricao" />
        <CampoTexto label="Endereço" valor="" aoAlterar={() => {}} data-testid="painel-config-endereco" />
        <CampoTexto label="Cidade" valor="" aoAlterar={() => {}} data-testid="painel-config-cidade" />
        <BotaoPrimario>Salvar alterações</BotaoPrimario>
      </section>

      <section className="painel__secao">
        <h2>Horário de funcionamento</h2>
        <p className="painel__aviso">Configure os dias e horários de atendimento.</p>
        <BotaoSecundario>Configurar horários</BotaoSecundario>
      </section>

      <section className="painel__secao">
        <h2>Tema visual</h2>
        <div className="painel__tema-opcoes">
          {TEMA_CORES.map((cor) => (
            <button
              key={cor}
              type="button"
              className={`painel__tema-cor ${usuario.avatar === cor ? 'painel__tema-cor--ativo' : ''}`}
              style={{ background: cor }}
              onClick={() => {}}
              aria-label={`Tema ${cor}`}
              data-testid={`painel-tema-${cor}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
};