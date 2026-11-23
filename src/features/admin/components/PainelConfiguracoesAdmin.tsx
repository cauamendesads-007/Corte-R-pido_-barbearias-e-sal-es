/**
 * PainelConfiguracoesAdmin - Configurações gerais e planos no admin.
 */

import { Cartao, CartaoCorpo, BotaoPrimario, BotaoSecundario, CampoTexto } from '@/componentes';
import type { PlanoAdmin } from '../types';

interface PainelConfiguracoesAdminProps {
  planos: PlanoAdmin[];
}

export const PainelConfiguracoesAdmin = ({ planos }: PainelConfiguracoesAdminProps) => {
  return (
    <div className="admin__painel" role="tabpanel" id="painel-configuracoes" aria-labelledby="aba-configuracoes">
      <section className="admin__secao">
        <h2>Planos de assinatura</h2>
        <div className="admin__planos-grid">
          {planos.map((plano) => (
            <Cartao key={plano.id} className="admin__plano-card" variante="padrao">
              <CartaoCorpo>
                <div className="admin__plano-header" style={{ borderColor: plano.cor }}>
                  <h3>{plano.nome}</h3>
                  <p className="admin__plano-preco">R$ {plano.preco}/mês</p>
                </div>
                <ul className="admin__plano-limites">
                  <li>Barbeiros: {plano.limites.barbeiros === -1 ? 'Ilimitado' : plano.limites.barbeiros}</li>
                  <li>Serviços: {plano.limites.servicos === -1 ? 'Ilimitado' : plano.limites.servicos}</li>
                  <li>Fotos: {plano.limites.fotos === -1 ? 'Ilimitado' : plano.limites.fotos}</li>
                  <li>Análises: {plano.limites.analises ? 'Sim' : 'Não'}</li>
                  <li>API: {plano.limites.api ? 'Sim' : 'Não'}</li>
                </ul>
                <BotaoSecundario className="admin__plano-btn" style={{ borderColor: plano.cor, color: plano.cor }}>Editar</BotaoSecundario>
              </CartaoCorpo>
            </Cartao>
          ))}
        </div>
      </section>

      <section className="admin__secao">
        <h2>Configurações gerais</h2>
        <CampoTexto label="Nome da plataforma" valor="Corte Rápido" aoAlterar={() => {}} data-testid="admin-config-nome" />
        <CampoTexto label="E-mail de suporte" valor="suporte@corterapido.com" aoAlterar={() => {}} data-testid="admin-config-email" />
        <CampoTexto label="Taxa da plataforma (%)" valor="10" aoAlterar={() => {}} data-testid="admin-config-taxa" />
        <BotaoPrimario>Salvar configurações</BotaoPrimario>
      </section>
    </div>
  );
};