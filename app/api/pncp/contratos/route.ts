import { NextResponse } from "next/server";
import { fetchContratosPublicacao } from "@/lib/pncp/client";
import {
  filtrarContratos,
  parsePalavrasChave,
  parseUfsCsv,
  toListaItem,
} from "@/lib/pncp/normalize";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";

const YMD = /^\d{8}$/;

/**
 * Busca contratos no PNCP com pré-filtro real por palavras-chave e UF.
 *
 * Como a API do governo NÃO aceita filtro por texto, o servidor:
 * 1. Busca páginas sequencialmente na API do governo
 * 2. Filtra cada lote por UF e palavras-chave
 * 3. Acumula até atingir a quantidade pedida pelo usuário
 * 4. Retorna os totais (consultados vs. encontrados) para feedback claro
 *
 * Limite de segurança: no máximo 10 páginas por requisição para não
 * sobrecarregar o servidor nem a API do governo.
 */
const MAX_PAGINAS_VARREDURA = 10;

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const body = await req.json();
  const dataInicial = String(body.dataInicial ?? "").replace(/-/g, "");
  const dataFinal = String(body.dataFinal ?? "").replace(/-/g, "");
  const quantidadeDesejada = Math.min(Math.max(Number(body.tamanhoPagina) || 20, 5), 50);

  const ufsInput: string[] = Array.isArray(body.ufs)
    ? body.ufs
        .map((u: unknown) => String(u).trim().toUpperCase())
        .filter((u: string) => /^[A-Z]{2}$/.test(u))
    : parseUfsCsv(String(body.ufsCsv ?? ""));

  const termos: string[] = Array.isArray(body.palavrasChave)
    ? body.palavrasChave.map((p: unknown) => String(p).trim()).filter(Boolean)
    : parsePalavrasChave(String(body.palavrasChaveTexto ?? ""));

  if (!YMD.test(dataInicial) || !YMD.test(dataFinal)) {
    return NextResponse.json(
      { error: "Use datas válidas no formato YYYYMMDD ou YYYY-MM-DD" },
      { status: 400 }
    );
  }
  if (dataInicial > dataFinal) {
    return NextResponse.json(
      { error: "A data de início não pode ser depois da data de fim" },
      { status: 400 }
    );
  }

  const temFiltro = ufsInput.length > 0 || termos.length > 0;

  // Se não tem filtro nenhum, busca normal (uma página só)
  if (!temFiltro) {
    try {
      const pagina = Number(body.pagina) || 1;
      const api = await fetchContratosPublicacao({
        dataInicial,
        dataFinal,
        pagina,
        tamanhoPagina: quantidadeDesejada,
      });
      const itens = (api.data ?? []).map(toListaItem);
      return NextResponse.json({
        itens,
        totalRegistros: api.totalRegistros ?? 0,
        totalPaginas: api.totalPaginas ?? 0,
        numeroPagina: api.numeroPagina ?? pagina,
        totalConsultados: itens.length,
        totalFiltrados: itens.length,
        temMaisNoGoverno: (api.paginasRestantes ?? 0) > 0,
        filtrosUsados: { ufs: [], palavrasChave: [] },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao consultar o site do governo";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // Com filtro: varre múltiplas páginas para preencher a quantidade desejada
  try {
    const paginaUsuario = Math.max(Number(body.pagina) || 1, 1);

    // Calcula quantos itens filtrados precisamos pular (páginas anteriores)
    const pularFiltrados = (paginaUsuario - 1) * quantidadeDesejada;

    let paginaApi = 1;
    let totalRegistrosGoverno = 0;
    let totalPaginasGoverno = 0;
    let totalConsultados = 0;
    const todosEncontrados: ReturnType<typeof toListaItem>[] = [];
    let acabouNoGoverno = false;
    const tamanhoLote = 50; // pega lotes grandes para filtrar mais rápido

    while (
      todosEncontrados.length < pularFiltrados + quantidadeDesejada &&
      paginaApi <= MAX_PAGINAS_VARREDURA * paginaUsuario &&
      !acabouNoGoverno
    ) {
      const api = await fetchContratosPublicacao({
        dataInicial,
        dataFinal,
        pagina: paginaApi,
        tamanhoPagina: tamanhoLote,
      });

      totalRegistrosGoverno = api.totalRegistros ?? 0;
      totalPaginasGoverno = api.totalPaginas ?? 0;
      const brutos = (api.data ?? []).map(toListaItem);
      totalConsultados += brutos.length;

      const filtrados = filtrarContratos(brutos, ufsInput, termos);
      todosEncontrados.push(...filtrados);

      if (brutos.length < tamanhoLote || (api.paginasRestantes ?? 0) === 0) {
        acabouNoGoverno = true;
      }
      paginaApi++;
    }

    const totalFiltrados = todosEncontrados.length;
    const itensParaExibir = todosEncontrados.slice(
      pularFiltrados,
      pularFiltrados + quantidadeDesejada
    );
    const totalPaginasFiltradas = Math.max(
      1,
      Math.ceil(totalFiltrados / quantidadeDesejada)
    );

    return NextResponse.json({
      itens: itensParaExibir,
      totalRegistros: totalRegistrosGoverno,
      totalPaginas: totalPaginasFiltradas,
      numeroPagina: paginaUsuario,
      totalConsultados,
      totalFiltrados,
      temMaisNoGoverno: !acabouNoGoverno,
      filtrosUsados: { ufs: ufsInput, palavrasChave: termos },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao consultar o site do governo";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
