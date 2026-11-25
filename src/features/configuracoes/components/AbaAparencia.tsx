/**
 * Aba Aparência - Configurações de tema, fonte e exibição.
 */

import { useCallback } from 'react';
import {
  Cartao,
  CartaoCabecalho,
  CartaoCorpo,
  CheckboxToggle,
  Select,
  Divisor,
  CampoTexto,
} from '@/componentes';
import type { ConfiguracoesAparencia } from '../types';
import './AbaAparencia.css';

const TEMAS = [
  { valor: 'sistema', rotulo: 'Sistema', icone: 'monitor' },
  { valor: 'claro', rotulo: 'Claro', icone: 'sol' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'lua' },
] as const;

const TAMANHOS_FONTE = [
  { valor: 'pequeno', rotulo: 'Pequeno' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'grande', rotulo: 'Grande' },
];

const IDIOMAS = [
  { valor: 'pt-BR', rotulo: 'Português (Brasil)' },
  { valor: 'en', rotulo: 'English' },
  { valor: 'es', rotulo: 'Español' },
];

const FORMATOS_HORA = [
  { valor: '24h', rotulo: '24 horas (14:30)' },
  { valor: '12h', rotulo: '12 horas (2:30 PM)' },
];

const DIAS_SEMANA = [
  { valor: '0', rotulo: 'Domingo' },
  { valor: '1', rotulo: 'Segunda-feira' },
  { valor: '6', rotulo: 'Sábado' },
];

interface AbaAparenciaProps {
  aparencia: ConfiguracoesAparencia | null;
  carregando: boolean;
  aoAtualizar: (dados: Partial<ConfiguracoesAparencia>) => Promise<void>;
}

export const AbaAparencia = ({
  aparencia,
  carregando,
  aoAtualizar,
}: AbaAparenciaProps) => {
  const handleChange = useCallback(<K extends keyof ConfiguracoesAparencia>(campo: K, valor: ConfiguracoesAparencia[K]) => {
    aoAtualizar({ [campo]: valor });
  }, [aoAtualizar]);

  if (!aparencia) return null;

  return (
    <div className="aba-aparencia" data-testid="aba-aparencia">
      {/* Tema */}
      <Cartao className="aba-aparencia__cartao">
        <CartaoCabecalho>
          <h3>Tema</h3>
          <p>Escolha como o app deve aparecer</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-aparencia__tema-opcoes" role="radiogroup" aria-label="Tema">
            {TEMAS.map((tema) => (
              <label
                key={tema.valor}
                className={`aba-aparencia__tema-opcao ${aparencia.tema === tema.valor ? 'selecionada' : ''}`}
                onClick={() => handleChange('tema', tema.valor)}
              >
                <input
                  type="radio"
                  name="tema"
                  value={tema.valor}
                  checked={aparencia.tema === tema.valor}
                  onChange={() => handleChange('tema', tema.valor)}
                  disabled={carregando}
                  className="aba-aparencia__radio"
                  data-testid={`tema-${tema.valor}`}
                />
                <div className="aba-aparencia__tema-opcao-conteudo">
                  <span className="aba-aparencia__tema-opcao-icone" aria-hidden="true">
                    {tema.icone === 'monitor' && '🖥️'}
                    {tema.icone === 'sol' && '☀️'}
                    {tema.icone === 'lua' && '🌙'}
                  </span>
                  <span className="aba-aparencia__tema-opcao-texto">{tema.rotulo}</span>
                  <span className="aba-aparencia__tema-opcao-descricao">
                    {tema.valor === 'sistema' ? 'Segue a configuração do sistema operacional' :
                     tema.valor === 'claro' ? 'Sempre uso o tema claro' : 'Sempre uso o tema escuro'}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Fonte e exibição */}
      <Cartao className="aba-aparencia__cartao">
        <CartaoCabecalho>
          <h3>Fonte e exibição</h3>
          <p>Ajuste o tamanho do texto e preferências visuais</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-aparencia__grid">
            <Select
              label="Tamanho da fonte"
              valor={aparencia.fonteTamanho}
              aoAlterar={(valor) => handleChange('fonteTamanho', valor as ConfiguracoesAparencia['fonteTamanho'])}
              opcoes={TAMANHOS_FONTE}
              placeholder="Selecione"
              desabilitado={carregando}
              data-testid="select-fonte-tamanho"
            />

            <CheckboxToggle
              rotulo="Animações"
              descricao="Ativar transições e animações na interface"
              verificado={aparencia.animacoes}
              aoAlterar={(v) => handleChange('animacoes', v)}
              desabilitado={carregando}
              data-testid="switch-animacoes"
            />

            <CheckboxToggle
              rotulo="Alto contraste"
              descricao="Aumenta o contraste para melhor legibilidade"
              verificado={aparencia.altoContraste}
              aoAlterar={(v) => handleChange('altoContraste', v)}
              desabilitado={carregando}
              data-testid="switch-alto-contraste"
            />

            <CheckboxToggle
              rotulo="Reduzir movimento"
              descricao="Desativa animações não essenciais (respeita preferência do sistema)"
              verificado={aparencia.reduzirMovimento}
              aoAlterar={(v) => handleChange('reduzirMovimento', v)}
              desabilitado={carregando}
              data-testid="switch-reduzir-movimento"
            />
          </div>
        </CartaoCorpo>
      </Cartao>

      <Divisor />

      {/* Idioma e região */}
      <Cartao className="aba-aparencia__cartao">
        <CartaoCabecalho>
          <h3>Idioma e região</h3>
          <p>Configure idioma, fuso horário e formatos</p>
        </CartaoCabecalho>
        <CartaoCorpo>
          <div className="aba-aparencia__grid">
            <Select
              label="Idioma"
              valor={aparencia.idioma}
              aoAlterar={(valor) => handleChange('idioma', valor as ConfiguracoesAparencia['idioma'])}
              opcoes={IDIOMAS}
              desabilitado={carregando}
              data-testid="select-idioma"
            />

            <CampoTexto
              label="Fuso horário"
              valor={aparencia.fusoHorario}
              aoAlterar={(valor) => handleChange('fusoHorario', valor)}
              placeholder="America/Sao_Paulo"
              desabilitado={carregando}
              data-testid="input-fuso-horario"
            />

            <Select
              label="Formato de hora"
              valor={aparencia.formatoHora}
              aoAlterar={(valor) => handleChange('formatoHora', valor as ConfiguracoesAparencia['formatoHora'])}
              opcoes={FORMATOS_HORA}
              desabilitado={carregando}
              data-testid="select-formato-hora"
            />

            <Select
              label="Primeiro dia da semana"
              valor={String(aparencia.primeiraDiaSemana)}
              aoAlterar={(valor) => handleChange('primeiraDiaSemana', Number(valor) as 0 | 1 | 6)}
              opcoes={DIAS_SEMANA as { valor: string; rotulo: string }[]}
              desabilitado={carregando}
              data-testid="select-primeiro-dia"
            />
          </div>
        </CartaoCorpo>
      </Cartao>
    </div>
  );
};

export default AbaAparencia;