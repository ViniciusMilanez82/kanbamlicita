"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function UsuariosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState("user");

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => fetch("/api/admin/usuarios").then((r) => r.json()),
  });

  const criarMutation = useMutation({
    mutationFn: () =>
      fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, email, senha, role }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e: { error: string }) => Promise.reject(new Error(e.error)));
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado!");
      setShowForm(false);
      setNome(""); setEmail(""); setSenha(""); setRole("user");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; ativo: boolean }) =>
      fetch(`/api/admin/usuarios/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: data.ativo }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Atualizado!");
    },
  });

  return (
    <div className="max-w-lg">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="mb-4">
        {showForm ? "Cancelar" : "Novo Usuário"}
      </Button>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-4 space-y-3">
          <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <select className="w-full rounded border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={() => criarMutation.mutate()} disabled={!nome || !email || !senha}>Criar</Button>
        </div>
      )}

      <div className="space-y-2">
        {usuarios.map((u: { id: string; name: string | null; email: string; role: string; ativo: boolean }) => (
          <div key={u.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div>
              <span className="font-medium text-sm">{u.name ?? u.email}</span>
              <span className="text-xs text-slate-400 ml-2">{u.email}</span>
              <Badge variant="outline" className="ml-2 text-[10px]">{u.role}</Badge>
            </div>
            <Button
              size="sm"
              variant={u.ativo ? "outline" : "destructive"}
              onClick={() => toggleMutation.mutate({ id: u.id, ativo: !u.ativo })}
            >
              {u.ativo ? "Desativar" : "Ativar"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
