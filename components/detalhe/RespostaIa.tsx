"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { AcaoIa } from "@/types/licitacao";

/** Badge colorido para relevância/confiança */
function RelevBadge({ value, label }: { value: string; label?: string }) {
  const colors: Record<string, string> = {
    alta: "bg-green-100 text-green-700",
    media: "bg-yellow-100 text-yellow-700",
    baixa: "bg-orange-100 text-orange-700",
    nenhuma: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colors[value] ?? "bg-slate-100 text-slate-600"}`}>
      {label ? `${label}: ${value}` : value}
    </span>
  );
}

/** Badge colorido para recomendação */
function RecomendacaoBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    AVANCAR: "bg-green-100 text-green-700",
    ACOMPANHAR: "bg-yellow-100 text-yellow-700",
    DESCARTAR: "bg-red-100 text-red-700",
    NAO_RECOMENDADO: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    AVANCAR: "Avançar",
    ACOMPANHAR: "Acompanhar",
    DESCARTAR: "Descartar",
    NAO_RECOMENDADO: "Não recomendado",
    TOTAL: "Total",
    PARCIAL: "Parcial",
    POR_LOTE: "Por lote",
    PARCERIA: "Parceria",
    SUBFORNECIMENTO: "Subfornecimento",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colors[value] ?? "bg-blue-100 text-blue-700"}`}>
      {labels[value] ?? value}
    </span>
  );
}

/** Renderiza lista de objetos com nome+motivo */
function ListaNomeMotivo({ items, titulo }: { items: { nome?: string; identificador?: string; motivo?: string }[]; titulo: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <strong>{titulo}:</strong>
      <ul className="ml-4 list-disc text-slate-600">
        {items.map((item, i) => (
          <li key={i}>
            <span className="font-medium">{item.nome ?? item.identificador}</span>
            {item.motivo && <span> — {item.motivo}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renderiza lista simples de strings */
function ListaSimples({ items, titulo }: { items: string[]; titulo: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <strong>{titulo}:</strong>
      <ul className="ml-4 list-disc text-slate-600">
        {items.map((item, i) => (
          <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Renderiza aderência (novo campo da triagem) */
function AderenciaBadges({ aderencia }: { aderencia: Record<string, boolean> }) {
  const labels: Record<string, string> = {
    direta: "Direta",
    porAplicacao: "Por aplicação",
    porContexto: "Por contexto",
    oportunidadeOculta: "Oportunidade oculta",
  };
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(aderencia).map(([key, val]) => (
        <span
          key={key}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            val ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
          }`}
        >
          {labels[key] ?? key}: {val ? "Sim" : "Não"}
        </span>
      ))}
    </div>
  );
}

/** Badges de cabeçalho (relevância, confiança, recomendação) */
function CabecalhoBadges({ json }: { json: Record<string, unknown> }) {
  const relevancia = json.relevancia as string | undefined;
  const confianca = json.confiancaAnalise as string | undefined;
  const recomendacao = json.recomendacao as string | undefined;
  const participacao = json.tipoParticipacaoSugerida as string | undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {relevancia && <RelevBadge value={relevancia} label="Relevância" />}
      {confianca && <RelevBadge value={confianca} label="Confiança" />}
      {recomendacao && <RecomendacaoBadge value={recomendacao} />}
      {participacao && <RecomendacaoBadge value={participacao} />}
    </div>
  );
}

/** Helper para extrair array segura do json */
function getArr(json: Record<string, unknown>, key: string): string[] {
  const v = json[key];
  return Array.isArray(v) ? (v as string[]) : [];
}

/** Helper para extrair array de objetos do json */
function getObjArr(json: Record<string, unknown>, key: string): { nome?: string; identificador?: string; motivo?: string }[] {
  const v = json[key];
  return Array.isArray(v) ? (v as { nome?: string; identificador?: string; motivo?: string }[]) : [];
}

/** Renderiza campos JSON da resposta IA de forma legível — suporta formato novo e legado. */
function CamposJson({ json }: { json: Record<string, unknown> }) {
  const justificativa = json.justificativa ? String(json.justificativa) : null;
  const resumo = json.resumo ? String(json.resumo) : null;
  const estrategia = json.estrategia ? String(json.estrategia) : null;
  const aderencia = json.aderencia && typeof json.aderencia === "object"
    ? (json.aderencia as Record<string, boolean>)
    : null;

  const produtosRelacionados = getObjArr(json, "produtosRelacionados");
  const produtosSugeridos = getObjArr(json, "produtosSugeridos");
  const lotesOuItensPrioritarios = getObjArr(json, "lotesOuItensPrioritarios");

  const oportunidades = getArr(json, "oportunidades");
  const riscos = getArr(json, "riscos");
  const pontosFortes = getArr(json, "pontosFortes");
  const documentacaoNecessaria = getArr(json, "documentacaoNecessaria");
  const cuidados = getArr(json, "cuidados");
  const motivoFalsoNegativo = getArr(json, "motivoFalsoNegativoProvavel");
  const proximosPassos = getArr(json, "proximosPassos");
  const proximoMovimento = getArr(json, "proximoMovimentoComercial");

  return (
    <div className="space-y-2 text-sm">
      <CabecalhoBadges json={json} />

      {aderencia && (
        <div>
          <strong className="text-xs">Aderência:</strong>
          <AderenciaBadges aderencia={aderencia} />
        </div>
      )}

      {justificativa && <p className="text-slate-600">{justificativa}</p>}
      {resumo && <p className="text-slate-600">{resumo}</p>}
      {estrategia && <p className="text-slate-600">{estrategia}</p>}

      {produtosRelacionados.length > 0 && (
        <ListaNomeMotivo items={produtosRelacionados} titulo="Produtos relacionados" />
      )}
      {produtosSugeridos.length > 0 && (
        <ListaNomeMotivo items={produtosSugeridos} titulo="Produtos sugeridos" />
      )}
      {lotesOuItensPrioritarios.length > 0 && (
        <ListaNomeMotivo items={lotesOuItensPrioritarios} titulo="Lotes/itens prioritários" />
      )}

      {oportunidades.length > 0 && <ListaSimples items={oportunidades} titulo="Oportunidades" />}
      {riscos.length > 0 && <ListaSimples items={riscos} titulo="Riscos" />}
      {pontosFortes.length > 0 && <ListaSimples items={pontosFortes} titulo="Pontos fortes" />}
      {documentacaoNecessaria.length > 0 && <ListaSimples items={documentacaoNecessaria} titulo="Documentação necessária" />}
      {cuidados.length > 0 && <ListaSimples items={cuidados} titulo="Cuidados" />}
      {motivoFalsoNegativo.length > 0 && <ListaSimples items={motivoFalsoNegativo} titulo="Motivos de possível falso negativo" />}
      {proximosPassos.length > 0 && <ListaSimples items={proximosPassos} titulo="Próximos passos" />}
      {proximoMovimento.length > 0 && <ListaSimples items={proximoMovimento} titulo="Próximo movimento comercial" />}
    </div>
  );
}

/** Resposta IA já gravada (histórico). */
export function RespostaIa({ acao }: { acao: AcaoIa }) {
  const json = acao.respostaJson as Record<string, unknown> | null;

  return (
    <div className="rounded-lg border bg-blue-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-[10px]">
          {acao.tipo} · {acao.modelo}
        </Badge>
        <span className="text-[10px] text-slate-400">{formatDateTime(acao.criadoEm)}</span>
      </div>

      {json ? (
        <CamposJson json={json} />
      ) : (
        <p className="text-sm whitespace-pre-wrap text-slate-600">{acao.resposta}</p>
      )}

      {acao.status === "erro" && (
        <p className="text-sm text-red-600 mt-2">Erro: {acao.erro}</p>
      )}
    </div>
  );
}

/** Preview de resposta IA (ainda não gravada — aguardando decisão do usuário). */
export function RespostaIaPreview({
  tipo,
  resposta,
  respostaJson,
  modelo,
}: {
  tipo: string;
  resposta: string;
  respostaJson: Record<string, unknown> | null;
  modelo: string;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {tipo} · {modelo}
        </Badge>
      </div>

      {respostaJson ? (
        <CamposJson json={respostaJson} />
      ) : (
        <p className="whitespace-pre-wrap text-slate-600">{resposta}</p>
      )}
    </div>
  );
}
