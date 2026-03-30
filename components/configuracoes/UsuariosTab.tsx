"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, UserPlus, Shield, User } from "lucide-react";
import { toast } from "sonner";

export function UsuariosTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [role, setRole] = useState("user");

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const r = await fetch("/api/admin/usuarios");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erro ao carregar usuários");
      return data.usuarios ?? data;
    },
  });

  const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];

  const criarMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, email, senha, role }),
      });
      const text = await r.text();
      const data = text ? JSON.parse(text) : {};
      if (!r.ok) throw new Error(data.error ?? "Erro ao criar usuário");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado!");
      setShowForm(false);
      setNome(""); setEmail(""); setSenha(""); setConfirmarSenha(""); setRole("user"); setMostrarSenha(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (data: { id: string; ativo: boolean }) => {
      const r = await fetch(`/api/admin/usuarios/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: data.ativo }),
      });
      const text = await r.text();
      const json = text ? JSON.parse(text) : {};
      if (!r.ok) throw new Error(json.error ?? "Erro ao atualizar");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Atualizado!");
    },
  });

  const senhasDiferentes = senha && confirmarSenha && senha !== confirmarSenha;

  return (
    <div className="max-w-2xl">
      {/* ── Lista de usuários cadastrados ── */}
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        Usuários cadastrados ({listaUsuarios.length})
      </h3>

      {listaUsuarios.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">Nenhum usuário cadastrado.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {listaUsuarios.map((u: { id: string; name: string | null; email: string; role: string; ativo: boolean; criadoEm?: string }) => (
            <div
              key={u.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                u.ativo ? "bg-white" : "bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  u.role === "admin" ? "bg-amber-100" : "bg-blue-100"
                }`}>
                  {u.role === "admin" ? (
                    <Shield className="h-4 w-4 text-amber-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{u.name || "Sem nome"}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${u.role === "admin" ? "border-amber-300 text-amber-700" : ""}`}
                    >
                      {u.role === "admin" ? "Administrador" : "Usuário"}
                    </Badge>
                    {!u.ativo && (
                      <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{u.email}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant={u.ativo ? "outline" : "default"}
                onClick={() => toggleMutation.mutate({ id: u.id, ativo: !u.ativo })}
              >
                {u.ativo ? "Desativar" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulário de novo usuário ── */}
      <Button
        size="sm"
        onClick={() => setShowForm(!showForm)}
        variant={showForm ? "outline" : "default"}
      >
        {showForm ? "Cancelar" : (
          <><UserPlus className="h-4 w-4 mr-1" /> Novo Usuário</>
        )}
      </Button>

      {showForm && (
        <div className="mt-4 rounded-lg border bg-white p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Nome</label>
            <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Email</label>
            <Input placeholder="email@exemplo.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Senha</label>
            <div className="relative">
              <Input
                placeholder="Senha"
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Confirmar senha</label>
            <div className="relative">
              <Input
                placeholder="Digite a senha novamente"
                type={mostrarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {senhasDiferentes && (
              <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Permissão</label>
            <select className="w-full rounded border px-3 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <Button
            onClick={() => criarMutation.mutate()}
            disabled={!nome || !email || !senha || !!senhasDiferentes || criarMutation.isPending}
            className="w-full"
          >
            Criar Usuário
          </Button>
        </div>
      )}
    </div>
  );
}
