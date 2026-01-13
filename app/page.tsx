"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, ShoppingCart, CheckSquare, Clock3, LogOut, Trash2, Menu, User as UserIcon, Upload } from "lucide-react";
import {
  createApiClient,
  loadStoredTokens,
  persistTokens,
} from "@/lib/api-client";
import {
  type Preferences,
  type ShoppingItem,
  type Tokens,
  type User,
  type Workout,
  type WorkoutHistory,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type AuthMode = "login" | "register";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Home() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({
    goals: [],
    trainingTypes: [],
  });
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("agenda");
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const api = useMemo(
    () =>
      createApiClient({
        tokens,
        setTokens: (value) => {
          setTokens(value);
          persistTokens(value);
        },
      }),
    [tokens],
  );

  useEffect(() => {
    const saved = loadStoredTokens();
    if (saved) setTokens(saved);
  }, []);

  useEffect(() => {
    if (tokens) {
      bootstrap();
    } else {
      setUser(null);
      setWorkouts([]);
      setHistory([]);
      setShopping([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const [me, workoutsRes, historyRes, shoppingRes, prefRes] = await Promise.all([
        api.auth.me(),
        api.workouts.list(),
        api.workouts.history(),
        api.shopping.list(),
        api.preferences.get(),
      ]);
      setUser(me.user);
      setWorkouts(workoutsRes.workouts);
      setHistory(historyRes.history);
      setShopping(shoppingRes.items);
      setPreferences(prefRes.preferences);
      setSelectedWorkoutId((workoutsRes.workouts[0]?.id as string | undefined) ?? null);
    } catch (err) {
      const error = err as Error;
      // Se for erro de autenticação, limpa os tokens
      if (error.message.includes("401") || error.message.includes("não autorizado") || error.message.includes("token")) {
        setTokens(null);
        persistTokens(null);
        setUser(null);
      }
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [workoutForm, setWorkoutForm] = useState({
    name: "",
    description: "",
    dayOfWeek: 1,
    time: "07:30",
    exercises: "",
  });

  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    description: "",
  });

  const [shoppingForm, setShoppingForm] = useState({
    name: "",
    quantity: "",
  });

  const [preferencesForm, setPreferencesForm] = useState({
    goals: "",
    trainingTypes: "",
  });

  useEffect(() => {
    setPreferencesForm({
      goals: preferences.goals.join(", "),
      trainingTypes: preferences.trainingTypes.join(", "),
    });
  }, [preferences]);

  function showMessage(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 3000);
  }

  async function handleAuthSubmit() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
      };
      const result =
        authMode === "login"
          ? await api.auth.login(payload)
          : await api.auth.register(payload);

      setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      persistTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      setUser(result.user);
      showMessage("Sessão iniciada com sucesso");
      await bootstrap();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (tokens?.refreshToken) {
      await api.auth.logout(tokens.refreshToken).catch(() => null);
    }
    setTokens(null);
    persistTokens(null);
    setUser(null);
  }

  async function handleCreateWorkout() {
    if (!workoutForm.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const exercises = workoutForm.exercises
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((text, index) => {
          const [name, description] = text.split(" - ");
          return { name, description: description || undefined, order: index };
        });

      const { workout } = await api.workouts.create({
        name: workoutForm.name,
        description: workoutForm.description,
        dayOfWeek: workoutForm.dayOfWeek,
        time: workoutForm.time,
        exercises,
      });
      setWorkouts((prev) => [...prev, workout].sort(sortWorkouts));
      setShowWorkoutModal(false);
      setWorkoutForm({
        name: "",
        description: "",
        dayOfWeek: 1,
        time: "07:30",
        exercises: "",
      });
      showMessage("Treino criado");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleExercise(
    workoutId: string,
    exerciseId: string,
    completed?: boolean,
  ) {
    try {
      const { exercise } = await api.workouts.toggleExercise(
        workoutId,
        exerciseId,
        completed,
      );
      setWorkouts((prev) =>
        prev.map((workout) =>
          workout.id === workoutId
            ? {
                ...workout,
                exercises: workout.exercises.map((ex) =>
                  ex.id === exerciseId ? { ...ex, completed: exercise.completed } : ex,
                ),
                completed:
                  workout.exercises.every(
                    (ex) =>
                      ex.id === exerciseId ? exercise.completed : ex.completed,
                  ) && workout.exercises.length > 0,
              }
            : workout,
        ),
      );
      bootstrap(); // mantém histórico sincronizado
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCompleteWorkout(workoutId: string) {
    try {
      const { workout } = await api.workouts.complete(workoutId);
      setWorkouts((prev) =>
        prev.map((w) => (w.id === workoutId ? { ...w, completed: workout.completed } : w)),
      );
      const { history: refreshed } = await api.workouts.history();
      setHistory(refreshed);
      showMessage("Treino concluído e enviado ao histórico");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleAddExercise() {
    if (!selectedWorkoutId || !exerciseForm.name.trim()) return;
    try {
      const exercise = await api.workouts.addExercise(selectedWorkoutId, {
        name: exerciseForm.name,
        description: exerciseForm.description,
        order: (workouts.find((w) => w.id === selectedWorkoutId)?.exercises.length ?? 0) + 1,
      });
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === selectedWorkoutId
            ? { ...w, exercises: [...w.exercises, exercise.exercise] }
            : w,
        ),
      );
      setExerciseForm({ name: "", description: "" });
      showMessage("Exercício adicionado");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleShoppingCreate() {
    if (!shoppingForm.name.trim()) return;
    try {
      const { item } = await api.shopping.create({
        name: shoppingForm.name,
        quantity: shoppingForm.quantity,
      });
      setShopping((prev) => [item, ...prev]);
      setShoppingForm({ name: "", quantity: "" });
      showMessage("Item adicionado à lista de compras");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleShoppingToggle(id: string, purchased: boolean) {
    try {
      const { item } = await api.shopping.toggle(id, purchased);
      setShopping((prev) =>
        prev.map((it) => (it.id === id ? { ...it, purchased: item.purchased } : it)),
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleShoppingRemove(id: string) {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await api.shopping.remove(id);
      setShopping((prev) => prev.filter((item) => item.id !== id));
      showMessage("Item removido");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleWorkoutDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este treino? Todos os exercícios serão removidos.")) return;
    try {
      await api.workouts.remove(id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      if (selectedWorkoutId === id) {
        setSelectedWorkoutId(null);
      }
      showMessage("Treino removido");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePreferencesSave() {
    const goals = preferencesForm.goals
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    const trainingTypes = preferencesForm.trainingTypes
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
    try {
      const { preferences: updated } = await api.preferences.update({
        goals,
        trainingTypes,
      });
      setPreferences(updated);
      showMessage("Preferências salvas");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdateAvatar() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { user: updated } = await api.auth.updateAvatar(avatarUrl || null);
      setUser(updated);
      setShowAvatarModal(false);
      setAvatarUrl("");
      showMessage("Avatar atualizado");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function progressStats() {
    if (workouts.length === 0) return 0;
    const completed = workouts.filter((w) => w.completed).length;
    return Math.round((completed / workouts.length) * 100);
  }

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null;

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-tight text-zinc-500 sm:text-sm">
            Treino
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl lg:text-4xl">
            Agenda, checklist e compras
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Planeje a semana, marque exercícios concluídos e mantenha tudo sincronizado.
          </p>
        </div>
        {user ? (
          <>
            {/* Desktop: Header normal */}
            <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
              <div className="text-right">
                <p className="text-xs text-zinc-500 sm:text-sm">Bem-vindo</p>
                <p className="text-sm font-semibold text-zinc-900 sm:text-base">{user.name}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout} 
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
            {/* Mobile: Menu hamburger */}
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Perfil com avatar */}
                  <div className="flex flex-col items-center gap-4 pb-6 border-b border-zinc-200">
                    <div className="relative">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.name}
                          width={80}
                          height={80}
                          className="h-20 w-20 rounded-full object-cover border-2 border-zinc-200"
                          unoptimized
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-zinc-200 flex items-center justify-center border-2 border-zinc-300">
                          <UserIcon className="h-10 w-10 text-zinc-500" />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowAvatarModal(true);
                        }}
                        className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                      <p className="text-xs text-zinc-600">{user.email}</p>
                    </div>
                  </div>
                  {/* Botão sair */}
                  <Button 
                    variant="outline" 
                    onClick={handleLogout} 
                    className="w-full gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : null}
      </header>

      {feedback ? (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 animate-in fade-in slide-in-from-top-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading && !user ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900"></div>
        </div>
      ) : !user ? (
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
          <Card className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">
                {authMode === "login" ? "Entrar" : "Criar conta"}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Sessão segura com tokens JWT (access + refresh) e bcrypt para senhas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              {authMode === "register" && (
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Seu nome"
                    value={authForm.name}
                    onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAuthSubmit}
                disabled={loading}
              >
                {authMode === "login" ? "Entrar" : "Criar conta"}
              </Button>
              <p className="text-sm text-zinc-600">
                {authMode === "login" ? "Ainda não tem conta?" : "Já possui conta?"}{" "}
                <button
                  className="font-semibold text-zinc-900 underline"
                  onClick={() =>
                    setAuthMode((mode) => (mode === "login" ? "register" : "login"))
                  }
                >
                  {authMode === "login" ? "Cadastre-se" : "Faça login"}
                </button>
              </p>
            </CardContent>
          </Card>
                <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Como funciona</CardTitle>
              <CardDescription className="text-sm text-zinc-300 sm:text-base">
                API Express + Prisma + PostgreSQL (Neon) com JWT e refresh token. UI em
                Next.js + shadcn/ui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm sm:text-base">
              <p className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Checklist de exercícios com conclusão automática do treino.
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Cronograma semanal por dia e horário.
              </p>
              <p className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Lista de compras vinculada ao usuário.
              </p>
              <p className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Preferências salvas no banco para personalização futura.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Progresso semanal</CardTitle>
                <CardDescription className="text-sm">Treinos concluídos vs. planejados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <Progress value={progressStats()} />
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>{workouts.filter((w) => w.completed).length} concluídos</span>
                  <span>{workouts.length} planejados</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferences.goals.map((goal) => (
                    <Badge key={goal} variant="outline">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Histórico recente</CardTitle>
                <CardDescription className="text-sm">Últimos treinos finalizados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-zinc-600">Sem histórico ainda.</p>
                ) : (
                  history.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-zinc-900">{item.workout.name}</p>
                        <p className="text-zinc-600">
                          {new Date(item.completedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant="success">Concluído</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Lista de compras</CardTitle>
                  <CardDescription className="text-sm">Suplementos e mercado</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="subtle" 
                  onClick={() => setActiveTab("compras")}
                  className="w-full sm:w-auto"
                >
                  Ver lista
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Item"
                    value={shoppingForm.name}
                    onChange={(e) =>
                      setShoppingForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                  <Input
                    placeholder="Qtd"
                    value={shoppingForm.quantity}
                    onChange={(e) =>
                      setShoppingForm((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                  <Button 
                    size="sm" 
                    onClick={handleShoppingCreate}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sm:hidden">Adicionar</span>
                  </Button>
                </div>
                <div className="space-y-2">
                  {shopping.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                        <p className="text-xs text-zinc-600">
                          {item.quantity || "Sem quantidade"}
                        </p>
                      </div>
                      <Checkbox
                        checked={item.purchased}
                        onChange={(e) => handleShoppingToggle(item.id, e.target.checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Área principal</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Agenda, checklist e preferências
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowWorkoutModal(true)} 
                className="w-full gap-2 sm:w-auto"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Novo treino
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 gap-1 sm:inline-flex sm:grid-cols-none">
                  <TabsTrigger value="agenda" className="text-xs sm:text-sm">Agenda</TabsTrigger>
                  <TabsTrigger value="treino" className="text-xs sm:text-sm">Checklist</TabsTrigger>
                  <TabsTrigger value="compras" className="text-xs sm:text-sm">Compras</TabsTrigger>
                  <TabsTrigger value="preferencias" className="text-xs sm:text-sm">Prefs</TabsTrigger>
                </TabsList>

                <TabsContent value="agenda" className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                    {workouts.length === 0 ? (
                      <p className="text-sm text-zinc-600">
                        Nenhum treino cadastrado. Crie um novo para começar.
                      </p>
                    ) : (
                      [...workouts].sort(sortWorkouts).map((workout) => (
                        <div
                          key={workout.id}
                          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <p className="text-xs uppercase tracking-tight text-zinc-500">
                                {dayLabels[workout.dayOfWeek]} · {workout.time}
                              </p>
                              <p className="text-base font-semibold text-zinc-900">
                                {workout.name}
                              </p>
                              <p className="text-sm text-zinc-600">
                                {workout.description || "Sem descrição"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={workout.completed ? "success" : "outline"}>
                                {workout.completed ? "Concluído" : "Pendente"}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleWorkoutDelete(workout.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {workout.exercises.slice(0, 3).map((ex) => (
                              <div
                                key={ex.id}
                                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-zinc-900">{ex.name}</p>
                                  <p className="text-xs text-zinc-600">
                                    {ex.description || "Sem detalhes"}
                                  </p>
                                </div>
                                <Checkbox
                                  checked={ex.completed}
                                  onChange={(e) =>
                                    handleToggleExercise(workout.id, ex.id, e.target.checked)
                                  }
                                />
                              </div>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedWorkoutId(workout.id);
                                setActiveTab("treino");
                              }}
                            >
                              Abrir checklist
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="treino" className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Escolha o treino</Label>
                    <select
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                      value={selectedWorkoutId ?? ""}
                      onChange={(e) => setSelectedWorkoutId(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {workouts.map((w) => (
                        <option key={w.id} value={w.id}>
                          {dayLabels[w.dayOfWeek]} · {w.time} — {w.name}
                        </option>
                      ))}
                    </select>

                    {selectedWorkout ? (
                      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase text-zinc-500">
                              {dayLabels[selectedWorkout.dayOfWeek]} · {selectedWorkout.time}
                            </p>
                            <p className="text-lg font-semibold text-zinc-900">
                              {selectedWorkout.name}
                            </p>
                          </div>
                          <Badge variant={selectedWorkout.completed ? "success" : "outline"}>
                            {selectedWorkout.completed ? "Fechado" : "Em andamento"}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {selectedWorkout.exercises.map((exercise) => (
                            <label
                              key={exercise.id}
                              className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3 transition-all hover:border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={exercise.completed}
                                onChange={(e) =>
                                  handleToggleExercise(
                                    selectedWorkout.id,
                                    exercise.id,
                                    e.target.checked,
                                  )
                                }
                                className="mt-1 h-4 w-4 rounded border-zinc-300 text-black accent-black"
                              />
                              <div>
                                <p className="text-sm font-medium text-zinc-900">
                                  {exercise.name}
                                </p>
                                <p className="text-xs text-zinc-600">
                                  {exercise.description || "Sem detalhes"}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Novo exercício"
                            value={exerciseForm.name}
                            onChange={(e) =>
                              setExerciseForm((p) => ({ ...p, name: e.target.value }))
                            }
                          />
                          <Input
                            placeholder="Descrição"
                            value={exerciseForm.description}
                            onChange={(e) =>
                              setExerciseForm((p) => ({ ...p, description: e.target.value }))
                            }
                          />
                          <Button size="sm" onClick={handleAddExercise}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={() => handleCompleteWorkout(selectedWorkout.id)}
                        >
                          Marcar treino como concluído
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600">
                        Selecione um treino para ver os exercícios.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-zinc-900">
                      Histórico de finalizações
                    </h3>
                    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4">
                      {history.length === 0 ? (
                        <p className="text-sm text-zinc-600">
                          Sem histórico ainda. Conclua um treino para registrar.
                        </p>
                      ) : (
                        history.slice(0, 10).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between border-b border-zinc-100 pb-2 last:border-b-0 last:pb-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900">
                                {item.workout.name}
                              </p>
                              <p className="text-xs text-zinc-600">
                                {new Date(item.completedAt).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Badge variant="success">Concluído</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="compras" className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                    {shopping.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-600">
                            {item.quantity || "Sem quantidade"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.purchased}
                            onChange={(e) => handleShoppingToggle(item.id, e.target.checked)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShoppingRemove(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="preferencias" className="mt-6 space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label>Objetivos (separe por vírgula)</Label>
                    <Input
                      placeholder="Hipertrofia, condicionamento, energia"
                      value={preferencesForm.goals}
                      onChange={(e) =>
                        setPreferencesForm((p) => ({ ...p, goals: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipos de treino preferidos</Label>
                    <Input
                      placeholder="Força, cardio intervalado, mobilidade"
                      value={preferencesForm.trainingTypes}
                      onChange={(e) =>
                        setPreferencesForm((p) => ({ ...p, trainingTypes: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handlePreferencesSave}>Salvar preferências</Button>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-zinc-800">
                      Preferências atuais
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {preferences.goals.map((goal) => (
                        <Badge key={goal} variant="outline">
                          {goal}
                        </Badge>
                      ))}
                      {preferences.trainingTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal
        open={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        title="Novo treino"
      >
        <div className="space-y-4 sm:space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Superior puxar"
                value={workoutForm.name}
                onChange={(e) =>
                  setWorkoutForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={workoutForm.time}
                onChange={(e) =>
                  setWorkoutForm((p) => ({ ...p, time: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                value={workoutForm.dayOfWeek}
                onChange={(e) =>
                  setWorkoutForm((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))
                }
              >
                {dayLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Resumo rápido"
                value={workoutForm.description}
                onChange={(e) =>
                  setWorkoutForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Exercícios (um por linha, opcional &apos; - descrição&apos;)</Label>
            <Textarea
              placeholder={`Ex: \nSupino inclinado - 3x10\nRemada curvada - 4x8\nPrancha - 3x45s`}
              value={workoutForm.exercises}
              onChange={(e) =>
                setWorkoutForm((p) => ({ ...p, exercises: e.target.value }))
              }
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowWorkoutModal(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateWorkout} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Criando..." : "Criar treino"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showAvatarModal}
        onClose={() => {
          setShowAvatarModal(false);
          setAvatarUrl("");
        }}
        title="Atualizar foto de perfil"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL da imagem</Label>
            <Input
              type="url"
              placeholder="https://exemplo.com/foto.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-zinc-600">
              Cole a URL de uma imagem da internet ou deixe em branco para remover a foto.
            </p>
          </div>
          {avatarUrl && (
            <div className="flex justify-center">
              <Image
                src={avatarUrl}
                alt="Preview"
                width={128}
                height={128}
                className="h-32 w-32 rounded-full object-cover border-2 border-zinc-200"
                unoptimized
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAvatarModal(false);
                setAvatarUrl("");
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateAvatar}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function sortWorkouts(a: Workout, b: Workout) {
  if (a.dayOfWeek === b.dayOfWeek) return a.time.localeCompare(b.time);
  return a.dayOfWeek - b.dayOfWeek;
}
