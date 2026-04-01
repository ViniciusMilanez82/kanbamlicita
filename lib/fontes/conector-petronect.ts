import type { Conector, FonteConfig, ResultadoConector } from "./types";

const BASE_URL =
  "https://rc4nmhja42.execute-api.us-east-1.amazonaws.com/v1/oportunidade-publica/aberta";

type PetronectOportunidade = {
  opport_num: number;
  descricao?: string;
  orgao?: string;
  objeto?: string;
  modalidade?: string;
  uf?: string;
  municipio?: string;
  valor_estimado?: number;
  data_publicacao?: string;
  data_fim?: string;
  [key: string]: unknown;
};

async function autenticar(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const texto = await res.text().catch(() => "");

  if (texto.trimStart().startsWith("<")) {
    throw new Error("O Petronect está fora do ar neste momento. Tente novamente mais tarde.");
  }

  if (!res.ok) {
    throw new Error(`Falha na autenticação Petronect (${res.status}): ${texto}`);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error("Resposta inesperada do Petronect. Tente novamente mais tarde.");
  }

  const token = data.token ?? data.access_token ?? data.Token;
  if (!token) {
    throw new Error("Token não encontrado na resposta de autenticação");
  }
  return token as string;
}

async function buscarOportunidades(
  token: string,
  query: string
): Promise<PetronectOportunidade[]> {
  const url = new URL(`${BASE_URL}/all`);
  url.searchParams.set("query", query);
  url.searchParams.set("onlyNew", "true");
  url.searchParams.set("isExactTerm", "false");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const texto = await res.text().catch(() => "");

  if (texto.trimStart().startsWith("<")) {
    throw new Error("O Petronect está fora do ar neste momento. Tente novamente mais tarde.");
  }

  if (!res.ok) {
    throw new Error(`Erro ao buscar oportunidades Petronect (${res.status}): ${texto}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error("Resposta inesperada do Petronect. Tente novamente mais tarde.");
  }

  if (Array.isArray(data)) return data as PetronectOportunidade[];
  const obj = data as Record<string, unknown>;
  const arr = obj.items ?? obj.data ?? [];
  return arr as PetronectOportunidade[];
}

export class ConectorPetronect implements Conector {
  async *buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]> {
    const { username, password } = fonte.parametros;
    if (!username || !password) {
      throw new Error("Credenciais do Petronect não configuradas (usuário e senha)");
    }

    const token = await autenticar(username, password);
    const palavrasChave = fonte.filtros.palavrasChave ?? [];

    if (palavrasChave.length === 0) {
      palavrasChave.push("");
    }

    for (const termo of palavrasChave) {
      const oportunidades = await buscarOportunidades(token, termo);

      if (oportunidades.length === 0) continue;

      const resultados: ResultadoConector[] = oportunidades.map((item) => ({
        identificadorExterno: `petronect:${item.opport_num}`,
        dados: {
          titulo: item.descricao ?? `Oportunidade ${item.opport_num}`,
          orgao: item.orgao,
          objeto: item.objeto,
          modalidade: item.modalidade,
          uf: item.uf,
          municipio: item.municipio,
          valorEstimado: item.valor_estimado,
          dataPublicacao: item.data_publicacao,
          dataSessao: item.data_fim,
          linkOrigem: `${BASE_URL}/${item.opport_num}`,
        },
        dadosBrutos: item as unknown as Record<string, unknown>,
      }));

      yield resultados;
    }
  }
}
