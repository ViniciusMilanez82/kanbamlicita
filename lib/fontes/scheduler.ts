import { db } from "@/lib/db";
import { executarCaptacao } from "./pipeline";
import { verificarPrazosVencendo } from "@/lib/notificacoes/gerar";

const INTERVALO_CHECK_MS = 5 * 60 * 1000; // Verifica a cada 5 minutos

function parsePeriodicidade(p: string | null): number | null {
  if (!p) return null;
  const match = p.match(/^(\d+)(m|h|d)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  if (unit === "m") return n * 60 * 1000;
  if (unit === "h") return n * 60 * 60 * 1000;
  if (unit === "d") return n * 24 * 60 * 60 * 1000;
  return null;
}

/**
 * Verifica todas as fontes ativas e executa as que estão na hora.
 */
export async function verificarEExecutarFontes(): Promise<{
  executadas: string[];
  erros: string[];
}> {
  const executadas: string[] = [];
  const erros: string[] = [];

  try {
    const fontes = await db.fonteCaptacao.findMany({
      where: { ativo: true },
    });

    const agora = Date.now();

    for (const fonte of fontes) {
      try {
        const intervaloMs = parsePeriodicidade(fonte.periodicidade);
        if (!intervaloMs) continue; // Sem periodicidade = não agenda

        const ultimaSync = fonte.ultimaSincronizacao?.getTime() ?? 0;
        const proximaSync = ultimaSync + intervaloMs;

        if (agora >= proximaSync) {
          // Verificar se já tem execução rodando
          const emExecucao = await db.execucaoCaptacao.findFirst({
            where: { fonteId: fonte.id, status: "executando" },
          });
          if (emExecucao) continue;

          console.log(`[scheduler] Executando fonte: ${fonte.nome} (${fonte.id})`);
          await executarCaptacao(fonte.id, "scheduler");
          executadas.push(fonte.nome);
        }
      } catch (err) {
        const msg = `${fonte.nome}: ${err instanceof Error ? err.message : "Erro"}`;
        console.error(`[scheduler] Erro na fonte ${fonte.nome}:`, err);
        erros.push(msg);
      }
    }
  } catch (err) {
    console.error("[scheduler] Erro geral:", err);
    erros.push(err instanceof Error ? err.message : "Erro geral");
  }

  // Verificar prazos vencendo (a cada ciclo)
  verificarPrazosVencendo().catch(console.error);

  return { executadas, erros };
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia o scheduler em background (chamado uma vez no startup do servidor).
 */
export function iniciarScheduler() {
  if (intervalId) return; // Já rodando

  console.log(
    `[scheduler] Iniciado — verificando fontes a cada ${INTERVALO_CHECK_MS / 1000}s`
  );

  // Executar imediatamente na primeira vez (com delay de 10s para o server subir)
  setTimeout(() => {
    verificarEExecutarFontes().catch(console.error);
  }, 10_000);

  intervalId = setInterval(() => {
    verificarEExecutarFontes().catch(console.error);
  }, INTERVALO_CHECK_MS);
}

export function pararScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[scheduler] Parado");
  }
}
