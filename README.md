# SGCM — Sistema de Gestão de Clínica Médica

API REST para gerenciamento de usuários, especialidades e agendamentos de uma clínica médica. Desenvolvida com NestJS, TypeORM e SQLite como projeto acadêmico da disciplina de Desenvolvimento Web — UFMS.

---

## Tecnologias

| Tecnologia | Versão |
|---|---|
| Node.js | 20.x (LTS) |
| NestJS | 11.x |
| TypeORM | 0.3.x |
| SQLite (better-sqlite3) | — |
| TypeScript | 5.x |

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
# JWT_SECRET=     # será necessário na Etapa 2
# JWT_EXPIRES_IN= # será necessário na Etapa 2
```

Os valores padrão já funcionam sem nenhuma alteração para rodar localmente.

---

## Executando o projeto

```bash
# modo desenvolvimento (com hot reload)
npm run start:dev
```

A aplicação estará disponível em `http://localhost:3000`.

O banco de dados SQLite (`database.db`) é criado automaticamente na raiz do projeto na primeira execução. O arquivo já está presente no repositório com dados de exemplo para facilitar os testes.

---

## Documentação da API

Com o projeto rodando, acesse o Swagger em:

```
http://localhost:3000/api
```

A documentação inclui todos os endpoints com exemplos de requisição, resposta de sucesso e respostas de erro no formato RFC 7807.

---

## Estrutura do projeto

```
src/
├── common/
│   └── filters/
│       └── http-exception.filter.ts   # filtro global RFC 7807
├── modules/
│   ├── users/
│   │   ├── dto/                       # DTOs de entrada e resposta
│   │   ├── entities/                  # User, Admin, Doctor, Patient (STI)
│   │   ├── users.controller.ts
│   │   ├── doctors.controller.ts
│   │   ├── patients.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── specialties/
│   │   ├── dto/
│   │   ├── entities/                  # Specialty, DoctorSpecialty
│   │   ├── specialties.controller.ts
│   │   ├── specialties.service.ts
│   │   └── specialties.module.ts
│   └── schedules/
│       ├── dto/
│       ├── entities/                  # Schedule, InPerson, Online, Home (STI)
│       ├── schedules.controller.ts
│       ├── schedules.service.ts
│       └── schedules.module.ts
├── app.module.ts
└── main.ts
```

---

## Endpoints principais

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/users` | Criar usuário (ADMIN, DOCTOR ou PATIENT) |
| `GET` | `/users` | Listar usuários com filtro por `type` |
| `GET` | `/users/:id` | Buscar usuário por ID |
| `PUT` | `/users/:id` | Atualizar usuário |
| `DELETE` | `/users/:id` | Inativar usuário |

### Médicos

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/doctors` | Listar médicos com especialidades |
| `GET` | `/doctors/:id` | Buscar médico por ID com especialidades |
| `GET` | `/doctors/:id/specialties` | Listar especialidades do médico |
| `POST` | `/doctors/:id/specialties` | Associar especialidade ao médico |
| `DELETE` | `/doctors/:id/specialties/:specialtyId` | Desassociar especialidade |
| `GET` | `/doctors/:id/schedules` | Listar agendamentos do médico |

### Pacientes

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/patients` | Listar pacientes |
| `GET` | `/patients/:id` | Buscar paciente por ID |
| `GET` | `/patients/:id/schedules` | Listar agendamentos do paciente |

### Especialidades

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/specialties` | Criar especialidade |
| `GET` | `/specialties` | Listar especialidades |
| `GET` | `/specialties/:id` | Buscar especialidade por ID |
| `PUT` | `/specialties/:id` | Atualizar especialidade |
| `DELETE` | `/specialties/:id` | Excluir especialidade |
| `GET` | `/specialties/:id/doctors` | Listar médicos da especialidade |

### Agendamentos

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/schedules` | Criar agendamento (IN_PERSON, ONLINE ou HOME) |
| `GET` | `/schedules` | Listar agendamentos com filtros |
| `GET` | `/schedules/:id` | Buscar agendamento por ID |
| `PUT` | `/schedules/:id` | Atualizar dados do agendamento |
| `PATCH` | `/schedules/:id/status` | Atualizar status (CONFIRMED ou CANCELLED) |
| `DELETE` | `/schedules/:id` | Excluir agendamento |

---

## Parâmetros de listagem

Todos os endpoints de listagem suportam os seguintes query params:

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | number | 1 | Número da página |
| `limit` | number | 20 | Registros por página |
| `sort` | string | — | Ordenação no formato `campo:asc` ou `campo:desc` |
| `search` | string | — | Busca textual nos campos relevantes |

**Exemplo:**

```
GET /schedules?status=CONFIRMED&sort=scheduledAt:asc&page=1&limit=10
GET /doctors?search=Ana&sort=name:asc
GET /users?type=PATIENT&page=2&limit=5
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

- Senhas armazenadas com hash `bcrypt` — nunca em texto puro
- `password` e `refreshToken` nunca aparecem em nenhuma resposta
- E-mail único no sistema independentemente do perfil
- CRM único para médicos, CPF único para pacientes
- Agendamentos não podem ser criados com data no passado
- Um médico não pode ter dois agendamentos `CONFIRMED` no mesmo horário
- Transições de status permitidas: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`
- `COMPLETED` não pode ser definido via API — ocorre internamente na Etapa 3
- Especialidade com médicos associados não pode ser removida
- Usuário com agendamentos `PENDING` ou `CONFIRMED` não pode ser inativado

---

## Integrantes

| Nome | GitHub |
|---|---|
| Willian Charantola da Costa | [@willian](https://github.com/willcharantola) |
| João Pedro de Melo Hentz | [@joaopedro](https://github.com/joaohentz) |

---

## Etapas do projeto

- [x] **Etapa 1** — Modelagem, CRUD, regras de negócio, Swagger
- [ ] **Etapa 2** — Autenticação JWT, controle de acesso por perfil, middlewares
- [ ] **Etapa 3** — Atendimentos, procedimentos, prontuários e laudos
