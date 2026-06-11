# Contexto do Projeto SGCM — Para o Claude Code

## O que é este projeto

Projeto acadêmico da disciplina de Desenvolvimento Web da UFMS. É uma API REST chamada
SGCM (Sistema de Gestão de Clínica Médica) desenvolvida com:

- NestJS 11 + TypeScript
- TypeORM com SQLite (better-sqlite3)
- Node.js 20 LTS

O projeto é dividido em 3 etapas. As etapas 1 e 2 já foram concluídas e estão no repositório.
Precisamos implementar a **Etapa 3**.

---

## O que já existe no projeto (Etapas 1 e 2)

### Etapa 1 — Módulos de domínio

**UsersModule** — CRUD de usuários com Single Table Inheritance:
- Perfis: `UserType.ADMIN`, `UserType.DOCTOR`, `UserType.PATIENT`
- Senhas com bcrypt
- Inativação lógica (`isActive`)
- Campo `refreshToken` na entidade base
- Controllers: `UsersController`, `DoctorsController`, `PatientsController`

**SpecialtiesModule** — CRUD de especialidades + associação many-to-many com médicos via
entidade de junção `DoctorSpecialty`

**SchedulesModule** — Agendamentos com Single Table Inheritance:
- Subtipos: `InPersonSchedule` (room, unit), `OnlineSchedule` (accessLink, platform),
  `HomeSchedule` (fullAddress, accessNotes)
- Status: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`
- `CONFIRMED → COMPLETED` reservado para a Etapa 3 (quando um atendimento é criado)
- Campos de rastreabilidade: `createdById`, `cancelledById`, `cancelledAt`, `cancellationReason`

**Infraestrutura da Etapa 1:**
- `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`
- `ClassSerializerInterceptor` global com `@Exclude()` nos DTOs de resposta
- Filtro de exceção global no formato RFC 7807
- Swagger configurado em `/api` com `addBearerAuth()` já incluído
- Dependência circular entre `UsersModule` e `SchedulesModule` resolvida com `forwardRef()`
- Módulo `common` com o filtro de exceção

### Etapa 2 — Autenticação e infraestrutura transversal

**AuthModule** (`src/modules/auth/`):
- `POST /auth/login` — público, retorna `accessToken` e `refreshToken`
- `POST /auth/refresh` — público, refresh token rotation (uso único)
- `GET /auth/me` — requer JWT
- `POST /auth/logout` — requer JWT, invalida o refreshToken no banco
- `JwtStrategy` em `src/modules/auth/stretegies/jwt.strategy.ts`
  (**atenção: a pasta se chama `stretegies` com erro de digitação — manter assim**)
- DTOs: `LoginDto`, `RefreshTokenDto`

**Módulo Common expandido** (`src/common/`):
```
src/common/
├── decorators/
│   ├── current-user.decorator.ts    — @CurrentUser()
│   ├── public.decorator.ts          — @Public()
│   └── roles.decorator.ts           — @Roles()
├── filters/
│   └── http-exception.filter.ts     — RFC 7807
├── guards/
│   ├── jwt-auth.guard.ts            — JwtAuthGuard (opt-out com @Public())
│   └── roles.guard.ts               — RolesGuard
├── interceptors/
│   └── transform.interceptor.ts     — envelope { data, meta }
├── middlewares/
│   └── logging.middleware.ts
└── types/
    └── user-payload.type.ts         — class UserPayload { sub, email, type }
```

**Decisões técnicas importantes já tomadas:**
- `UserPayload` é uma **class** (não interface) por causa do `isolatedModules: true`
- Guards registrados globalmente em `main.ts` com padrão opt-out (`@Public()` para exceções)
- Ordem dos guards: `JwtAuthGuard` → `RolesGuard`
- Ordem dos interceptors: `ClassSerializerInterceptor` → `TransformInterceptor`
- Refresh token armazenado em texto puro no banco
- JWT secret carregado via `configService.getOrThrow()`
- `expiresIn` com cast `as StringValue` (import de `ms`)

---

## O que precisa ser implementado (Etapa 3)

### Ajustes de infraestrutura (fazer primeiro)

O `TransformInterceptor` atual envolve toda resposta no envelope `{ data, meta }`, mas o
endpoint de download de PDF retorna um buffer binário — não JSON. Precisamos:

1. Criar o decorator `@SkipTransform()` em `src/common/decorators/skip-transform.decorator.ts`
2. Atualizar o `TransformInterceptor` para:
   - Verificar se a resposta é um `Buffer` ou `StreamableFile` e deixar passar sem transformar
   - Verificar se o handler tem o metadata `SKIP_TRANSFORM_KEY` e deixar passar

### Novos módulos a criar

#### 1. AppointmentsModule (`src/modules/appointments/`)

**Entidades com Single Table Inheritance:**
- `Appointment` (base): `id`, `startedAt`, `endedAt`, `notes`, `type` (discriminador),
  `status` (IN_PROGRESS | FINISHED), `scheduleId`, `doctorId`, `patientId`,
  `createdAt`, `updatedAt`
- `Consultation extends Appointment`: `reason` (obrigatório), `diagnosticHypothesis` (opcional)
- `Exam extends Appointment`: `examType` (obrigatório), `result` (opcional, tipo `text`)
- `FollowUp extends Appointment`: `originAppointmentId` (obrigatório), `clinicalEvolution` (opcional)

**Regras de negócio críticas:**
- Atendimento só pode ser criado a partir de um `Schedule` com `status = CONFIRMED`
- Ao criar o atendimento, o `Schedule` deve ter seu status atualizado para `COMPLETED`
  **atomicamente** (transação explícita com `DataSource.transaction()`)
- Um `Schedule` só pode originar **um** `Appointment` — segundo tentativa retorna 409
- O `type` não pode ser alterado após a criação
- `FollowUp.originAppointmentId` deve referenciar um `Appointment` do **mesmo paciente**,
  não pode referenciar a si mesmo
- Transição `IN_PROGRESS → FINISHED` é **irreversível**
- Atendimentos **não podem ser excluídos** (retornar 405 Method Not Allowed)

**Endpoints:**
```
POST   /appointments                         — Admin, Doctor
GET    /appointments                         — Admin (com filtros: doctorId, patientId, type, status, startDate, endDate)
GET    /appointments/:id                     — Admin, Doctor (próprios), Patient (próprios)
PUT    /appointments/:id                     — Admin, Doctor (próprios) — só IN_PROGRESS
PATCH  /appointments/:id/finish              — Admin, Doctor (próprios)
GET    /doctors/:id/appointments             — Admin, Doctor (próprios)
GET    /patients/:id/appointments            — Admin, Patient (próprios)
```

#### 2. ProceduresModule (`src/modules/procedures/`)

**Entidades com Single Table Inheritance:**
- `Procedure` (base): `id`, `name`, `description`, `type` (discriminador),
  `appointmentId`, `createdAt`, `updatedAt`
- `SimpleProcedure extends Procedure`: `estimatedDuration` (inteiro, minutos)
- `SpecializedProcedure extends Procedure`: `requiredEquipment`, `complexityLevel`
  (LOW | MEDIUM | HIGH), `requiresAuthorization` (boolean), `authorizationStatus`
  (PENDING | AUTHORIZED | DENIED, default PENDING), `authorizedAt`, `authorizedById`,
  `denialReason`

**Regras de negócio críticas:**
- Procedimentos só podem ser adicionados a atendimentos `IN_PROGRESS`
- `SpecializedProcedure` com `requiresAuthorization = true` inicia com
  `authorizationStatus = PENDING` — nunca recebido do cliente
- `authorizedById` preenchido automaticamente com o Admin autenticado — nunca recebido do cliente
- Transição `DENIED → PENDING` é **bloqueada**
- Procedimentos em atendimentos `FINISHED` não podem ser excluídos (retornar 409)

**Endpoints:**
```
POST   /appointments/:id/procedures          — Admin, Doctor (atendimentos próprios)
GET    /appointments/:id/procedures          — Admin, Doctor (próprios), Patient (próprios)
GET    /procedures/:id                       — Admin, Doctor (próprios), Patient (próprios)
PUT    /procedures/:id                       — Admin, Doctor (próprios)
PATCH  /procedures/:id/authorization         — Admin apenas
DELETE /procedures/:id                       — Admin, Doctor (próprios)
```

O body do `PATCH /procedures/:id/authorization` deve ter:
```json
{ "action": "AUTHORIZE" | "DENY", "denialReason": "string (opcional)" }
```

#### 3. MedicalRecordsModule (`src/modules/medical-records/`)

**Entidade:**
- `MedicalRecord`: `id`, `diagnosis` (text, obrigatório), `prescription` (text, opcional),
  `notes` (text, opcional), `appointmentId` (OneToOne), `lastUpdatedById` (nullable),
  `createdAt`, `updatedAt`

**Regras de negócio críticas:**
- Só pode ser criado para `Appointment` com `status = FINISHED`
- Cada atendimento tem no máximo **um** prontuário — segundo retorna 409
- **Não pode ser excluído** — retornar 405 Method Not Allowed
- `lastUpdatedById` preenchido automaticamente com o usuário autenticado nas atualizações
- Controle por recurso:
  - `Admin`: acesso irrestrito
  - `Doctor`: só prontuários de atendimentos que realizou
  - `Patient`: só seus próprios prontuários

**Endpoints:**
```
POST   /appointments/:id/records             — Admin, Doctor (atendimentos próprios)
GET    /appointments/:id/records             — Admin, Doctor (próprios), Patient (próprios)
PUT    /records/:id                          — Admin, Doctor (próprios)
DELETE /records/:id                          — implementar mas retornar 405 sempre
GET    /patients/:id/records                 — Admin, Doctor (pacientes que atendeu), Patient (próprios)
GET    /doctors/:id/records                  — Admin, Doctor (próprios)
```

#### 4. ReportsModule (`src/modules/reports/`)

**Entidade:**
- `Report`: `id`, `validationCode` (UUID único, gerado automaticamente), `content` (text),
  `status` (ACTIVE | REVOKED, default ACTIVE), `appointmentId`, `issuedById`,
  `revokedAt` (nullable), `revokedReason` (text, nullable), `revokedById` (nullable),
  `issuedAt` (createdAt), `updatedAt`

**Regras de negócio críticas:**
- Só pode ser emitido para `Exam` com `status = FINISHED` **e** `result` preenchido
- `validationCode` é um UUID v4 gerado pelo sistema — **nunca** recebido do cliente
- Apenas **um** laudo `ACTIVE` por exame — segundo retorna 409
- Emissão deve ser **atômica** (transação explícita)
- Transição `ACTIVE → REVOKED` é **irreversível**
- Após revogação, novo laudo pode ser emitido para o mesmo exame
- `revokedAt` e `revokedById` preenchidos automaticamente na revogação

**PdfService** (`src/modules/reports/pdf.service.ts`):
- Instalar `pdfkit` e `@types/pdfkit`
- Recebe um DTO com os dados necessários (não o objeto Report diretamente)
- Retorna `Promise<Buffer>`
- Conteúdo obrigatório do PDF: nome do paciente, nome do médico + CRM, tipo de exame,
  resultado, data do exame, data de emissão, validationCode em destaque

**Endpoints:**
```
POST   /appointments/:id/report              — Admin, Doctor (próprios) → 201
GET    /reports/validate/:code               — PÚBLICO (@Public(), sem @ApiBearerAuth)
GET    /reports/:id/pdf                      — Admin, Doctor (próprios), Patient (próprios)
PATCH  /reports/:id/revoke                   — Admin, Doctor (próprios)
GET    /patients/:id/reports                 — Admin, Doctor (pacientes que atendeu), Patient (próprios)
GET    /doctors/:id/reports                  — Admin, Doctor (próprios)
```

**Atenção no controller:** declarar `GET /reports/validate/:code` **antes** de
`GET /reports/:id/pdf` para evitar conflito de rota (NestJS processa na ordem de declaração).

O endpoint `GET /reports/:id/pdf` deve:
- Usar `@SkipTransform()` para não envolver o buffer no envelope JSON
- Setar headers: `Content-Type: application/pdf` e
  `Content-Disposition: attachment; filename="laudo-{validationCode}.pdf"`
- Usar `@Res()` do Express para enviar o buffer diretamente

#### 5. AdminModule (`src/modules/admin/`)

Apenas leitura — consolida métricas para o Admin. Usar `QueryBuilder` com `GROUP BY`
(não agregar em memória).

**Endpoints:**
```
GET /admin/reports/schedules                 — Admin apenas
GET /admin/reports/appointments              — Admin apenas (+ filtro doctorId)
GET /admin/reports/procedures                — Admin apenas
GET /admin/reports/doctors/:id/occupation   — Admin apenas
```

Todos suportam `?startDate=&endDate=` (ISO 8601). `startDate` posterior a `endDate`
retorna 400. Não suportam paginação.

**Relatório de agendamentos** — retornar:
- Total por status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- Total por type (IN_PERSON, ONLINE, HOME)
- Total geral no período

**Relatório de atendimentos** — retornar:
- Total por type (CONSULTATION, EXAM, FOLLOW_UP)
- Total por status (IN_PROGRESS, FINISHED)

**Relatório de procedimentos** — retornar:
- Total por type (SIMPLE, SPECIALIZED)
- Total de especializados por authorizationStatus (PENDING, AUTHORIZED, DENIED)
- Total de especializados por complexityLevel (LOW, MEDIUM, HIGH)

**Relatório de ocupação** — retornar:
- Total de agendamentos no período
- Total por status
- Taxa de ocupação: `(CONFIRMED + COMPLETED) / total * 100`
  (documentar a fórmula no Swagger)

---

## Ordem de implementação

Respeitar esta sequência para evitar dependências não resolvidas:

1. Ajustes de infraestrutura (TransformInterceptor + @SkipTransform)
2. AppointmentsModule
3. ProceduresModule e MedicalRecordsModule (podem ser paralelos, ambos dependem de Appointments)
4. ReportsModule (depende de Appointments)
5. AdminModule (depende de todos os anteriores)
6. Swagger final (fazer por último)

---

## Convenções do projeto a manter

- Todos os identificadores em **inglês**
- Pasta de strategies com erro de digitação `stretegies` — **não corrigir**
- Erros sempre no formato RFC 7807 via o `HttpExceptionFilter` global já existente
- Respostas de sucesso sempre no envelope `{ data, meta }` via `TransformInterceptor`
  (exceto PDF e respostas binárias)
- Paginação com parâmetros `page`, `limit`, `sort` em todos os endpoints de listagem
- Guards globais em `main.ts` — não registrar por módulo
- `@Public()` para endpoints sem autenticação
- `@Roles()` para controle por perfil
- Controle por recurso **sempre no service**, nunca no controller
- Métodos auxiliares privados com nomes descritivos nos services:
  `ensureAppointmentIsFinished()`, `ensureExamHasResult()`, `ensureNoActiveReport()`, etc.

---

## Documentação de referência

Antes de implementar qualquer coisa, leia os dois arquivos de contexto:

1. **Este arquivo** (`docs/contexto-claude-code.md`) — resume o que já existe e o que
   precisa ser feito, com as decisões técnicas já tomadas.
2. **Especificação oficial** (`docs/etapa3.pdf`) — documento completo do professor com
   todos os requisitos funcionais, não funcionais, regras de negócio, endpoints obrigatórios,
   critérios de avaliação e reflexões que devem constar no relatório.

Em caso de conflito entre os dois arquivos, o `docs/etapa3.pdf` tem precedência —
ele é a fonte de verdade oficial do que será avaliado.

---

## Como usar este contexto

Sugerimos trabalhar módulo por módulo. Exemplo de como iniciar cada sessão:

```
Leia os arquivos docs/contexto-claude-code.md e docs/etapa3.pdf para entender
o projeto e os requisitos. Depois leia os arquivos existentes em src/ e implemente
a branch feature/infra-adjustments: o decorator @SkipTransform e os ajustes no
TransformInterceptor para não envolver buffers binários.
Leia os arquivos existentes antes de escrever qualquer código.
```

Após cada módulo, verifique se o projeto compila (`npm run build`) antes de avançar.