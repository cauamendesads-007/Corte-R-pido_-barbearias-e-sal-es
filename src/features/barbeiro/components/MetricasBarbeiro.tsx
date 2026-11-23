/**
 * MetricasBarbeiro - Exibe as métricas do dashboard do barbeiro.
 */

import { Cartao, CartaoCorpo } from '@/componentes';
import type { MetricasBarbeiro as MetricasBarbeiroType } from '../types';

interface MetricasBarbeiroProps {
  metricas: MetricasBarbeiroType;
}

export const MetricasBarbeiro = ({ metricas }: MetricasBarbeiroProps) => {
  const metricasConfig = [
    {
      valor: metricas.agendamentosHoje,
      label: 'Agendamentos hoje',
      icone: '📅',
      corFundo: 'var(--cor-primaria-transparente)',
      corIcone: 'var(--cor-primaria)',
    },
    {
      valor: metricas.confirmados,
      label: 'Confirmados',
      icone: '✅',
      corFundo: 'var(--cor-sucesso-transparente)',
      corIcone: 'var(--cor-sucesso)',
    },
    {
      valor: metricas.pendentes,
      label: 'Pendentes',
      icone: '⏳',
      corFundo: 'var(--cor-aviso-transparente)',
      corIcone: 'var(--cor-aviso)',
    },
    {
      valor: metricas.filaAtual,
      label: 'Na fila agora',
      icone: '👥',
      corFundo: 'var(--cor-primaria-transparente)',
      corIcone: 'var(--cor-primaria)',
    },
  ];

  return (
    <div className="painel__metricas" role="region" aria-label="Métricas do dia" data-testid="painel-metricas">
      {metricasConfig.map((metrica, index) => (
        <Cartao key={index} className="painel__metrica">
          <CartaoCorpo>
            <div
              className="painel__metrica-icone"
              style={{ background: metrica.corFundo, color: metrica.corIcone }}
              aria-hidden="true"
            >
              {metrica.icone}
            </div>
            <div>
              <p className="painel__metrica-valor">{metrica.valor}</p>
              <p className="painel__metrica-label">{metrica.label}</p>
            </div>
          </CartaoCorpo>
        </Cartao>
      ))}
    </div>
  );
};