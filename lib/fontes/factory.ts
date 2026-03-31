import type { TipoFonte } from "@/lib/generated/prisma/client";
import type { Conector } from "./types";
import { ConectorPncp } from "./conector-pncp";
import { ConectorGenerico } from "./conector-generico";

export function criarConector(tipo: TipoFonte): Conector {
  switch (tipo) {
    case "pncp":
      return new ConectorPncp();
    case "rss":
    case "scraping":
    case "api_generica":
      return new ConectorGenerico();
    default:
      throw new Error(`Tipo de fonte não suportado: ${tipo}`);
  }
}
