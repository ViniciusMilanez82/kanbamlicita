/**
 * Documentação em português para variáveis de ambiente (ajuste no servidor / hospedagem).
 * Exibida em Configurações para o admin saber o que existe sem abrir o código.
 */
export type ParametroServidorDoc = {
  variavel: string
  titulo: string
  descricao: string
  padrao?: string
}

export const PARAMETROS_SERVIDOR_PNCP: ParametroServidorDoc[] = [
  {
    variavel: 'PNCP_CONSULTA_BASE_URL',
    titulo: 'Endereço base da API de consultas PNCP',
    descricao:
      'Só use se precisar apontar para outro host (espelho, homologação). Em branco = API oficial gov.br.',
  },
  {
    variavel: 'PNCP_INTER_PAGE_DELAY_MS',
    titulo: 'Pausa entre páginas na importação',
    padrao: '450',
    descricao: 'Milissegundos de espera entre cada página ao percorrer o PNCP. Aumente se o portal estiver instável.',
  },
  {
    variavel: 'PNCP_FETCH_RETRY_MAX',
    titulo: 'Máximo de tentativas por requisição',
    padrao: '3',
    descricao: 'Quantas vezes repetir a chamada em caso de erro 5xx, timeout ou 429.',
  },
  {
    variavel: 'PNCP_FETCH_RETRY_BASE_MS',
    titulo: 'Base do tempo entre tentativas (ms)',
    padrao: '1400',
    descricao: 'O intervalo cresce a cada tentativa (backoff). Só altere se souber o efeito.',
  },
  {
    variavel: 'PNCP_FETCH_TIMEOUT_MS_PROBE',
    titulo: 'Tempo máximo — busca / pré-visualização',
    padrao: '120000',
    descricao: 'Timeout em milissegundos para a consulta rápida (ex.: botão Buscar no Importar).',
  },
  {
    variavel: 'PNCP_FETCH_TIMEOUT_MS_PAGE',
    titulo: 'Tempo máximo — cada página na importação',
    padrao: '240000',
    descricao: 'Timeout por página ao trazer lotes grandes. Aumente em rede lenta.',
  },
]
