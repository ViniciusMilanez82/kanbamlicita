import type { TipoFonte } from "@/lib/generated/prisma/client";

export type DadosNormalizados = {
  titulo: string;
  orgao?: string;
  objeto?: string;
  modalidade?: string;
  uf?: string;
  municipio?: string;
  valorEstimado?: number;
  dataPublicacao?: string;
  dataSessao?: string;
  linkOrigem?: string;
};

export type ResultadoConector = {
  identificadorExterno: string;
  dados: DadosNormalizados;
  dadosBrutos: Record<string, unknown>;
};

export type FiltrosFonte = {
  palavrasChave?: string[];
  ufs?: string[];
};

export type ParametrosFonte = {
  tamanhoPagina?: number;
  paginasMaximas?: number;
  url?: string;
  username?: string;
  password?: string;
  seletores?: {
    lista?: string;
    titulo?: string;
    link?: string;
    descricao?: string;
  };
};

export type FonteConfig = {
  id: string;
  tipo: TipoFonte;
  filtros: FiltrosFonte;
  parametros: ParametrosFonte;
};

export interface Conector {
  buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]>;
}
