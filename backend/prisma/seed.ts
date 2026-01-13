import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@treino.app" },
    update: {},
    create: {
      name: "Demo Athlete",
      email: "demo@treino.app",
      passwordHash,
      preferences: {
        create: {
          goals: ["hipertrofia", "energia"],
          trainingTypes: ["força", "cardio intervalado"],
        },
      },
    },
    include: { preferences: true },
  });

  const mondayWorkout = await prisma.workout.create({
    data: {
      userId: user.id,
      dayOfWeek: 1,
      time: "07:30",
      name: "Puxar + Core",
      description: "Treino rápido de dorsais e abdômen",
      exercises: {
        create: [
          { name: "Barra fixa assistida", description: "3x8", order: 1 },
          { name: "Remada curvada", description: "3x10", order: 2 },
          { name: "Prancha", description: "3x45s", order: 3 },
        ],
      },
    },
    include: { exercises: true },
  });

  const wednesdayWorkout = await prisma.workout.create({
    data: {
      userId: user.id,
      dayOfWeek: 3,
      time: "18:45",
      name: "Inferiores",
      description: "Agachamento e posteriores",
      exercises: {
        create: [
          { name: "Agachamento livre", description: "4x8", order: 1 },
          { name: "Avanço", description: "3x10", order: 2 },
          { name: "Mesa flexora", description: "3x12", order: 3 },
        ],
      },
    },
    include: { exercises: true },
  });

  await prisma.workoutHistory.create({
    data: { workoutId: mondayWorkout.id, completedAt: new Date() },
  });

  await prisma.shoppingItem.createMany({
    data: [
      {
        userId: user.id,
        name: "Creatina 300g",
        quantity: "1",
        purchased: false,
      },
      {
        userId: user.id,
        name: "Frango congelado",
        quantity: "2kg",
        purchased: true,
      },
    ],
  });

  console.log("Seed concluída com usuário demo e treinos base.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

