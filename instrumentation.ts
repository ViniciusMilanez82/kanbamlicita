export async function register() {
  // Apenas no servidor Node.js (não no edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarScheduler } = await import("@/lib/fontes/scheduler");
    iniciarScheduler();
  }
}
