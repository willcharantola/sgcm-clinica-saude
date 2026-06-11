# SGCM — Sistema de Gestão de Clínica Médica

API REST para gerenciamento de usuários, especialidades, agendamentos, atendimentos, procedimentos, prontuários e laudos de uma clínica médica. Desenvolvida com NestJS, TypeORM e SQLite como projeto acadêmico da disciplina de Desenvolvimento Web — UFMS.

---

## Tecnologias

| Tecnologia | Versão |
|---|---|
| Node.js | 20.x (LTS) |
| NestJS | 11.x |
| TypeORM | 0.3.x |
| SQLite (better-sqlite3) | — |
| TypeScript | 5.x |
| Passport / JWT | — |
| PDFKit | — |

---

## Pré-requisitos

- Node.js 20 LTS — recomendado usar [nvm](https://github.com/nvm-sh/nvm)
- npm 10+

Se usar nvm, rode na raiz do projeto:

```bash
nvm use
```

O arquivo `.nvmrc` já está configurado com a versão correta.

---

## Instalação

```bash
# clonar o repositório
git clone https://github.com/willcharantola/sgcm-clinica-saude.git
cd sgcm-clinica-saude

# instalar dependências
npm install
```

---

## Variáveis de ambiente

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

O arquivo `.env.example` contém:

```env
PORT=3000
DATABASE_PATH=./database.db

# Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

> `JWT_SECRET` é obrigatório. Gere um valor seguro com o comando indicado acima e preencha antes de iniciar a aplicação.

---

## Executando o projeto

```bash
# modo desenvolvimento (com hot reload)
npm run start:dev
```

A aplicação estará disponível em `http://localhost:3000`.

O banco de dados SQLite (`database.db`) é criado automaticamente na raiz do projeto na primeira execução.

---

## Seed (dados de exemplo)

Para popular o banco com dados de demonstração prontos para teste:

```bash
npm run seed
```

O script é idempotente — verifica se o banco já foi populado antes de inserir qualquer dado. Ao concluir, exibe as credenciais de acesso:

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@sgcm.com | Admin@123 |
| Médico | carlos.mendes@sgcm.com | Doctor@123 |
| Paciente | ana.souza@sgcm.com | Patient@123 |

---

## Documentação da API

Com o projeto rodando, acesse o Swagger em:

```
http://localhost:3000/api
```

A documentação inclui todos os endpoints com exemplos de requisição, resposta de sucesso e respostas de erro no formato RFC 7807. Endpoints protegidos exigem o header `Authorization: Bearer <token>` — use o endpoint `POST /auth/login` para obter o token e clique em **Authorize** no Swagger.

---

## Estrutura do projeto

```
src/
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts          # @Public() — dispensa autenticação
│   │   ├── roles.decorator.ts           # @Roles(...) — controle por perfil
│   │   └── skip-transform.decorator.ts  # @SkipTransform() — respostas binárias
│   ├── filters/
│   │   └── http-exception.filter.ts     # filtro global RFC 7807
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── interceptors/
│       └── transform.interceptor.ts     # envelope { data, meta }
├── modules/
│   ├── auth/                            # login, refresh token, logout
│   ├── users/
│   │   ├── entities/                    # User, Admin, Doctor, Patient (STI)
│   │   └── ...
│   ├── specialties/
│   │   ├── entities/                    # Specialty, DoctorSpecialty
│   │   └── ...
│   ├── schedules/
│   │   ├── entities/                    # Schedule, InPerson, Online, Home (STI)
│   │   └── ...
│   ├── appointments/
│   │   ├── entities/                    # Appointment, Consultation, Exam, FollowUp (STI)
│   │   └── ...
│   ├── procedures/
│   │   ├── entities/                    # Procedure, SimpleProcedure, SpecializedProcedure (STI)
│   │   └── ...
│   ├── medical-records/
│   │   ├── entities/                    # MedicalRecord
│   │   └── ...
│   ├── reports/
│   │   ├── entities/                    # Report
│   │   └── ...
│   └── admin/                           # relatórios gerenciais (somente ADMIN)
├── database/
│   └── seed.ts                          # script de dados de exemplo
├── app.module.ts
└── main.ts
```

---

## Autenticação

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/auth/login` | Obter access token + refresh token | Público |
| `POST` | `/auth/refresh` | Renovar access token via refresh token | Público |
| `POST` | `/auth/logout` | Invalidar refresh token | Autenticado |
| `GET` | `/auth/me` | Dados do usuário autenticado | Autenticado |

---

## Endpoints principais

### Usuários

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/users` | Criar usuário | ADMIN |
| `GET` | `/users` | Listar usuários com filtro por `type` | ADMIN |
| `GET` | `/users/:id` | Buscar usuário por ID | ADMIN |
| `PUT` | `/users/:id` | Atualizar usuário | ADMIN |
| `DELETE` | `/users/:id` | Inativar usuário | ADMIN |

### Médicos

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `GET` | `/doctors` | Listar médicos com especialidades | ADMIN |
| `GET` | `/doctors/:id` | Buscar médico por ID | ADMIN |
| `GET` | `/doctors/:id/specialties` | Listar especialidades do médico | ADMIN |
| `POST` | `/doctors/:id/specialties` | Associar especialidade ao médico | ADMIN |
| `DELETE` | `/doctors/:id/specialties/:specialtyId` | Desassociar especialidade | ADMIN |
| `GET` | `/doctors/:id/schedules` | Listar agendamentos do médico | ADMIN / próprio DOCTOR |
| `GET` | `/doctors/:id/appointments` | Listar atendimentos do médico | ADMIN / próprio DOCTOR |
| `GET` | `/doctors/:id/records` | Listar prontuários do médico | ADMIN / próprio DOCTOR |
| `GET` | `/doctors/:id/reports` | Listar laudos emitidos pelo médico | ADMIN / próprio DOCTOR |

### Pacientes

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `GET` | `/patients` | Listar pacientes | ADMIN |
| `GET` | `/patients/:id` | Buscar paciente por ID | ADMIN |
| `GET` | `/patients/:id/schedules` | Listar agendamentos do paciente | ADMIN / DOCTOR / próprio PATIENT |
| `GET` | `/patients/:id/appointments` | Listar atendimentos do paciente | ADMIN / DOCTOR / próprio PATIENT |
| `GET` | `/patients/:id/records` | Listar prontuários do paciente | ADMIN / DOCTOR / próprio PATIENT |
| `GET` | `/patients/:id/reports` | Listar laudos do paciente | ADMIN / DOCTOR / próprio PATIENT |

### Especialidades

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/specialties` | Criar especialidade | ADMIN |
| `GET` | `/specialties` | Listar especialidades | Autenticado |
| `GET` | `/specialties/:id` | Buscar especialidade por ID | Autenticado |
| `PUT` | `/specialties/:id` | Atualizar especialidade | ADMIN |
| `DELETE` | `/specialties/:id` | Excluir especialidade | ADMIN |
| `GET` | `/specialties/:id/doctors` | Listar médicos da especialidade | Autenticado |

### Agendamentos

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/schedules` | Criar agendamento (IN_PERSON, ONLINE ou HOME) | ADMIN |
| `GET` | `/schedules` | Listar agendamentos com filtros | ADMIN |
| `GET` | `/schedules/:id` | Buscar agendamento por ID | ADMIN |
| `PUT` | `/schedules/:id` | Atualizar dados do agendamento | ADMIN |
| `PATCH` | `/schedules/:id/status` | Atualizar status | ADMIN |
| `DELETE` | `/schedules/:id` | Excluir agendamento | ADMIN |

### Atendimentos

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/appointments` | Criar atendimento (CONSULTATION, EXAM ou FOLLOW_UP) | DOCTOR |
| `GET` | `/appointments` | Listar atendimentos | ADMIN |
| `GET` | `/appointments/:id` | Buscar atendimento por ID | ADMIN / DOCTOR / PATIENT |
| `PUT` | `/appointments/:id` | Atualizar atendimento | DOCTOR |
| `PATCH` | `/appointments/:id/finish` | Finalizar atendimento | DOCTOR |

### Procedimentos

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/appointments/:id/procedures` | Adicionar procedimento ao atendimento | DOCTOR |
| `GET` | `/appointments/:id/procedures` | Listar procedimentos do atendimento | ADMIN / DOCTOR / PATIENT |
| `GET` | `/procedures/:id` | Buscar procedimento por ID | ADMIN / DOCTOR / PATIENT |
| `PUT` | `/procedures/:id` | Atualizar procedimento | DOCTOR |
| `PATCH` | `/procedures/:id/authorize` | Autorizar ou negar procedimento especializado | ADMIN |
| `DELETE` | `/procedures/:id` | Remover procedimento | DOCTOR |

### Prontuários

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/appointments/:id/records` | Criar prontuário do atendimento | DOCTOR |
| `GET` | `/appointments/:id/records` | Buscar prontuário do atendimento | ADMIN / DOCTOR / PATIENT |
| `GET` | `/records/:id` | Buscar prontuário por ID | ADMIN / DOCTOR / PATIENT |
| `PUT` | `/records/:id` | Atualizar prontuário | DOCTOR |

### Laudos

| Método | Rota | Descrição | Perfil |
|---|---|---|---|
| `POST` | `/appointments/:id/reports` | Emitir laudo para o atendimento | DOCTOR |
| `GET` | `/appointments/:id/reports` | Listar laudos do atendimento | ADMIN / DOCTOR / PATIENT |
| `GET` | `/reports/validate/:code` | Validar laudo pelo código | Público |
| `GET` | `/reports/:id` | Buscar laudo por ID | ADMIN / DOCTOR / PATIENT |
| `GET` | `/reports/:id/pdf` | Download do laudo em PDF | ADMIN / DOCTOR / PATIENT |
| `PATCH` | `/reports/:id/revoke` | Revogar laudo | ADMIN |

### Relatórios Gerenciais (Admin)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/admin/reports/schedules` | Agendamentos por status e tipo com taxa de ocupação geral |
| `GET` | `/admin/reports/appointments` | Atendimentos por tipo |
| `GET` | `/admin/reports/procedures` | Procedimentos por tipo e status de autorização |
| `GET` | `/admin/reports/occupation` | Taxa de ocupação por médico |

Todos aceitam os query params opcionais `startDate` e `endDate` (formato ISO 8601).

---

## Parâmetros de listagem

Todos os endpoints de listagem suportam os seguintes query params:

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | number | 1 | Número da página |
| `limit` | number | 20 | Registros por página |
| `sort` | string | — | Ordenação no formato `campo:asc` ou `campo:desc` |
| `search` | string | — | Busca textual nos campos relevantes |

**Exemplos:**

```
GET /schedules?status=CONFIRMED&sort=scheduledAt:asc&page=1&limit=10
GET /doctors?search=Carlos&sort=name:asc
GET /appointments?type=EXAM&sort=startedAt:desc
```

---

## Formato de resposta

### Listagens

```json
{
  "data": [],
  "meta": {
    "totalItems": 20,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Erros — RFC 7807

```json
{
  "type": "https://sgcm.example.com/problems/not-found",
  "title": "Recurso não encontrado",
  "status": 404,
  "detail": "Médico com id 15 não foi encontrado.",
  "instance": "/doctors/15",
  "method": "GET",
  "timestamp": "2026-05-10T10:00:00.000Z"
}
```

---

## Regras de negócio principais

### Usuários e Agendamentos
- Senhas armazenadas com hash `bcrypt` — nunca em texto puro
- `password` e `refreshToken` nunca aparecem em nenhuma resposta
- E-mail único no sistema independentemente do perfil
- CRM único para médicos, CPF único para pacientes
- Agendamentos não podem ser criados com data no passado
- Um médico não pode ter dois agendamentos `CONFIRMED` no mesmo horário
- Transições de status permitidas: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`
- `COMPLETED` é definido automaticamente ao criar um atendimento vinculado ao agendamento
- Especialidade com médicos associados não pode ser removida
- Usuário com agendamentos `PENDING` ou `CONFIRMED` não pode ser inativado

### Atendimentos
- Só pode ser criado a partir de um agendamento `CONFIRMED` (status passa a `COMPLETED` atomicamente)
- Tipos: `CONSULTATION` (motivo obrigatório), `EXAM` (tipo do exame obrigatório), `FOLLOW_UP` (referência ao atendimento de origem obrigatória)
- `FOLLOW_UP` só pode referenciar atendimentos do mesmo paciente
- Atendimentos não podem ser removidos via API

### Procedimentos
- Só podem ser criados em atendimentos com status `IN_PROGRESS`
- Procedimentos `SPECIALIZED` com `requiresAuthorization: true` necessitam de aprovação do ADMIN
- Após atendimento `FINISHED`, procedimentos não podem ser removidos
- ADMIN pode autorizar (`AUTHORIZED`) ou negar (`DENIED`) — a negação é irreversível

### Prontuários
- Só podem ser criados para atendimentos `FINISHED`
- Um atendimento possui no máximo um prontuário
- Prontuários não podem ser removidos via API

### Laudos
- Só podem ser emitidos para atendimentos do tipo `EXAM` com status `FINISHED` e resultado preenchido
- Cada laudo possui um `validationCode` único (UUID) para validação pública
- Laudos revogados (`REVOKED`) não podem ser re-ativados
- O PDF do laudo é gerado dinamicamente no momento do download

---

## Desenvolvedor

| Nome | GitHub |
|---|---|
| Willian Charantola da Costa | [@willcharantola](https://github.com/willcharantola) |

---

## Etapas do projeto

- [x] **Etapa 1** — Modelagem, CRUD, regras de negócio, Swagger
- [x] **Etapa 2** — Autenticação JWT, refresh token, controle de acesso por perfil
- [x] **Etapa 3** — Atendimentos, procedimentos, prontuários, laudos e relatórios gerenciais
