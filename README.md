## Treino — app de academia completo

Planeje a semana, marque exercícios concluídos, veja histórico e mantenha uma lista de compras. Front-end em Next.js (App Router + Tailwind + shadcn/ui) e back-end em Express + Prisma + PostgreSQL.

### Stack
- Front: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn-style UI, lucide-react.
- Back: Express, TypeScript, Prisma ORM, PostgreSQL (Neon), JWT (access + refresh), bcrypt, Zod, Swagger.
- Deploy: Vercel (front) e Railway (API) + Neon (banco).

### Pré-requisitos
- Node.js 18+ e npm.
- Banco PostgreSQL (local ou Neon).

### Variáveis de ambiente
Use `environment.example` como base na raiz e crie `.env` (front) e `backend/.env` (API). Principais chaves:
```
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_APP_NAME=Treino

# Backend
PORT=3333
DATABASE_URL=postgresql://user:password@host:5432/treino
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
FRONTEND_URL=http://localhost:3000
```

### Backend (Express + Prisma)
```bash
cd backend
npm install
npx prisma migrate dev        # cria o schema
npx prisma db seed            # dados demo (opcional)
npm run dev                   # porta 3333
```
- Rotas base: `/api/v1`
- Swagger: `http://localhost:3333/docs`
- Rate limit, Helmet, CORS (usa `FRONTEND_URL`).

### Frontend (Next.js)
```bash
npm install
npm run dev                   # porta 3000
```
Autentique-se (cadastro/login). Tokens ficam no `localStorage` (access + refresh). A UI consome a API REST e oferece:
- Agenda semanal de treinos com exercícios e conclusão automática.
- Checklist de exercícios com progresso visual.
- Histórico de treinos concluídos.
- Lista de compras por usuário (CRUD + checkbox).
- Preferências (objetivos e tipos de treino) persistidas no banco.

### Deploy
- **Vercel (front)**: crie novo projeto apontando para este repo. Defina `NEXT_PUBLIC_API_URL` apontando para a API publicada e `NEXT_PUBLIC_APP_NAME`.
- **Railway (API)**: crie serviço Node, defina as variáveis do backend e o `DATABASE_URL` do Neon. Configure start command `npm run start` após `npm run build`.
- **Neon (PostgreSQL)**: crie database, copie a connection string para `DATABASE_URL` e execute `npx prisma migrate deploy` seguido de `npx prisma db seed` no serviço de API.

### Scripts úteis
- Front: `npm run dev`, `npm run build`, `npm run lint`
- Back: `npm run dev`, `npm run build`, `npm run start`, `npm run prisma:migrate`, `npm run prisma:seed`

### Estrutura
- `app/` — páginas Next App Router e UI.
- `components/ui/` — componentes estilizados no padrão shadcn.
- `lib/` — helpers, tipos e cliente HTTP.
- `backend/` — API Express, rotas, serviços e schemas Zod.
- `backend/prisma/` — schema, migrations e seeds.

### Teste rápido
1. Suba o backend (`npm run dev` em `backend/`) com `.env` preenchido.
2. Suba o frontend (`npm run dev` na raiz).
3. Acesse `http://localhost:3000`, crie conta ou use o seed `demo@treino.app` / `changeme123`.

Pronto! Você já tem um MVP completo pronto para evoluir.
