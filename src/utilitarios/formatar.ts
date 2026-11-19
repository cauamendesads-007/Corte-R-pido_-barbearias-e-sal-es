/**
 * Funções puras de formatação para a aplicação Corte Rápido.
 * Sem dependências externas, totalmente testáveis.
 */

/**
 * Formata um valor numérico para moeda brasileira (R$).
 * @param valor - Valor em centavos ou reais (ex: 4000 ou 40)
 * @param emCentavos - Se true, trata o valor como centavos. Padrão: false (reais)
 * @returns String formatada (ex: "R$ 40,00")
 */
export function formatarMoeda(valor: number, emCentavos = false): string {
  const valorReais = emCentavos ? valor / 100 : valor;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorReais).replace(/ /g, ' ');
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY).
 * @param data - String no formato YYYY-MM-DD ou objeto Date
 * @returns String formatada (ex: "15/01/2024")
 */
export function formatarData(data: string | Date): string {
  const date = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata data e hora no padrão brasileiro.
 * @param data - String ISO ou objeto Date
 * @returns String formatada (ex: "15/01/2024 às 14:30")
 */
export function formatarDataHora(data: string | Date): string {
  const date = typeof data === 'string' ? new Date(data) : data;
  const dataFormatada = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFormatada = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dataFormatada} às ${horaFormatada}`;
}

/**
 * Formata apenas hora (HH:MM).
 * @param data - String ISO ou objeto Date
 * @returns String formatada (ex: "14:30")
 */
export function formatarHora(data: string | Date): string {
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata tempo relativo (ex: "há 5 min", "há 2 h", "há 3 d").
 * @param timestamp - Timestamp em milissegundos
 * @returns String formatada
 */
export function formatarTempoRelativo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHoras < 24) return `${diffHoras} h`;
  return `${diffDias} d`;
}

/**
 * Formata número abreviado (ex: 1.5k, 2.3M).
 * @param numero - Número a formatar
 * @returns String abreviada
 */
export function formatarNumeroCurto(numero: number): string {
  if (numero >= 1000000) {
    return (numero / 1000000).toFixed(1).replace('.', ',') + 'M';
  }
  if (numero >= 1000) {
    const valor = (numero / 1000).toFixed(1);
    return valor.endsWith('.0') ? valor.slice(0, -2) + 'k' : valor.replace('.', ',') + 'k';
  }
  return String(numero);
}

/**
 * Formata WhatsApp brasileiro: (DD) 9xxxx-xxxx
 * @param valor - String apenas com dígitos
 * @returns String formatada
 */
export function formatarWhatsapp(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/**
 * Valida WhatsApp brasileiro completo.
 * @param valor - String formatada ou não
 * @returns true se válido
 */
export function validarWhatsapp(valor: string): boolean {
  let digitos = valor.replace(/\D/g, '');
  // Remove código do país (55) se presente
  if (digitos.startsWith('55') && digitos.length === 13) {
    digitos = digitos.slice(2);
  }
  return /^\d{2}9\d{8}$/.test(digitos);
}

/**
 * Formata CPF: 000.000.000-00
 * @param valor - String apenas com dígitos
 * @returns String formatada
 */
export function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * Valida CPF (algoritmo oficial).
 * @param valor - String formatada ou não
 * @returns true se válido
 */
export function validarCpf(valor: string): boolean {
  const digitos = valor.replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(digitos[i], 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(digitos[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(digitos[i], 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(digitos[10], 10);
}

/**
 * Formata CEP: 00000-000
 * @param valor - String apenas com dígitos
 * @returns String formatada
 */
export function formatarCep(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/**
 * Gera slug a partir de string (remove acentos, espaços, etc).
 * @param texto - Texto original
 * @returns Slug (ex: "minha-barbearia")
 */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extrai iniciais do nome (máximo 2 letras).
 * @param nome - Nome completo
 * @returns Iniciais maiúsculas
 */
export function extrairIniciais(nome: string): string {
  return nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || nome[0]?.toUpperCase() || '';
}

/**
 * Trunca texto com reticências.
 * @param texto - Texto original
 * @param maximo - Número máximo de caracteres
 * @returns Texto truncado
 */
export function truncarTexto(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  return texto.slice(0, maximo - 3) + '...';
}

/**
 * Capitaliza primeira letra de cada palavra.
 * @param texto - Texto original
 * @returns Texto capitalizado
 */
export function capitalizarPalavras(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Remove acentos de string.
 * @param texto - Texto original
 * @returns Texto sem acentos
 */
export function removerAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace('ç', 'c')
    .replace('Ç', 'C');
}

/**
 * Formata data curta (DD/MM).
 * @param data - String YYYY-MM-DD ou objeto Date
 * @returns String formatada (ex: "15/01")
 */
export function formatarDataCurta(data: string | Date): string {
  const date = typeof data === 'string' ? new Date(data + 'T00:00:00') : data;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Calcula distância entre duas coordenadas (fórmula de Haversine).
 * @param lat1 - Latitude origem
 * @param lng1 - Longitude origem
 * @param lat2 - Latitude destino
 * @param lng2 - Longitude destino
 * @returns Distância em km
 */
export function calcularDistanciaKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Gera ID único simples (timestamp + random).
 * @returns String ID
 */
export function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Atrasa execução (sleep) para simular latência de rede.
 * @param ms - Milissegundos
 * @returns Promise que resolve após o tempo
 */
export function atrasar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clona objeto profundamente (deep clone).
 * @param obj - Objeto a clonar
 * @returns Cópia profunda
 */
export function clonarProfundo<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Verifica se valor está vazio (null, undefined, string vazia, array vazio, objeto vazio).
 * @param valor - Qualquer valor
 * @returns true se vazio
 */
export function estaVazio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0;
  if (typeof valor === 'object') return Object.keys(valor).length === 0;
  return false;
}

/**
 * Formata duração em minutos para formato legível (ex: "1h 30min").
 * @param minutos - Duração em minutos
 * @returns String formatada
 */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}

/**
 * Gera cores contrastantes para texto sobre fundo.
 * @param corFundo - Cor hex (ex: "#B45309")
 * @returns Cor do texto (#111 ou #fff)
 */
export function corTextoContrastante(corFundo: string): string {
  const hex = corFundo.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 140 ? '#111827' : '#ffffff';
}