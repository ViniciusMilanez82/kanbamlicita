"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type FonteData = {
  id?: string;
  nome: string;
  tipo: string;
  parametros: Record<string, unknown>;
  filtros: Record<string, unknown> | null;
  periodicidade: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fonte: FonteData | null;
};

export function FonteDialog({ open, onOpenChange, fonte }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!fonte?.id;

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("pncp");
  const [periodicidade, setPeriodicidade] = useState("manual");
  const [palavrasChave, setPalavrasChave] = useState("");
  const [ufs, setUfs] = useState("");
  const [tamanhoPagina, setTamanhoPagina] = useState("50");
  const [paginasMaximas, setPaginasMaximas] = useState("3");
  const [url, setUrl] = useState("");
  const [petronectUsuario, setPetronectUsuario] = useState("");
  const [petronectSenha, setPetronectSenha] = useState("");

  // Re-seed quando o dialog abre (ou abre com fonte diferente).
  const seedKey = open ? `${fonte?.id ?? "new"}` : "closed";
  const [lastSeedKey, setLastSeedKey] = useState<string | null>(null);
  if (open && seedKey !== lastSeedKey) {
    setLastSeedKey(seedKey);
    if (fonte) {
      setNome(fonte.nome);
      setTipo(fonte.tipo);
      setPeriodicidade(fonte.periodicidade ?? "manual");
      const filtros = (fonte.filtros ?? {}) as Record<string, unknown>;
      const params = (fonte.parametros ?? {}) as Record<string, unknown>;
      setPalavrasChave(Array.isArray(filtros.palavrasChave) ? (filtros.palavrasChave as string[]).join(", ") : "");
      setUfs(Array.isArray(filtros.ufs) ? (filtros.ufs as string[]).join(", ") : "");
      setTamanhoPagina(String(params.tamanhoPagina ?? "50"));
      setPaginasMaximas(String(params.paginasMaximas ?? "3"));
      setUrl(String(params.url ?? ""));
      setPetronectUsuario(String(params.username ?? ""));
      setPetronectSenha(String(params.password ?? ""));
    } else {
      setNome("");
      setTipo("pncp");
      setPeriodicidade("manual");
      setPalavrasChave("");
      setUfs("");
      setTamanhoPagina("50");
      setPaginasMaximas("3");
      setUrl("");
      setPetronectUsuario("");
      setPetronectSenha("");
    }
  } else if (!open && lastSeedKey !== null) {
    setLastSeedKey(null);
  }

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const endpoint = isEdit ? `/api/fontes/${fonte!.id}` : "/api/fontes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Erro ao salvar");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(isEdit ? "Fonte atualizada!" : "Fonte criada!");
      queryClient.invalidateQueries({ queryKey: ["fontes"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe o nome da fonte");
      return;
    }

    const data: Record<string, unknown> = {
      nome: nome.trim(),
      tipo,
      periodicidade: periodicidade === "manual" ? "manual" : periodicidade,
    };

    if (tipo === "pncp") {
      data.filtros = {
        palavrasChave: palavrasChave.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
        ufs: ufs.split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s)),
      };
      data.parametros = {
        tamanhoPagina: Math.min(50, Math.max(5, Number(tamanhoPagina) || 50)),
        paginasMaximas: Math.min(10, Math.max(1, Number(paginasMaximas) || 3)),
      };
    } else if (tipo === "petronect") {
      if (!petronectUsuario.trim() || !petronectSenha.trim()) {
        toast.error("Informe o usuário e a senha do Petronect");
        return;
      }
      data.filtros = {
        palavrasChave: palavrasChave.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
      };
      data.parametros = {
        username: petronectUsuario.trim(),
        password: petronectSenha.trim(),
      };
    } else {
      data.parametros = { url: url.trim() };
      data.filtros = null;
    }

    mutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar fonte" : "Nova fonte de captação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: PNCP Contêineres" />
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Select value={tipo} onValueChange={(v) => { if (v != null) setTipo(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pncp">PNCP</SelectItem>
                <SelectItem value="petronect">Petronect</SelectItem>
                <SelectItem value="rss">RSS</SelectItem>
                <SelectItem value="scraping">Scraping</SelectItem>
                <SelectItem value="api_generica">API Genérica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "pncp" && (
            <>
              <div>
                <label className="text-sm font-medium">Palavras-chave (separadas por vírgula)</label>
                <Textarea
                  value={palavrasChave}
                  onChange={(e) => setPalavrasChave(e.target.value)}
                  placeholder="contêiner, container, equipamento portuário"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">UFs (separadas por vírgula)</label>
                <Input value={ufs} onChange={(e) => setUfs(e.target.value)} placeholder="SP, RJ, SC, RS" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Resultados por página</label>
                  <Input type="number" value={tamanhoPagina} onChange={(e) => setTamanhoPagina(e.target.value)} min={5} max={50} />
                </div>
                <div>
                  <label className="text-sm font-medium">Páginas máximas</label>
                  <Input type="number" value={paginasMaximas} onChange={(e) => setPaginasMaximas(e.target.value)} min={1} max={10} />
                </div>
              </div>
            </>
          )}

          {tipo === "petronect" && (
            <>
              <div>
                <label className="text-sm font-medium">Usuário (e-mail)</label>
                <Input value={petronectUsuario} onChange={(e) => setPetronectUsuario(e.target.value)} placeholder="seu@email.com" type="email" />
              </div>
              <div>
                <label className="text-sm font-medium">Senha</label>
                <Input value={petronectSenha} onChange={(e) => setPetronectSenha(e.target.value)} placeholder="Senha do Petronect" type="password" />
              </div>
              <div>
                <label className="text-sm font-medium">Palavras-chave (separadas por vírgula)</label>
                <Textarea
                  value={palavrasChave}
                  onChange={(e) => setPalavrasChave(e.target.value)}
                  placeholder="contêiner, container, equipamento portuário"
                  rows={3}
                />
              </div>
            </>
          )}

          {tipo !== "pncp" && tipo !== "petronect" && (
            <div>
              <label className="text-sm font-medium">URL da fonte</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/feed.xml" type="url" />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Periodicidade</label>
            <Select value={periodicidade} onValueChange={(v) => { if (v != null) setPeriodicidade(v); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="6h">A cada 6 horas</SelectItem>
                <SelectItem value="12h">A cada 12 horas</SelectItem>
                <SelectItem value="24h">A cada 24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
