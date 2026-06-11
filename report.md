# Relatório Final — SGCM: Sistema de Gestão de Clínica Médica

**Disciplina:** Desenvolvimento Web  
**Instituição:** Universidade Federal de Mato Grosso do Sul (UFMS)  
**Integrantes:** Willian Charantola da Costa — RGA: 2019.0743.027-0

---

## 1. Integrantes e Contribuições

O projeto foi desenvolvido individualmente ao longo de três etapas, cada uma construindo
sobre a anterior.

| Etapa | Período | Principais entregas |
|-------|---------|-------------------|
| Etapa 1 | 27/04/2026 a 11/05/2026 | Modelagem das entidades, CRUD de usuários, especialidades e agendamentos, infraestrutura base (ValidationPipe, ClassSerializerInterceptor, Exception Filter, Swagger) |
| Etapa 2 | 08/06/2026 a 10/06/2026 | Autenticação JWT, refresh token rotation, guards de autorização, TransformInterceptor, LoggingMiddleware, controle de acesso por perfil |
| Etapa 3 | 11/06/2026 | Atendimentos, procedimentos, prontuários, laudos com geração de PDF, endpoint público de validação, relatórios administrativos, documentação Swagger final |

---

## 2. Diagrama de Classes Final

O diagrama completo do sistema encontra-se no arquivo `diagram.png` na raiz do repositório,
cobrindo todas as entidades implementadas nas três etapas.

### Entidades por etapa

**Etapa 1:**
- `User` (base) → `Admin`, `Doctor`, `Patient` (STI)
- `Specialty`
- `DoctorSpecialty` (junção many-to-many)
- `Schedule` (base) → `InPersonSchedule`, `OnlineSchedule`, `HomeSchedule` (STI)

**Etapa 2:**
- Sem novas entidades — infraestrutura transversal

**Etapa 3:**
- `Appointment` (base) → `Consultation`, `Exam`, `FollowUp` (Single Table Inheritance)
- `Procedure` (base) → `SimpleProcedure`, `SpecializedProcedure` (Single Table Inheritance)
- `MedicalRecord`
- `Report`

---

## 3. Decisões Técnicas

### 3.1 Estratégia de herança — User (Etapa 1)

**Estratégia escolhida:** Single Table Inheritance (STI)

**Justificativa:** A estratégia Single Table foi escolhida para `User` porque a operação
mais frequente e crítica — busca por email para autenticação — não precisa distinguir entre
subtipos. Com STI, essa query acessa uma única tabela sem JOINs, o que é mais eficiente.
Além disso, os três subtipos compartilham a maioria dos atributos: `name`, `email`,
`password`, `isActive` e `refreshToken` são comuns a todos. Os atributos exclusivos
(`crm` para Doctor, `cpf` e `birthDate` para Patient) são poucos e bem delimitados.

**Limitações identificadas:** As colunas específicas de cada subtipo ficam com valor nulo
para os outros perfis — `crm` é nulo para Admin e Patient, `cpf` e `birthDate` são nulos
para Admin e Doctor. Caso novos subtipos sejam adicionados com muitos atributos próprios,
a tabela `users` cresceria com várias colunas esparsas. Outra limitação é que constraints
de banco (`NOT NULL`, por exemplo) não podem ser aplicadas em colunas específicas de
subtipos dentro de uma STI, sendo a validação responsabilidade da camada de aplicação.

### 3.2 Estratégia de herança — Schedule (Etapa 1)

**Estratégia escolhida:** Single Table Inheritance (STI)

**Justificativa:** `Schedule` usa STI pelo mesmo motivo de `User`: a listagem geral de
agendamentos — independente de modalidade — é o caso de uso mais frequente. Um médico
ou paciente lista seus agendamentos sem distinção de tipo (IN_PERSON, ONLINE ou HOME),
e a STI evita JOINs nesse cenário. Os atributos específicos de cada modalidade são poucos
e bem delimitados: `room`/`unit` para presencial, `accessLink`/`platform` para online,
`fullAddress`/`accessNotes` para domiciliar.

**Limitações identificadas:** Os campos de cada subtipo ficam nulos para os outros tipos.
Por exemplo, um agendamento `ONLINE` terá `room` e `unit` como `null`. Isso é aceitável
em SQLite, mas impede restrições `NOT NULL` no banco para esses campos. A validação
fica inteiramente a cargo do DTO de criação na camada de aplicação.

### 3.3 Estratégia de herança — Appointment (Etapa 3)

**Estratégia escolhida:** Single Table Inheritance (STI)

**Justificativa baseada no domínio:** O perfil de consultas de `Appointment` é misto. O caso
de uso mais frequente — buscar todos os atendimentos de um médico ou paciente,
independentemente do tipo — favorece estratégias que não exigem UNION entre tabelas.
A filtragem por tipo específico (por exemplo, buscar apenas Exams para emissão de laudos)
é eficiente desde que o discriminador `type` esteja indexado.

A STI foi escolhida porque mantém consistência com as hierarquias de `User` e `Schedule`
já implementadas, e porque os três subtipos compartilham os atributos principais:
`scheduleId`, `doctorId`, `patientId`, `startedAt`, `endedAt`, `notes` e `status`. Os
atributos exclusivos — `reason`/`diagnosticHypothesis` (Consultation), `examType`/`result`
(Exam), `originAppointmentId`/`clinicalEvolution` (FollowUp) — são poucos e `nullable`
para os subtipos que não os utilizam, o que é aceitável no volume esperado de uma clínica.

**Comparação com escolhas anteriores:** A estratégia é a mesma usada para `User` e
`Schedule`. A justificativa central se repete: listagem geral sem distinção de subtipo é o
caso dominante, e a STI o atende com melhor performance. A consistência entre as quatro
hierarquias também reduz a curva de aprendizado para quem mantém o projeto.

**Limitações identificadas:** Os campos `reason` e `diagnosticHypothesis` ficam nulos para
`Exam` e `FollowUp`; `examType` e `result` ficam nulos para `Consultation` e `FollowUp`;
`originAppointmentId` fica nulo para `Consultation` e `Exam`. Isso significa que a restrição
`NOT NULL` para `reason` em `Consultation`, por exemplo, é garantida apenas pela validação
no DTO — não pelo banco.

**Lições aprendidas:** A experiência com `User` e `Schedule` mostrou que a STI funciona bem
quando os subtipos compartilham a maioria dos atributos e o caso de uso dominante é a
listagem geral. Na Etapa 3, essa confiança permitiu avançar rapidamente. O padrão
`@ChildEntity(AppointmentType.CONSULTATION)` do TypeORM mostrou-se simples de aplicar
e consistente com o que já havia sido implementado nas etapas anteriores.

### 3.4 Estratégia de herança — Procedure (Etapa 3)

**Estratégia escolhida:** Single Table Inheritance (STI)

**Justificativa baseada no domínio:** O perfil de consultas de `Procedure` é significativamente
diferente de `Appointment`. Procedimentos são quase sempre consultados no contexto de um
atendimento específico — raramente o sistema precisa listar procedimentos de todos os
atendimentos misturados. O campo `authorizationStatus`, que só existe em
`SpecializedProcedure`, é frequentemente usado como filtro.

Apesar do campo `authorizationStatus` ser nulo para `SimpleProcedure` em uma STI, a
estratégia foi mantida por consistência com as demais hierarquias e pela simplicidade de
implementação no TypeORM com SQLite. As queries que filtram por `authorizationStatus` já
incluem implicitamente o discriminador `type = 'SPECIALIZED'`, porque esse campo é
exclusivo de `SpecializedProcedure` — o que evita resultados incorretos. A separação em
`SimpleProcedure` e `SpecializedProcedure` via STI também facilita a extensão futura: um
novo subtipo seria adicionado com um novo `@ChildEntity` sem alterar o schema existente
(com `synchronize: true`).

**Limitações identificadas:** Os campos `requiredEquipment`, `complexityLevel`,
`requiresAuthorization`, `authorizationStatus`, `authorizedAt`, `authorizedById` e
`denialReason` ficam nulos para `SimpleProcedure`. Em termos de espaço, isso é desprezível
no SQLite para o volume esperado. Em bancos com tabelas maiores, uma Concrete Table
poderia ser mais adequada para `Procedure` por tornar os campos não-nulos em suas
respectivas tabelas.

### 3.5 Ajuste do TransformInterceptor para respostas binárias

O `TransformInterceptor` implementado na Etapa 2 envolve todas as respostas de sucesso
no envelope `{ data, meta }`. Com a introdução do endpoint `GET /reports/:id/pdf` na
Etapa 3, que retorna um buffer binário, foi necessário adaptar o interceptor para identificar
respostas que não devem ser transformadas.

**Solução adotada:** Foi criado o decorator `@SkipTransform()` em
`src/common/decorators/skip-transform.decorator.ts`, que seta um metadata
`SKIP_TRANSFORM_KEY` no handler. O `TransformInterceptor` foi atualizado para verificar
esse metadata via `Reflector` e, quando presente, deixar a resposta passar sem transformação.
Adicionalmente, o interceptor verifica se a resposta é uma instância de `Buffer` ou
`StreamableFile` e também a deixa passar sem transformação.

**Justificativa:** A abordagem com decorator é mais explícita e intencional do que verificar
apenas o tipo da resposta — deixa claro no controller que aquele endpoint é um caso
especial. É consistente com o padrão `@Public()` já adotado na Etapa 2 para sinalizar
exceções ao comportamento padrão dos guards.

### 3.6 Filtros dinâmicos nos endpoints de listagem

Os endpoints de listagem da Etapa 3 aceitam múltiplos filtros opcionais combináveis.
A estratégia adotada foi o `QueryBuilder` do TypeORM com condições adicionadas
dinamicamente apenas quando o filtro está presente no DTO de query:

```typescript
const qb = this.appointmentRepository.createQueryBuilder('appointment');

if (query.doctorId) qb.andWhere('appointment.doctorId = :doctorId', { doctorId: query.doctorId });
if (query.type)     qb.andWhere('appointment.type = :type', { type: query.type });
if (query.status)   qb.andWhere('appointment.status = :status', { status: query.status });
if (query.startDate) qb.andWhere('appointment.createdAt >= :startDate', { startDate: query.startDate });
if (query.endDate)   qb.andWhere('appointment.createdAt <= :endDate', { endDate: query.endDate });
```

**Justificativa:** Centralizar a construção da query no service com QueryBuilder é mais
legível e manutenível do que múltiplas condições aninhadas. O padrão foi aplicado
consistentemente em todos os endpoints de listagem da Etapa 3.

### 3.7 Atomicidade das operações críticas

Duas operações da Etapa 3 envolvem múltiplas escritas que devem ser atômicas:

**Criação de atendimento:** O registro de `Appointment` é criado e o `Schedule` associado
tem seu status atualizado para `COMPLETED` na mesma transação explícita via
`DataSource.transaction()`. Se qualquer parte falhar, nenhuma alteração é persistida.

**Emissão de laudo:** O `validationCode` é gerado e o registro de `Report` é criado em
uma transação explícita. Isso garante que não existirá um laudo sem código de validação
em caso de falha parcial. A transação também inclui uma re-verificação das pré-condições
(atendimento do tipo Exam, status FINISHED e resultado preenchido) dentro do contexto
transacional, evitando condições de corrida em cenários de alta concorrência.

Nenhuma outra operação do projeto exigiu transação explícita: as demais escritas são
unitárias (um único `save` ou `update`) e não envolvem múltiplas tabelas em uma mesma
operação atômica.

### 3.8 Controle de acesso por recurso

O controle por recurso foi implementado nos services — nunca nos controllers. A verificação
ocorre após a busca da entidade no banco, comparando o usuário autenticado com o
proprietário do recurso:

```typescript
private ensureAccessByRole(appointment: Appointment, currentUser: UserPayload): void {
  if (currentUser.type === UserType.ADMIN) return;
  if (currentUser.type === UserType.DOCTOR && appointment.doctorId !== currentUser.sub) {
    throw new ForbiddenException('Acesso negado: este atendimento não pertence a você.');
  }
  if (currentUser.type === UserType.PATIENT && appointment.patientId !== currentUser.sub) {
    throw new ForbiddenException('Acesso negado: este atendimento não pertence a você.');
  }
}
```

### 3.9 Ciclo de autorização de procedimentos especializados

O `SpecializedProcedure` com `requiresAuthorization = true` inicia com
`authorizationStatus = PENDING` — valor definido pelo sistema, nunca recebido do cliente.
A transição `DENIED → PENDING` é explicitamente bloqueada: uma negação é definitiva
para aquele registro, mantendo o histórico auditável de que o procedimento foi negado.

O endpoint `PATCH /procedures/:id/authorization` recebe `{ action: 'AUTHORIZE' | 'DENY',
denialReason?: string }`. A abordagem com campo `action` foi escolhida em detrimento de
dois endpoints separados (`/authorize` e `/deny`) por ser mais coesa — uma única operação
de decisão administrativa — e por simplificar a documentação no Swagger.

### 3.10 Prontuários — imutabilidade e rastreabilidade

Prontuários não podem ser excluídos — representam documentos clínicos permanentes.
O endpoint `DELETE /records/:id` foi implementado e retorna `405 Method Not Allowed`,
tornando a restrição explícita na documentação do Swagger. Essa abordagem foi preferida
à ausência do endpoint porque comunica ativamente ao consumidor da API que a exclusão
não é suportada para este recurso — diferente de um `404` que poderia ser interpretado
como "endpoint não existe".

O campo `lastUpdatedBy` é preenchido automaticamente com o usuário autenticado em toda
atualização — nunca recebido do cliente.

### 3.11 Laudos — endpoint público de validação e roteamento

O endpoint `GET /reports/validate/:code` é marcado com `@Public()` para que o
`JwtAuthGuard` global o ignore. Ele não tem `@ApiBearerAuth()` na documentação.

**Problema de roteamento resolvido:** A rota `GET /reports/validate/:code` foi declarada
**antes** de `GET /reports/:id/pdf` no controller. O NestJS processa rotas na ordem de
declaração — se `:id` fosse declarado antes, o valor `validate` seria interpretado como
um ID numérico, causando falha na validação do `ParseIntPipe`.

**Resposta do endpoint público:** Retorna dados básicos do laudo (status, data de emissão,
tipo de exame, nome do paciente) sem expor o `result` do exame — dado clínico sensível
desnecessário para confirmar autenticidade. Para laudos `REVOKED`, retorna os dados
básicos com o status claramente indicado e a data de revogação.

### 3.12 Geração de PDF com pdfkit

Foi criado um `PdfService` dedicado em `src/modules/reports/pdf.service.ts`, separado
da lógica de negócio do `ReportsService`. O serviço recebe um DTO `LaudoPdfData` com
exatamente os campos necessários para o PDF — sem expor a estrutura interna das entidades.

**Conteúdo do PDF:** nome do paciente, nome e CRM do médico, tipo de exame, resultado,
data de realização, data de emissão e código de validação em destaque com instrução
de verificação.

O `TransformInterceptor` não interfere na resposta do endpoint de PDF graças ao decorator
`@SkipTransform()` aplicado ao handler. A resposta é enviada diretamente via `@Res()` com
os headers `Content-Type: application/pdf` e `Content-Disposition: attachment`.

### 3.13 Relatórios administrativos — organização e implementação

Os relatórios foram organizados em um `AdminModule` dedicado, que importa o `DataSource`
diretamente e constrói queries de agregação com `QueryBuilder` e `GROUP BY` — sem
carregar registros brutos em memória.

**Justificativa:** Um módulo centralizado facilita adicionar novos relatórios sem dispersar
lógica de agregação pelos módulos de domínio. Se a clínica solicitasse novos relatórios,
o ponto de modificação seria único e bem definido.

**Taxa de ocupação (fórmula adotada):**
```
taxa = (CONFIRMED + COMPLETED) / total_de_agendamentos_no_periodo * 100
```
Essa fórmula representa a proporção de agendamentos que resultaram em atendimento
efetivo ou que estão confirmados para atendimento — excluindo cancelamentos e pendências
do numerador. A fórmula está documentada no Swagger do endpoint.

### 3.14 Criação do prontuário — manual pelo médico

O prontuário é criado explicitamente pelo médico após o encerramento do atendimento,
em uma operação separada via `POST /appointments/:id/records`. Essa abordagem foi
preferida à criação automática no encerramento porque dá controle ao médico sobre o
conteúdo do prontuário — o `diagnosis` é obrigatório e não pode ser gerado automaticamente
com valor significativo. A desvantagem (risco de atendimentos sem prontuário) é mitigada
pelo controle de acesso: apenas o Admin consegue listar todos os atendimentos encerrados
sem prontuário para fins de auditoria.

---

## 4. Tabela de Controle de Acesso

### Etapa 1 — Endpoints públicos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /auth/login` | Público | — | — |
| `POST /auth/refresh` | Público | — | — |

### Etapa 2 — Auth

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `GET /auth/me` | JWT | Todos | Próprio usuário |
| `POST /auth/logout` | JWT | Todos | Próprio usuário |

### Etapa 1 — Usuários

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /users` | JWT | Admin | — |
| `GET /users` | JWT | Admin | — |
| `GET /users/:id` | JWT | Admin | — |
| `PUT /users/:id` | JWT | Admin | — |
| `DELETE /users/:id` | JWT | Admin | — |
| `GET /doctors` | JWT | Admin | — |
| `GET /doctors/:id` | JWT | Admin, Doctor | Doctor: próprio perfil |
| `GET /patients` | JWT | Admin | — |
| `GET /patients/:id` | JWT | Admin, Patient | Patient: próprio perfil |

### Etapa 1 — Especialidades

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /specialties` | JWT | Admin | — |
| `GET /specialties` | JWT | Todos | — |
| `GET /specialties/:id` | JWT | Todos | — |
| `PUT /specialties/:id` | JWT | Admin | — |
| `DELETE /specialties/:id` | JWT | Admin | — |

### Etapa 1 — Agendamentos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /schedules` | JWT | Admin, Doctor | — |
| `GET /schedules` | JWT | Admin | — |
| `GET /schedules/:id` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `PUT /schedules/:id` | JWT | Admin, Doctor | Doctor: próprios |
| `PATCH /schedules/:id/confirm` | JWT | Admin | — |
| `PATCH /schedules/:id/cancel` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `DELETE /schedules/:id` | JWT | Admin | — |

### Etapa 3 — Atendimentos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /appointments` | JWT | Admin, Doctor | — |
| `GET /appointments` | JWT | Admin | — |
| `GET /appointments/:id` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `PUT /appointments/:id` | JWT | Admin, Doctor | Doctor: próprios |
| `PATCH /appointments/:id/finish` | JWT | Admin, Doctor | Doctor: próprios |
| `GET /doctors/:id/appointments` | JWT | Admin, Doctor | Doctor: própria agenda |
| `GET /patients/:id/appointments` | JWT | Admin, Patient | Patient: próprios |

### Etapa 3 — Procedimentos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /appointments/:id/procedures` | JWT | Admin, Doctor | Doctor: atendimentos próprios |
| `GET /appointments/:id/procedures` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `GET /procedures/:id` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `PUT /procedures/:id` | JWT | Admin, Doctor | Doctor: próprios |
| `PATCH /procedures/:id/authorization` | JWT | Admin | — |
| `DELETE /procedures/:id` | JWT | Admin, Doctor | Doctor: próprios |

### Etapa 3 — Prontuários

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /appointments/:id/records` | JWT | Admin, Doctor | Doctor: atendimentos próprios |
| `GET /appointments/:id/records` | JWT | Admin, Doctor, Patient | Doctor/Patient: próprios |
| `PUT /records/:id` | JWT | Admin, Doctor | Doctor: próprios |
| `DELETE /records/:id` | JWT | — | Sempre 405 |
| `GET /patients/:id/records` | JWT | Admin, Doctor, Patient | Doctor: pacientes que atendeu / Patient: próprios |
| `GET /doctors/:id/records` | JWT | Admin, Doctor | Doctor: próprios |

### Etapa 3 — Laudos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `POST /appointments/:id/report` | JWT | Admin, Doctor | Doctor: atendimentos próprios |
| `GET /reports/validate/:code` | **Público** | Qualquer um | — |
| `GET /reports/:id/pdf` | JWT | Admin, Doctor, Patient | Doctor: próprios / Patient: próprios |
| `PATCH /reports/:id/revoke` | JWT | Admin, Doctor | Doctor: laudos que emitiu |
| `GET /patients/:id/reports` | JWT | Admin, Doctor, Patient | Doctor: pacientes que atendeu / Patient: próprios |
| `GET /doctors/:id/reports` | JWT | Admin, Doctor | Doctor: próprios |

### Etapa 3 — Relatórios administrativos

| Endpoint | Auth | Perfis | Controle por recurso |
|----------|------|--------|---------------------|
| `GET /admin/reports/schedules` | JWT | Admin | — |
| `GET /admin/reports/appointments` | JWT | Admin | — |
| `GET /admin/reports/procedures` | JWT | Admin | — |
| `GET /admin/reports/doctors/:id/occupation` | JWT | Admin | — |

---

## 5. Mapa de Dependências entre Módulos

```
CommonModule (infraestrutura transversal — disponível globalmente)
├── LoggingMiddleware
├── TransformInterceptor
├── HttpExceptionFilter
├── JwtAuthGuard
└── RolesGuard

AuthModule
└── depende de → UsersModule (valida credenciais e busca usuário)

UsersModule
└── depende de → SchedulesModule (via forwardRef — dependência circular resolvida)

SchedulesModule
└── depende de → UsersModule (valida Doctor e Patient)

AppointmentsModule
├── depende de → SchedulesModule (verifica CONFIRMED e atualiza para COMPLETED)
└── depende de → UsersModule (valida Doctor e Patient)
└── exporta → AppointmentsService (usado por Procedures, MedicalRecords, Reports)

ProceduresModule
└── depende de → AppointmentsModule (verifica IN_PROGRESS)

MedicalRecordsModule
└── depende de → AppointmentsModule (verifica FINISHED)

ReportsModule
├── depende de → AppointmentsModule (verifica Exam FINISHED com result)
└── contém → PdfService (isolado, sem dependências externas)

AdminModule
├── depende de → DataSource diretamente (queries de agregação)
└── não depende dos services de domínio (acessa o banco via QueryBuilder próprio)
```

**Dependências circulares:** A única dependência circular existente no projeto é entre
`UsersModule` e `SchedulesModule`, resolvida com `forwardRef()` na Etapa 1. Na Etapa 3,
as dependências foram projetadas em sentido único para evitar novos ciclos.

---

## 6. Limitações Conhecidas do Sistema

### Banco de dados
O SQLite foi adequado para desenvolvimento acadêmico, mas apresenta limitações para
produção: sem suporte a múltiplas conexões concorrentes, sem replicação e sem backup
automático. A migração para PostgreSQL ou MySQL exigiria revisar as estratégias de herança
— especialmente se Joined Table foi usada, pois o SQLite tem suporte limitado a certas
constraints de chave estrangeira.

### Segurança
- Sem rate limiting no endpoint de login — vulnerável a ataques de força bruta
- Sem proteção contra injeção via parâmetros de query além do que o TypeORM oferece
- Sem headers de segurança HTTP (HSTS, CSP, X-Frame-Options)
- Refresh token armazenado em texto puro no banco — em produção deveria ser um hash
- Sem expiração de sessão baseada em inatividade

### Controle de acesso
O modelo de acesso por recurso é restritivo por design. Cenários legítimos não cobertos:
- Um médico substituto não consegue acessar atendimentos de um colega
- Um paciente não consegue compartilhar prontuário com outro médico sem intervenção do Admin
- Não há suporte a delegação ou compartilhamento temporário de acesso

### Performance
- Queries de listagem com múltiplos filtros não têm índices otimizados além dos gerados
  automaticamente pelo TypeORM para chaves primárias e estrangeiras
- Relatórios administrativos sem cache — recalculados a cada requisição
- As queries de `MedicalRecord` e `Report` que filtram por paciente ou médico utilizam
  JOIN manual via QueryBuilder (as relações não são carregadas via TypeORM `relations`),
  o que é mais performático, mas exige maior cuidado na manutenção
- Ausência de índice explícito nos campos `status` e `type` das tabelas `schedules`,
  `appointments` e `procedures`, que são filtros frequentes — o TypeORM gera apenas
  índices para PKs e FKs por padrão com `synchronize: true`

### Geração de PDF
- O PDF é gerado em memória a cada requisição — sem cache. Para volumes altos de
  downloads simultâneos, isso poderia ser um gargalo
- Não há QR code no PDF apontando para o endpoint de validação — seria uma melhoria
  de usabilidade relevante para um documento médico formal

---

## 7. Reflexão sobre Herança no Banco de Dados

Ao longo do projeto, a herança no banco de dados foi implementada quatro vezes:
`User`, `Schedule`, `Appointment` e `Procedure`. Cada caso revelou aspectos diferentes
das estratégias disponíveis no TypeORM com SQLite.

### Síntese das decisões

| Hierarquia | Estratégia | Subtipos | Caso de uso dominante |
|-----------|-----------|---------|----------------------|
| User | Single Table Inheritance (STI) | Admin, Doctor, Patient | Busca por email para autenticação |
| Schedule | Single Table Inheritance (STI) | InPerson, Online, Home | Listagem geral por Doctor/Patient |
| Appointment | Single Table Inheritance (STI) | Consultation, Exam, FollowUp | Listagem por Doctor/Patient + filtro por tipo |
| Procedure | Single Table Inheritance (STI) | Simple, Specialized | Listagem por atendimento + filtro por authorizationStatus |

### Lições aprendidas

- A STI simplifica consultas gerais mas gera colunas nulas quando os subtipos divergem.
  Em `User`, a divergência é pequena e controlada. Em `Procedure`, a divergência é maior
  — `SpecializedProcedure` tem seis colunas que ficam nulas para `SimpleProcedure` — mas
  ainda aceitável para o volume de dados esperado.

- O TypeORM com SQLite não apresentou problemas específicos com STI durante o
  desenvolvimento. O `synchronize: true` cria a tabela com todas as colunas automaticamente.
  O único cuidado necessário foi garantir que os campos obrigatórios de cada subtipo
  (como `reason` em `Consultation` ou `examType` em `Exam`) sejam validados no DTO,
  já que o banco não pode impor `NOT NULL` em colunas de STI de forma seletiva.

- O discriminador de tipo indexado é essencial para performance em STI quando o filtro
  por subtipo é frequente. No projeto, isso se aplica especialmente ao relatório
  administrativo de procedimentos, que filtra `type = 'SPECIALIZED'` com `GROUP BY`
  no `authorizationStatus`.

- Para hierarquias onde os subtipos raramente são consultados juntos, como `Procedure`
  — que quase sempre é buscado no contexto de um atendimento específico —, a STI se
  mostrou ligeiramente excessiva. Uma Concrete Table teria evitado os campos nulos de
  `SimpleProcedure` e permitido constraints mais precisas. Porém, a consistência com
  as demais hierarquias e a simplicidade de implementação no TypeORM justificaram
  manter a STI.

### Recomendação para projetos futuros

Em um novo projeto similar, adotaria a STI como padrão quando: (1) os subtipos
compartilham mais de 60% dos atributos; (2) a listagem mista (sem distinção de subtipo)
é o caso de uso mais frequente; e (3) os atributos exclusivos de cada subtipo são poucos.

Mudaria para Concrete Table quando os subtipos têm conjuntos de atributos muito
distintos e quase nunca são consultados juntos — como seria o caso se `Procedure`
tivesse mais atributos exclusivos, ou se um novo subtipo surgisse com características
muito diferentes das existentes.

Evitaria Joined Table com SQLite por limitações do banco na manipulação de constraints
de chave estrangeira em hierarquias mais profundas. Em PostgreSQL, Joined Table seria
uma opção viável quando a integridade de campos obrigatórios nos subtipos é prioritária.

---

## 8. Dificuldades e Aprendizados da Etapa 3

### Dificuldades técnicas

**TransformInterceptor com respostas binárias:** O principal ajuste de infraestrutura desta
etapa foi garantir que o endpoint de PDF não tivesse sua resposta envolvida no envelope
JSON. A solução com `@SkipTransform()` se mostrou limpa e consistente com o padrão
`@Public()` já estabelecido.

**Roteamento do endpoint público:** O conflito potencial entre `GET /reports/validate/:code`
e `GET /reports/:id` exigiu atenção à ordem de declaração das rotas no controller — um
comportamento do NestJS que não é imediatamente óbvio.

**Atomicidade na criação de atendimento:** Garantir que a criação do `Appointment` e a
atualização do `Schedule` para `COMPLETED` ocorressem atomicamente exigiu o uso explícito
de `DataSource.transaction()` — um padrão mais verboso que o uso direto dos repositories,
mas necessário para garantir consistência. Dentro da transação, é preciso usar o
`EntityManager` passado como argumento em vez dos repositories injetados, o que
representa uma mudança de paradigma em relação ao uso habitual.

**Múltiplos controllers com o mesmo prefixo de rota:** A Etapa 3 introduziu vários
controllers com prefixos idênticos em módulos diferentes (por exemplo, `@Controller('doctors')`
aparece em `UsersModule`, `AppointmentsModule`, `MedicalRecordsModule` e `ReportsModule`).
O NestJS resolve as rotas pelo caminho completo, então isso funciona corretamente — mas
exige atenção para não declarar o mesmo caminho completo em dois controllers distintos.

**Delegação de verificação de acesso:** `ProceduresService` e `MedicalRecordsService`
não verificam o acesso diretamente — delegam para `AppointmentsService.findOne(appointmentId,
currentUser)`. Isso evita duplicar a lógica de propriedade, mas exige que o módulo
importe `AppointmentsModule` e que `AppointmentsService` esteja exportado. A cadeia de
dependências foi projetada cuidadosamente para evitar ciclos.

### Aprendizados

- Como o TypeORM gerencia transações explícitas com `DataSource.transaction()`: dentro
  da transação, o `EntityManager` substitui os repositories, e todas as operações devem
  usar esse manager para participar da mesma transação.
- Como o NestJS resolve ambiguidades de rota e a importância da ordem de declaração:
  rotas com segmentos literais (como `validate`) devem ser declaradas antes de rotas
  com parâmetros dinâmicos (como `:id`) no mesmo controller.
- Como estruturar verificações de pré-condição nos services com métodos auxiliares
  descritivos (`ensureAppointmentIsFinished`, `ensureFollowUpIsValid`), tornando o fluxo
  principal do método legível e as regras de negócio explícitas.
- Como o padrão de múltiplos controllers em um mesmo arquivo (`appointments.controller.ts`
  exportando três controllers) permite agrupar logicamente endpoints relacionados que
  usam prefixos diferentes, sem criar arquivos fragmentados.

---

## 9. Reflexão Final

### O que foi construído

O SGCM é uma API REST completa para gestão de clínica médica, cobrindo o ciclo clínico
completo do agendamento ao laudo. Ao longo de três etapas, o sistema evoluiu de um CRUD
básico para um sistema com autenticação JWT, controle de acesso granular por perfil e por
recurso, documentação clínica formal e relatórios administrativos.

### O que mudaria se começasse do zero

**Decisões de modelagem:**
- As escolhas de STI na Etapa 1 não causaram problemas na prática — na verdade,
  facilitaram a Etapa 3, pois o padrão já era conhecido e o TypeORM já estava configurado
  corretamente. A única hierarquia que geraria dúvida em retrospecto é `Procedure`: com
  dois subtipos muito distintos em termos de atributos, uma Concrete Table teria sido
  semanticamente mais precisa, embora a STI tenha funcionado sem problemas.
- Modelaria `MedicalRecord` da mesma forma — como entidade separada com relação
  `OneToOne` para `Appointment`. Embutir o prontuário no atendimento teria simplificado
  alguns endpoints, mas teria dificultado o controle de acesso e a rastreabilidade de
  atualizações (`lastUpdatedById`).

**Organização do código:**
- Padronizaria desde o início um método auxiliar compartilhado para verificação de
  acesso por recurso (como um `ResourceAccessGuard` genérico ou um helper de service),
  em vez de replicar a lógica `ensureAccessByRole` em cada service da Etapa 3.
- A separação entre controllers, services e lógica de controle por recurso estava bem
  definida desde o início e não exigiu refatoração significativa nas etapas seguintes —
  isso foi um acerto da Etapa 1.

**Infraestrutura:**
- A decisão de registrar guards e interceptors globalmente em `main.ts` com padrão opt-out
  (`@Public()`, `@SkipTransform()`) se mostrou acertada: simplificou os controllers da
  Etapa 3, que não precisam declarar `@UseGuards` individualmente. O custo foi a
  necessidade de lembrar de marcar os poucos endpoints públicos com o decorator correto.
- O `TransformInterceptor` deveria ter sido projetado desde a Etapa 2 para verificar
  `Buffer` e `StreamableFile`, evitando a necessidade do `@SkipTransform()`. A solução
  adotada funciona bem, mas o problema era previsível — qualquer endpoint de download
  de arquivo enfrentaria a mesma situação.

**Processo:**
- A Etapa 1 como base sólida foi essencial: as entidades bem modeladas, a infraestrutura
  de filtros e paginação e a documentação Swagger estabelecida tornaram as Etapas 2 e 3
  incrementais, não reescritas. Decisões precipitadas na Etapa 1 teriam gerado dívida
  técnica acumulada.
- A única decisão da Etapa 1 que gerou trabalho extra na Etapa 2 foi a dependência
  circular entre `UsersModule` e `SchedulesModule`, resolvida com `forwardRef()`. Na
  Etapa 3, esse padrão serviu de alerta para evitar novas circularidades — e todas as
  dependências novas foram projetadas em sentido único.

### Considerações finais

O projeto ensinou que a modelagem de uma API REST vai muito além da escolha de
endpoints e verbos HTTP. As decisões de herança no banco de dados, tomadas na Etapa 1
com base em critérios teóricos, tiveram impacto direto na complexidade das queries e na
facilidade de implementação das Etapas 2 e 3. A STI mostrou-se uma escolha pragmática:
não é perfeita para todos os casos, mas sua simplicidade de implementação no TypeORM
e sua adequação ao caso de uso dominante (listagens mistas) justificaram o uso consistente
em todas as hierarquias.

O controle de acesso granular — por perfil e por recurso — foi o aspecto que mais revelou
a diferença entre construir uma API que funciona e construir uma API que é segura por
design. Implementar essa lógica nos services (não nos controllers) e delegar verificações
via cadeia de dependências entre services tornou o sistema coeso e auditável.

Por fim, o ciclo de três etapas demonstrou na prática o valor da arquitetura incremental:
cada etapa entregou valor independente e a base sólida da etapa anterior determinou
diretamente a velocidade e qualidade da próxima.
