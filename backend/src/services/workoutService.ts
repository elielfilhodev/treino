import { prisma } from "../lib/prisma";
import { createError } from "../lib/errors";

function ensureWorkoutOwner(workoutUserId: string, userId: string) {
  if (workoutUserId !== userId) {
    throw createError.forbidden("Você não pode acessar este treino");
  }
}

async function syncWorkoutCompletion(workoutId: string) {
  const [workout, exercises] = await Promise.all([
    prisma.workout.findUnique({ where: { id: workoutId } }),
    prisma.exercise.findMany({ where: { workoutId } }),
  ]);

  if (!workout) return;

  const allCompleted =
    exercises.length > 0 && exercises.every((exercise) => exercise.completed);

  if (allCompleted && !workout.completed) {
    await prisma.$transaction([
      prisma.workout.update({
        where: { id: workoutId },
        data: { completed: true },
      }),
      prisma.workoutHistory.create({ data: { workoutId } }),
    ]);
  } else if (!allCompleted && workout.completed) {
    await prisma.workout.update({
      where: { id: workoutId },
      data: { completed: false },
    });
  }
}

export async function listWorkouts(userId: string, day?: number) {
  return prisma.workout.findMany({
    where: { userId, ...(day !== undefined ? { dayOfWeek: day } : {}) },
    include: { exercises: { orderBy: { order: "asc" } } },
    orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
  });
}

export async function getWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { exercises: { orderBy: { order: "asc" } }, history: true },
  });
  if (!workout) throw createError.notFound("Treino não encontrado");
  ensureWorkoutOwner(workout.userId, userId);
  return workout;
}

export async function createWorkout(
  userId: string,
  data: {
    name: string;
    description?: string;
    dayOfWeek: number;
    time: string;
    exercises?: {
      name: string;
      description?: string;
      order: number;
      completed?: boolean;
    }[];
  },
) {
  return prisma.workout.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      dayOfWeek: data.dayOfWeek,
      time: data.time,
      exercises: data.exercises
        ? {
            create: data.exercises.map((exercise, index) => ({
              ...exercise,
              order: exercise.order ?? index,
            })),
          }
        : undefined,
    },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  data: Partial<{
    name: string;
    description?: string;
    dayOfWeek: number;
    time: string;
  }>,
) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout) throw createError.notFound("Treino não encontrado");
  ensureWorkoutOwner(workout.userId, userId);

  const updated = await prisma.workout.update({
    where: { id: workoutId },
    data,
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  await syncWorkoutCompletion(workoutId);
  return updated;
}

export async function deleteWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout) throw createError.notFound("Treino não encontrado");
  ensureWorkoutOwner(workout.userId, userId);

  await prisma.workout.delete({ where: { id: workoutId } });
}

export async function addExercise(
  userId: string,
  workoutId: string,
  exercise: { name: string; description?: string; order: number },
) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout) throw createError.notFound("Treino não encontrado");
  ensureWorkoutOwner(workout.userId, userId);

  const created = await prisma.exercise.create({
    data: { ...exercise, workoutId },
  });
  await syncWorkoutCompletion(workoutId);
  return created;
}

export async function updateExercise(
  userId: string,
  workoutId: string,
  exerciseId: string,
  input: { name?: string; description?: string; order?: number },
) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { workout: true },
  });
  if (!exercise) throw createError.notFound("Exercício não encontrado");
  ensureWorkoutOwner(exercise.workout.userId, userId);
  if (exercise.workoutId !== workoutId)
    throw createError.forbidden("Exercício não pertence ao treino");

  const updated = await prisma.exercise.update({
    where: { id: exerciseId },
    data: input,
  });
  await syncWorkoutCompletion(workoutId);
  return updated;
}

export async function toggleExercise(
  userId: string,
  workoutId: string,
  exerciseId: string,
  completed?: boolean,
) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { workout: true },
  });
  if (!exercise) throw createError.notFound("Exercício não encontrado");
  ensureWorkoutOwner(exercise.workout.userId, userId);
  if (exercise.workoutId !== workoutId)
    throw createError.forbidden("Exercício não pertence ao treino");

  const updated = await prisma.exercise.update({
    where: { id: exerciseId },
    data: { completed: completed ?? !exercise.completed },
  });

  await syncWorkoutCompletion(workoutId);
  return updated;
}

export async function completeWorkout(userId: string, workoutId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
  });
  if (!workout) throw createError.notFound("Treino não encontrado");
  ensureWorkoutOwner(workout.userId, userId);

  if (!workout.completed) {
    await prisma.$transaction([
      prisma.workout.update({
        where: { id: workoutId },
        data: { completed: true },
      }),
      prisma.workoutHistory.create({ data: { workoutId } }),
    ]);
  }

  return prisma.workout.findUnique({
    where: { id: workoutId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
}

export async function listHistory(userId: string) {
  return prisma.workoutHistory.findMany({
    where: { workout: { userId } },
    include: { workout: true },
    orderBy: { completedAt: "desc" },
    take: 20,
  });
}

