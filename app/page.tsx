"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingCart, CheckSquare, Clock3, LogOut } from "lucide-react";
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
      setError((err as Error).message);
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

  function progressStats() {
    if (workouts.length === 0) return 0;
    const completed = workouts.filter((w) => w.completed).length;
    return Math.round((completed / workouts.length) * 100);
  }

  const selectedWorkout = workouts.find((w) => w.id === selectedWorkoutId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-tight text-zinc-600">
            Treino
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">
            Agenda, checklist e compras em um só lugar
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Planeje a semana, marque exercícios concluídos e mantenha tudo sincronizado.
          </p>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-zinc-600">Bem-vindo</p>
              <p className="text-sm font-medium text-zinc-900">{user.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : null}
      </header>

      {feedback ? (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {!user ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {authMode === "login" ? "Entrar" : "Criar conta"}
              </CardTitle>
              <CardDescription>
                Sessão segura com tokens JWT (access + refresh) e bcrypt para senhas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
          <Card className="bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
              <CardDescription className="text-zinc-200">
                API Express + Prisma + PostgreSQL (Neon) com JWT e refresh token. UI em
                Next.js + shadcn/ui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-100">
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
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Progresso semanal</CardTitle>
                <CardDescription>Treinos concluídos vs. planejados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
            <Card>
              <CardHeader>
                <CardTitle>Histórico recente</CardTitle>
                <CardDescription>Últimos treinos finalizados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lista de compras</CardTitle>
                  <CardDescription>Suplementos e mercado</CardDescription>
                </div>
                <Button size="sm" variant="subtle" onClick={() => setActiveTab("compras")}>
                  Ver lista
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
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
                  <Button size="sm" onClick={handleShoppingCreate}>
                    <Plus className="h-4 w-4" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Área principal</CardTitle>
                <CardDescription>Agenda, checklist e preferências</CardDescription>
              </div>
              <Button onClick={() => setShowWorkoutModal(true)} className="flex gap-2">
                <Plus className="h-4 w-4" />
                Novo treino
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="agenda">Agenda semanal</TabsTrigger>
                  <TabsTrigger value="treino">Checklist</TabsTrigger>
                  <TabsTrigger value="compras">Compras</TabsTrigger>
                  <TabsTrigger value="preferencias">Preferências</TabsTrigger>
                </TabsList>

                <TabsContent value="agenda" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {workouts.length === 0 ? (
                      <p className="text-sm text-zinc-600">
                        Nenhum treino cadastrado. Crie um novo para começar.
                      </p>
                    ) : (
                      [...workouts].sort(sortWorkouts).map((workout) => (
                        <div
                          key={workout.id}
                          className="rounded-xl border border-zinc-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
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
                            <Badge variant={workout.completed ? "success" : "outline"}>
                              {workout.completed ? "Concluído" : "Pendente"}
                            </Badge>
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

                <TabsContent value="treino" className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Escolha o treino</Label>
                    <select
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
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
                      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
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
                              className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3"
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

                <TabsContent value="compras" className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {shopping.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
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
                </TabsContent>

                <TabsContent value="preferencias" className="space-y-4">
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
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
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
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
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
            <Label>Exercícios (um por linha, opcional ' - descrição')</Label>
            <Textarea
              placeholder={`Ex: \nSupino inclinado - 3x10\nRemada curvada - 4x8\nPrancha - 3x45s`}
              value={workoutForm.exercises}
              onChange={(e) =>
                setWorkoutForm((p) => ({ ...p, exercises: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowWorkoutModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkout} disabled={loading}>
              Salvar treino
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
