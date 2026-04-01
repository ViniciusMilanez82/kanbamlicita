import type { Conector, FonteConfig, ResultadoConector } from "./types";

const COGNITO_REGION = "us-east-1";
const COGNITO_CLIENT_ID = "32buehkods10skc5rqhph6va24";
const API_BASE =
  "https://y1ww0xpk1g.execute-api.us-east-1.amazonaws.com/v1";

export type PetronectOportunidade = {
  OPPORT_NUM: string;
  OPPORT_DESCR: string;
  DESC_OBJ_CONTRAT?: string;
  DESC_DETAIL?: string;
  COMPANY_DESC?: string;
  COMPANY?: string;
  STATUS_DESC?: string;
  STATUS?: string;
  OPPORT_TYPE?: string;
  START_DATE?: string;
  END_DATE?: string;
  OPEN_DATE?: string;
  POSTING_DATE?: string;
  REGIONS?: { COUNTRY: string; REGION_DESCRIPTION: string; REGION: string }[];
  NAT_COVERAGE?: string;
  DISPUTE_MODE?: string;
  ITEMS?: {
    ITEM_DESC?: string;
    QUANTITY?: number;
    UNIT?: string;
    FAMILY_DESCR?: string;
    [key: string]: unknown;
  }[];
  score?: number;
  highlight?: Record<string, string[]>;
  [key: string]: unknown;
};

/**
 * Autentica via AWS Cognito USER_PASSWORD_AUTH e retorna o accessToken.
 */
async function autenticarCognito(
  username: string,
  password: string
): Promise<string> {
  const url = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    const msg =
      data?.__type === "NotAuthorizedException"
        ? "E-mail ou senha incorretos para o Petronect."
        : "Não foi possível conectar ao Petronect. Tente novamente mais tarde.";
    throw new Error(msg);
  }

  const token = data.AuthenticationResult?.AccessToken;
  if (!token) {
    throw new Error(
      "Não foi possível obter o token do Petronect. Verifique suas credenciais."
    );
  }
  return token as string;
}

async function buscarOportunidades(
  token: string,
  query: string
): Promise<PetronectOportunidade[]> {
  const url = new URL(`${API_BASE}/match-relevancia/biddings`);
  url.searchParams.set("query", query);
  url.searchParams.set("isExactTerm", "false");
  url.searchParams.set("onlyNew", "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Sessão expirada. Tente buscar novamente.");
    }
    throw new Error(
      "Erro ao buscar oportunidades no Petronect. Tente novamente mais tarde."
    );
  }

  const data = (await res.json()) as { data?: PetronectOportunidade[] };
  return data.data ?? [];
}

export class ConectorPetronect implements Conector {
  async *buscar(fonte: FonteConfig): AsyncGenerator<ResultadoConector[]> {
    const { username, password } = fonte.parametros;
    if (!username || !password) {
      throw new Error(
        "Credenciais do Petronect não configuradas (e-mail e senha)"
      );
    }

    const token = await autenticarCognito(username, password);
    const palavrasChave = fonte.filtros.palavrasChave ?? [];

    if (palavrasChave.length === 0) {
      palavrasChave.push("");
    }

    for (const termo of palavrasChave) {
      const oportunidades = await buscarOportunidades(token, termo);

      if (oportunidades.length === 0) continue;

      const resultados: ResultadoConector[] = oportunidades.map((item) => {
        const uf =
          item.REGIONS?.[0]?.REGION ?? undefined;
        const municipio =
          item.REGIONS?.[0]?.REGION_DESCRIPTION ?? undefined;

        return {
          identificadorExterno: `petronect:${item.OPPORT_NUM}`,
          dados: {
            titulo:
              item.DESC_OBJ_CONTRAT ||
              item.OPPORT_DESCR ||
              `Oportunidade ${item.OPPORT_NUM}`,
            orgao: item.COMPANY_DESC,
            objeto: item.DESC_OBJ_CONTRAT || item.OPPORT_DESCR,
            modalidade: item.OPPORT_TYPE,
            uf,
            municipio,
            dataPublicacao: item.POSTING_DATE || item.START_DATE,
            dataSessao: item.END_DATE,
            linkOrigem: `https://minhapetronect.com.br/oportunidadespublicas`,
          },
          dadosBrutos: item as unknown as Record<string, unknown>,
        };
      });

      yield resultados;
    }
  }
}

export { autenticarCognito, buscarOportunidades };
