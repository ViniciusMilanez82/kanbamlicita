import { db } from "@/lib/db";
import { getAuthFromRequest, naoAutenticado } from "@/lib/auth-api";
import { readFile } from "fs/promises";
import path from "path";

// GET — download de documento
export async function GET(
  req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return naoAutenticado();

  const { docId } = await params;

  const doc = await db.documento.findUnique({ where: { id: docId } });
  if (!doc) {
    return new Response("Documento não encontrado", { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), doc.caminho);
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.nomeOriginal)}"`,
        "Content-Length": String(doc.tamanho),
      },
    });
  } catch {
    return new Response("Arquivo não encontrado no servidor", { status: 404 });
  }
}
