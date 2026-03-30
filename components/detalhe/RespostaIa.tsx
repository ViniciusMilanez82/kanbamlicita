"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { AcaoIa } from "@/types/licitacao";

/** Renderiza campos JSON da resposta IA de forma legível. */
function CamposJson({ json }: { json: Record<string, unknown> }) {
  return (
    <div className="space-y-2 text-sm">
      {!!json.relevancia && (
        <p><strong>Relevância:</strong> {String(json.relevancia)}</p>
      )}
      {!!json.recomendacao && (
        <p><strong>Recomendação:</strong> {String(json.recomendacao)}</p>
      )}
      {!!json.justificativa && (
        <p className="text-slate-600">{String(json.justificativa)}</p>
      )}
      {!!json.resumo && (
        <p className="text-slate-600">{String(json.resumo)}</p>
      )}
      {!!json.estrategia && (
        <p className="text-slate-600">{String(json.estrategia)}</p>
      )}
      {Array.isArray(json.oportunidades) && json.oportunidades.length > 0 && (
        <div>
          <strong>Oportunidades:</strong>
          <ul className="ml-4 list-disc text-slate-600">
            {(json.oportunidades as string[]).map((o, i) => (
              <li key={i}>{typeof o === "string" ? o : JSON.stringify(o)}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(json.riscos) && json.riscos.length > 0 && (
        <div>
          <strong>Riscos:</strong>
          <ul className="ml-4 list-disc text-slate-600">
            {(json.riscos as string[]).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(json.proximosPassos) && json.proximosPassos.length > 0 && (
        <div>
          <strong>Próximos passos:</strong>
          <ul className="ml-4 list-disc text-slate-600">
            {(json.proximosPassos as string[]).map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
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
