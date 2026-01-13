import { Preferences, ShoppingItem, Tokens, User, Workout, WorkoutHistory } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const storageKey = "treino.tokens";

export function loadStoredTokens(): Tokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as Tokens) : null;
}

export function persistTokens(tokens: Tokens | null) {
  if (typeof window === "undefined") return;
  if (!tokens) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(tokens));
}

type TokenManager = {
  tokens: Tokens | null;
  setTokens: (tokens: Tokens | null) => void;
};

async function refreshTokens(refreshToken: string) {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) throw new Error("Não foi possível renovar a sessão");
  return (await response.json()) as {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export function createApiClient({ tokens, setTokens }: TokenManager) {
  async function request<T>(
    path: string,
    init?: RequestInit & { skipAuth?: boolean },
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(typeof init?.headers === "object" && !Array.isArray(init.headers)
        ? (init.headers as Record<string, string>)
        : {}),
    };

    if (!init?.skipAuth && tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    let response = await fetch(`${API_BASE}/api/v1${path}`, { ...init, headers });

    if (response.status === 401 && tokens?.refreshToken && !init?.skipAuth) {
      try {
        const refreshed = await refreshTokens(tokens.refreshToken);
        const nextTokens: Tokens = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
        };
        setTokens(nextTokens);
        persistTokens(nextTokens);

        response = await fetch(`${API_BASE}/api/v1${path}`, {
          ...init,
          headers: {
            ...headers,
            Authorization: `Bearer ${nextTokens.accessToken}`,
          },
        });
      } catch (error) {
        setTokens(null);
        persistTokens(null);
        throw error;
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? "Erro ao comunicar com a API");
    }

    if (response.status === 204) {
      // respostas sem corpo (DELETE/LOGOUT)
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    auth: {
      register: (body: { name: string; email: string; password: string }) =>
        request<{ user: User } & Tokens>("/auth/register", {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
        }),
      login: (body: { email: string; password: string }) =>
        request<{ user: User } & Tokens>("/auth/login", {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
        }),
      me: () => request<{ user: User }>("/auth/me"),
      logout: (refreshToken: string) =>
        request<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        }),
    },
    workouts: {
      list: () => request<{ workouts: Workout[] }>("/workouts"),
      history: () => request<{ history: WorkoutHistory[] }>("/workouts/history"),
      create: (payload: {
        name: string;
        description?: string;
        dayOfWeek: number;
        time: string;
        exercises?: Array<{ name: string; description?: string; order: number }>;
      }) =>
        request<{ workout: Workout }>("/workouts", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      update: (id: string, payload: Partial<Workout>) =>
        request<{ workout: Workout }>(`/workouts/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
      complete: (id: string) =>
        request<{ workout: Workout }>(`/workouts/${id}/complete`, { method: "PATCH" }),
      addExercise: (
        id: string,
        exercise: { name: string; description?: string; order: number },
      ) =>
        request<{ exercise: Workout["exercises"][0] }>(`/workouts/${id}/exercises`, {
          method: "POST",
          body: JSON.stringify(exercise),
        }),
      toggleExercise: (workoutId: string, exerciseId: string, completed?: boolean) =>
        request<{ exercise: Workout["exercises"][0] }>(
          `/workouts/${workoutId}/exercises/${exerciseId}/toggle`,
          { method: "PATCH", body: JSON.stringify({ completed }) },
        ),
      remove: (id: string) =>
        request<void>(`/workouts/${id}`, { method: "DELETE" }),
    },
    shopping: {
      list: () => request<{ items: ShoppingItem[] }>("/shopping-items"),
      create: (payload: { name: string; quantity?: string }) =>
        request<{ item: ShoppingItem }>("/shopping-items", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      toggle: (id: string, purchased?: boolean) =>
        request<{ item: ShoppingItem }>(`/shopping-items/${id}/toggle`, {
          method: "PATCH",
          body: JSON.stringify({ purchased }),
        }),
      remove: (id: string) =>
        request<void>(`/shopping-items/${id}`, { method: "DELETE" }),
    },
    preferences: {
      get: () => request<{ preferences: Preferences }>("/preferences"),
      update: (payload: Preferences) =>
        request<{ preferences: Preferences }>("/preferences", {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
    },
  };
}

