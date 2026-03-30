export interface Empresa {
  id: string;
  nome: string;
  descricao: string | null;
  segmento: string | null;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  palavrasChave: string[];
  ativo: boolean;
}
