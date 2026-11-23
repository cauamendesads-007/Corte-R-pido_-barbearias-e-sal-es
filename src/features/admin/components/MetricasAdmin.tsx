/**
 * MetricasAdmin - Exibe as métricas do dashboard administrativo.
 */

import { Cartao, CartaoCorpo } from '@/componentes';
import type { MetricasAdminData } from '../types';

interface MetricasAdminProps {
  metricas: MetricasAdminData;
}

export const MetricasAdmin = ({ metricas }: MetricasAdminProps) => {
  const metricasConfig = [
    { valor: metricas.totalEstabelecimentos, label: 'Estabelecimentos', icone: '🏢', corFundo: 'var(--cor-primaria-transparente)', corIcone: 'var(--cor-primaria)' },
    { valor: metricas.ativos, label: 'Ativos', icone: '✅', corFundo: 'var(--cor-sucesso-transparente)', corIcone: 'var(--cor-sucesso)' },
    { valor: metricas.pendentes, label: 'Pendentes', icone: '⏳', corFundo: 'var(--cor-aviso-transparente)', corIcone: 'var(--cor-aviso)' },
    { valor: metricas.suspensos, label: 'Suspensos', icone: '🚫', corFundo: 'var(--cor-perigo-transparente)', corIcone: 'var(--cor-perigo)' },
    { valor: metricas.totalUsuarios, label: 'Usuários', icone: '👥', corFundo: 'var(--cor-primaria-transparente)', corIcone: 'var(--cor-primaria)' },
    { valor: metricas.receitaEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), label: 'Receita estimada/mês', icone: '💰', corFundo: 'var(--cor-sucesso-transparente)', corIcone: 'var(--cor-sucesso)' },
  ];

  return (
    <div className="admin__metricas" role="region" aria-label="Métricas globais" data-testid="admin-metricas">
      {metricasConfig.map((metrica, index) => (
        <Cartao key={index}>
          <CartaoCorpo>
            <div className="admin__metrica-icone" style={{ background: metrica.corFundo, color: metrica.corIcone }} aria-hidden="true">
              {metrica.icone}
            </div>
            <div>
              <p className="admin__metrica-valor">{metrica.valor}</p>
              <p className="admin__metrica-label">{metrica.label}</p>
            </div>
          </CartaoCorpo>
        </Cartao>
      ))}
    </div>
  );
};