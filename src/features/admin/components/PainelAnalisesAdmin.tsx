/**
 * PainelAnalisesAdmin - Análises e relatórios (placeholder).
 */

import { Cartao, CartaoCorpo } from '@/componentes';
import type { MetricasAdminData } from '../types';

interface PainelAnalisesAdminProps {
  metricas: MetricasAdminData;
}

export const PainelAnalisesAdmin = ({ metricas }: PainelAnalisesAdminProps) => {
  const analisesConfig = [
    { valor: metricas.agendamentosMes.toLocaleString('pt-BR'), label: 'Agendamentos este mês' },
    { valor: '4.7', label: 'Avaliação média global' },
    { valor: '89%', label: 'Taxa de conversão' },
    { valor: '12 min', label: 'Tempo médio resposta' },
  ];

  return (
    <div className="admin__painel" role="tabpanel" id="painel-analises" aria-labelledby="aba-analises">
      <h2>Análises e Relatórios</h2>
      <div className="admin__metricas" data-testid="admin-analises-metricas">
        {analisesConfig.map((analise, index) => (
          <Cartao key={index}>
            <CartaoCorpo>
              <p className="admin__metrica-valor">{analise.valor}</p>
              <p className="admin__metrica-label">{analise.label}</p>
            </CartaoCorpo>
          </Cartao>
        ))}
      </div>
      <div className="admin__vazio" data-testid="admin-analises-vazio">
        <p>Gráficos e relatórios detalhados serão implementados aqui.</p>
      </div>
    </div>
  );
};