/**
 * Utilitários de data para a aplicação Corte Rápido.
 * Funções puras, sem side effects, totalmente testáveis.
 */

/**
 * Adiciona dias a uma data e retorna string YYYY-MM-DD.
 * @param dataBase - Data base (padrão: hoje)
 * @param dias - Número de dias para adicionar (pode ser negativo)
 * @returns String no formato YYYY-MM-DD
 */
export function adicionarDias(dataBase: Date = new Date(), dias: number): string {
  const data = new Date(dataBase);
  data.setDate(data.getDate() + dias);
  return formatarParaInput(data);
}

/**
 * Formata Date para string YYYY-MM-DD (compatível com input type="date").
 * @param data - Objeto Date
 * @returns String YYYY-MM-DD
 */
export function formatarParaInput(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Formata Date para string DD/MM/YYYY.
 * @param data - Objeto Date
 * @returns String DD/MM/YYYY
 */
export function formatarParaExibicao(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata Date para string DD/MM (dia/mês curto).
 * @param data - Objeto Date
 * @returns String DD/MM
 */
export function formatarDiaMes(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

/**
 * Retorna nome abreviado do dia da semana (ex: "Seg", "Ter").
 * @param data - Objeto Date
 * @returns String com 3 letras
 */
export function nomeDiaSemanaCurto(data: Date): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return dias[data.getDay()];
}

/**
 * Retorna nome completo do dia da semana.
 * @param data - Objeto Date
 * @returns String completa
 */
export function nomeDiaSemanaCompleto(data: Date): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return dias[data.getDay()];
}

/**
 * Gera array de dias para seleção (próximos N dias).
 * @param quantidade - Quantidade de dias (padrão: 7)
 * @param dataInicial - Data inicial (padrão: hoje)
 * @returns Array de objetos { valor: 'YYYY-MM-DD', rotulo: 'Seg 15/01' }
 */
export function gerarDiasSelecao(quantidade = 7, dataInicial = new Date()): Array<{ valor: string; rotulo: string }> {
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(dataInicial);
    data.setDate(data.getDate() + i);
    return {
      valor: formatarParaInput(data),
      rotulo: `${nomeDiaSemanaCurto(data)} ${formatarDiaMes(data)}`,
    };
  });
}

/**
 * Gera horários disponíveis para um dia (intervalos de 30 min).
 * @param horaInicio - Hora de início (ex: "09:00")
 * @param horaFim - Hora de fim (ex: "18:00")
 * @param intervaloMinutos - Intervalo em minutos (padrão: 30)
 * @returns Array de strings "HH:MM"
 */
export function gerarHorarios(
  horaInicio: string,
  horaFim: string,
  intervaloMinutos = 30
): string[] {
  const [hi, mi] = horaInicio.split(':').map(Number);
  const [hf, mf] = horaFim.split(':').map(Number);

  const inicioMinutos = hi * 60 + mi;
  const fimMinutos = hf * 60 + mf;
  const horarios: string[] = [];

  for (let m = inicioMinutos; m + intervaloMinutos <= fimMinutos; m += intervaloMinutos) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    horarios.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }

  return horarios;
}

/**
 * Verifica se uma data é hoje.
 * @param data - String YYYY-MM-DD ou Date
 * @returns true se for hoje
 */
export function ehHoje(data: string | Date): boolean {
  const hoje = formatarParaInput(new Date());
  const dataStr = typeof data === 'string' ? data : formatarParaInput(data);
  return dataStr === hoje;
}

/**
 * Verifica se uma data é no passado (antes de hoje).
 * @param data - String YYYY-MM-DD ou Date
 * @returns true se for passada
 */
export function ehPassado(data: string | Date): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataComparar = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return dataComparar < hoje;
}

/**
 * Verifica se uma data é no futuro (depois de hoje).
 * @param data - String YYYY-MM-DD ou Date
 * @returns true se for futura
 */
export function ehFuturo(data: string | Date): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataComparar = typeof data === 'string' ? new Date(data + 'T00:00:00') : new Date(data);
  dataComparar.setHours(0, 0, 0, 0);
  return dataComparar > hoje;
}

/**
 * Combina data (YYYY-MM-DD) e hora (HH:MM) em Date.
 * @param data - String YYYY-MM-DD
 * @param hora - String HH:MM
 * @returns Objeto Date
 */
export function combinarDataHora(data: string, hora: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(ano, mes - 1, dia, horas, minutos);
}

/**
 * Calcula diferença em minutos entre duas datas.
 * @param inicio - Date inicial
 * @param fim - Date final
 * @returns Minutos de diferença
 */
export function diferencaMinutos(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / 60000);
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem.
 * @param inicioA - Início do intervalo A
 * @param fimA - Fim do intervalo A
 * @param inicioB - Início do intervalo B
 * @param fimB - Fim do intervalo B
 * @returns true se sobrepõem
 */
export function intervalosSobrepoem(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date
): boolean {
  return inicioA < fimB && inicioB < fimA;
}

/**
 * Verifica se horário (HH:MM) está dentro de intervalo.
 * @param horario - String HH:MM
 * @param inicio - String HH:MM início
 * @param fim - String HH:MM fim
 * @returns true se está no intervalo
 */
export function horarioNoIntervalo(horario: string, inicio: string, fim: string): boolean {
  return horario >= inicio && horario < fim;
}

/**
 * Obtém timestamp do início do dia (00:00:00).
 * @param data - Date ou string YYYY-MM-DD
 * @returns Timestamp em ms
 */
export function inicioDoDia(data: Date | string): number {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : new Date(data);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Obtém timestamp do fim do dia (23:59:59.999).
 * @param data - Date ou string YYYY-MM-DD
 * @returns Timestamp em ms
 */
export function fimDoDia(data: Date | string): number {
  const d = typeof data === 'string' ? new Date(data + 'T00:00:00') : new Date(data);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Formata tempo decorrido de forma legível (ex: "2h 30min").
 * @param minutos - Minutos totais
 * @returns String formatada
 */
export function formatarTempoDecorrido(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}

/**
 * Retorna array de meses do ano para selects.
 * @returns Array de { valor: número (1-12), rotulo: nome }
 */
export function obterMeses(): Array<{ valor: number; rotulo: string }> {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses.map((nome, i) => ({ valor: i + 1, rotulo: nome }));
}

/**
 * Retorna array de anos para selects (ano atual ± range).
 * @param range - Quantidade de anos antes/depois (padrão: 2)
 * @returns Array de números
 */
export function obterAnos(range = 2): number[] {
  const anoAtual = new Date().getFullYear();
  const anos: number[] = [];
  for (let i = -range; i <= range; i++) {
    anos.push(anoAtual + i);
  }
  return anos;
}

/**
 * Verifica se string é data válida no formato YYYY-MM-DD.
 * @param valor - String a validar
 * @returns true se válida
 */
export function ehDataValida(valor: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(valor)) return false;
  const data = new Date(valor + 'T00:00:00');
  return !isNaN(data.getTime()) && formatarParaInput(data) === valor;
}

/**
 * Calcula idade a partir de data de nascimento.
 * @param nascimento - String YYYY-MM-DD
 * @returns Idade em anos
 */
export function calcularIdade(nascimento: string): number {
  const hoje = new Date();
  const [ano, mes, dia] = nascimento.split('-').map(Number);
  const nasc = new Date(ano, mes - 1, dia);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mesDiff = hoje.getMonth() - nasc.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}