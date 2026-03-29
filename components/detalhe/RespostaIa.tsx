"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { AcaoIa } from "@/types/licitacao";

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
        <div className="space-y-2 text-sm">
          {json.relevancia && (
            <p><strong>Relevância:</strong> {json.relevancia as string}</p>
          )}
          {json.recomendacao && (
            <p><strong>Recomendação:</strong> {json.recomendacao as string}</p>
          )}
          {json.justificativa && (
            <p className="text-slate-600">{json.justificativa as string}</p>
          )}
          {json.resumo && (
            <p className="text-slate-600">{json.resumo as string}</p>
          )}
          {json.estrategia && (
            <p className="text-slate-600">{json.estrategia as string}</p>
          )}
          {Array.isArray(json.oportunidades) && json.oportunidades.length > 0 && (
            <div>
              <strong>Oportunidades:</strong>
              <ul className="ml-4 list-disc text-slate-600">
                {(json.oportunidades as string[]).map((o, i) => <li key={i}>{typeof o === "string" ? o : JSON.stringify(o)}</li>)}
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
      ) : (
        <p className="text-sm whitespace-pre-wrap text-slate-600">{acao.resposta}</p>
      )}

      {acao.status === "erro" && (
        <p className="text-sm text-red-600 mt-2">Erro: {acao.erro}</p>
      )}
    </div>
  );
}
