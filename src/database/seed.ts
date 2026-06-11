import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

import { User } from '../modules/users/entities/user.entity';
import { Admin } from '../modules/users/entities/admin.entity';
import { Doctor } from '../modules/users/entities/doctor.entity';
import { Patient } from '../modules/users/entities/patient.entity';
import { Specialty } from '../modules/specialties/entities/specialty.entity';
import { DoctorSpecialty } from '../modules/specialties/entities/doctor-specialty.entity';
import { Schedule } from '../modules/schedules/entities/schedule.entity';
import { InPersonSchedule } from '../modules/schedules/entities/in-person-schedule.entity';
import { OnlineSchedule } from '../modules/schedules/entities/online-schedule.entity';
import { HomeSchedule } from '../modules/schedules/entities/home-schedule.entity';
import { Appointment } from '../modules/appointments/entities/appointment.entity';
import { Consultation } from '../modules/appointments/entities/consultation.entity';
import { Exam } from '../modules/appointments/entities/exam.entity';
import { FollowUp } from '../modules/appointments/entities/follow-up.entity';
import { Procedure } from '../modules/procedures/entities/procedure.entity';
import { SimpleProcedure } from '../modules/procedures/entities/simple-procedure.entity';
import { SpecializedProcedure } from '../modules/procedures/entities/specialized-procedure.entity';
import { MedicalRecord } from '../modules/medical-records/entities/medical-record.entity';
import { Report } from '../modules/reports/entities/report.entity';

import { ScheduleStatus } from '../modules/schedules/entities/schedule.entity';
import { AppointmentStatus } from '../modules/appointments/entities/appointment.entity';
import { AuthorizationStatus, ComplexityLevel } from '../modules/procedures/entities/procedure.entity';
import { ReportStatus } from '../modules/reports/entities/report.entity';

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_PATH ?? './database.db',
  synchronize: true,
  logging: false,
  entities: [
    User, Admin, Doctor, Patient,
    Specialty, DoctorSpecialty,
    Schedule, InPersonSchedule, OnlineSchedule, HomeSchedule,
    Appointment, Consultation, Exam, FollowUp,
    Procedure, SimpleProcedure, SpecializedProcedure,
    MedicalRecord,
    Report,
  ],
});

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  await AppDataSource.initialize();

  const adminRepo = AppDataSource.getRepository(Admin);
  const existing = await adminRepo.findOneBy({ email: 'admin@sgcm.com' });
  if (existing) {
    console.log('Database already seeded — skipping.');
    await AppDataSource.destroy();
    return;
  }

  const SALT = 10;
  const [adminHash, doctorHash, patientHash] = await Promise.all([
    bcrypt.hash('Admin@123', SALT),
    bcrypt.hash('Doctor@123', SALT),
    bcrypt.hash('Patient@123', SALT),
  ]);

  // ── Users ──────────────────────────────────────────────────────────────────
  const admin = adminRepo.create({
    name: 'Administrador SGCM',
    email: 'admin@sgcm.com',
    password: adminHash,
    accessLevel: 'SUPER',
  });
  await adminRepo.save(admin);

  const doctorRepo = AppDataSource.getRepository(Doctor);
  const doctor = doctorRepo.create({
    name: 'Dr. Carlos Mendes',
    email: 'carlos.mendes@sgcm.com',
    password: doctorHash,
    crm: 'CRM-SP-12345',
  });
  await doctorRepo.save(doctor);

  const patientRepo = AppDataSource.getRepository(Patient);
  const patient = patientRepo.create({
    name: 'Ana Paula Souza',
    email: 'ana.souza@sgcm.com',
    password: patientHash,
    cpf: '123.456.789-00',
    birthDate: new Date('1992-05-15'),
  });
  await patientRepo.save(patient);

  // ── Specialty ──────────────────────────────────────────────────────────────
  const specialtyRepo = AppDataSource.getRepository(Specialty);
  const specialty = specialtyRepo.create({
    name: 'Cardiologia',
    description: 'Especialidade voltada ao diagnóstico e tratamento de doenças cardiovasculares.',
  });
  await specialtyRepo.save(specialty);

  const dsRepo = AppDataSource.getRepository(DoctorSpecialty);
  const ds = dsRepo.create({ doctorId: doctor.id, specialtyId: specialty.id });
  await dsRepo.save(ds);

  // ── Schedules ──────────────────────────────────────────────────────────────
 
  const ipRepo = AppDataSource.getRepository(InPersonSchedule);
  const onlineRepo = AppDataSource.getRepository(OnlineSchedule);
  const homeRepo = AppDataSource.getRepository(HomeSchedule);

  const base = { doctorId: doctor.id, patientId: patient.id, createdById: admin.id };

  const ipBase = { ...base, room: 'Consultório 01', unit: 'Unidade Central' };
  const sch1 = ipRepo.create({ ...ipBase, scheduledAt: daysAgo(10), status: ScheduleStatus.COMPLETED });
  const sch2 = ipRepo.create({ ...ipBase, scheduledAt: daysAgo(8), status: ScheduleStatus.COMPLETED });
  const sch3 = ipRepo.create({ ...ipBase, scheduledAt: daysAgo(5), status: ScheduleStatus.COMPLETED });
  const sch4 = ipRepo.create({ ...ipBase, scheduledAt: daysAgo(3), status: ScheduleStatus.CONFIRMED });
  const sch5 = ipRepo.create({ ...ipBase, scheduledAt: daysAgo(1), status: ScheduleStatus.PENDING });
  const sch6 = ipRepo.create({
    ...ipBase,
    scheduledAt: daysAgo(2),
    status: ScheduleStatus.CANCELLED,
    cancelledAt: daysAgo(3),
    cancelledById: admin.id,
    cancellationReason: 'Paciente impossibilitado de comparecer.',
  });
  const sch7 = onlineRepo.create({
    ...base,
    scheduledAt: daysAgo(4),
    status: ScheduleStatus.CONFIRMED,
    accessLink: 'https://meet.sgcm.com/dr-mendes-ana',
    platform: 'Google Meet',
  });
  const sch8 = homeRepo.create({
    ...base,
    scheduledAt: daysAgo(6),
    status: ScheduleStatus.PENDING,
    fullAddress: 'Rua das Flores, 123, Apto 45 — Jardim Paulista, São Paulo/SP',
    accessNotes: 'Interfone 45. Porteiro das 8h às 18h.',
  });

  await ipRepo.save([sch1, sch2, sch3, sch4, sch5, sch6]);
  await onlineRepo.save(sch7);
  await homeRepo.save(sch8);

  // ── Appointments ───────────────────────────────────────────────────────────
  const aptBase = { doctorId: doctor.id, patientId: patient.id };

  const consultationRepo = AppDataSource.getRepository(Consultation);
  const consultation = consultationRepo.create({
    ...aptBase,
    scheduleId: sch1.id,
    startedAt: daysAgo(10),
    endedAt: daysAgo(10),
    status: AppointmentStatus.FINISHED,
    reason: 'Dor no peito e falta de ar aos esforços.',
    diagnosticHypothesis: 'Possível angina estável. Solicitar ECG e teste ergométrico.',
    notes: 'Paciente relata histórico familiar de infarto.',
  });
  await consultationRepo.save(consultation);

  const examRepo = AppDataSource.getRepository(Exam);
  const exam = examRepo.create({
    ...aptBase,
    scheduleId: sch2.id,
    startedAt: daysAgo(8),
    endedAt: daysAgo(8),
    status: AppointmentStatus.FINISHED,
    examType: 'Eletrocardiograma (ECG)',
    result: 'Ritmo sinusal regular. Sem alterações isquêmicas evidentes. Intervalo QT normal.',
    notes: 'Exame realizado em repouso.',
  });
  await examRepo.save(exam);

  const followUpRepo = AppDataSource.getRepository(FollowUp);
  const followUp = followUpRepo.create({
    ...aptBase,
    scheduleId: sch3.id,
    startedAt: daysAgo(5),
    status: AppointmentStatus.IN_PROGRESS,
    originAppointmentId: consultation.id,
    clinicalEvolution: 'Paciente apresenta melhora parcial após início do tratamento com betabloqueador.',
  });
  await followUpRepo.save(followUp);

  // ── Procedures (on the IN_PROGRESS FollowUp) ──────────────────────────────
  const simpleProcRepo = AppDataSource.getRepository(SimpleProcedure);
  const specProcRepo = AppDataSource.getRepository(SpecializedProcedure);

  await simpleProcRepo.save(
    simpleProcRepo.create({
      appointmentId: followUp.id,
      name: 'Aferição de pressão arterial',
      description: 'Medição da pressão arterial sistêmica em repouso.',
      estimatedDuration: 10,
    }),
  );

  // Specialized — PENDING
  await specProcRepo.save(
    specProcRepo.create({
      appointmentId: followUp.id,
      name: 'Ecocardiograma transtorácico',
      description: 'Avaliação da função cardíaca por ultrassom.',
      requiredEquipment: 'Aparelho de ultrassom cardíaco',
      complexityLevel: ComplexityLevel.MEDIUM,
      requiresAuthorization: true,
      authorizationStatus: AuthorizationStatus.PENDING,
    }),
  );

  // Specialized — AUTHORIZED
  await specProcRepo.save(
    specProcRepo.create({
      appointmentId: followUp.id,
      name: 'Holter 24h',
      description: 'Monitorização cardíaca contínua por 24 horas.',
      requiredEquipment: 'Monitor Holter',
      complexityLevel: ComplexityLevel.HIGH,
      requiresAuthorization: true,
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
      authorizedAt: daysAgo(4),
      authorizedById: admin.id,
    }),
  );

  // Specialized — DENIED
  await specProcRepo.save(
    specProcRepo.create({
      appointmentId: followUp.id,
      name: 'Cateterismo cardíaco',
      description: 'Procedimento invasivo para avaliação coronariana.',
      requiredEquipment: 'Sala de hemodinâmica',
      complexityLevel: ComplexityLevel.HIGH,
      requiresAuthorization: true,
      authorizationStatus: AuthorizationStatus.DENIED,
      denialReason: 'Paciente não preenche critérios clínicos para procedimento invasivo no momento.',
    }),
  );

  // ── MedicalRecord (for the FINISHED Consultation) ─────────────────────────
  const recordRepo = AppDataSource.getRepository(MedicalRecord);
  await recordRepo.save(
    recordRepo.create({
      appointmentId: consultation.id,
      diagnosis: 'Angina estável CID I20.8. ECG sem alterações agudas.',
      prescription: 'Atenolol 50mg — 1 comprimido pela manhã. Aspirina 100mg — 1 comprimido à noite com refeição.',
      notes: 'Retorno em 30 dias. Solicitar perfil lipídico completo na próxima consulta.',
      lastUpdatedById: doctor.id,
    }),
  );

  // ── Reports (for the FINISHED Exam) ───────────────────────────────────────
  const reportRepo = AppDataSource.getRepository(Report);

  // REVOKED (older — revoked before the active one was issued)
  const revokedReport = reportRepo.create({
    appointmentId: exam.id,
    validationCode: randomUUID(),
    content: [
      `Laudo de Exame — ${exam.examType}`,
      `Paciente: ${patient.name}`,
      `Médico: ${doctor.name} — ${doctor.crm}`,
      '',
      'Resultado: Rascunho inicial com dados incompletos. Emitido erroneamente.',
      '',
      'Este laudo foi revogado.',
    ].join('\n'),
    issuedById: doctor.id,
    status: ReportStatus.REVOKED,
    revokedAt: daysAgo(6),
    revokedReason: 'Emissão acidental com dados incompletos. Substituído por laudo corrigido.',
    revokedById: admin.id,
  });
  await reportRepo.save(revokedReport);

  // ACTIVE (current valid report)
  const activeReport = reportRepo.create({
    appointmentId: exam.id,
    validationCode: randomUUID(),
    content: [
      `Laudo de Exame — ${exam.examType}`,
      `Paciente: ${patient.name}`,
      `Médico: ${doctor.name} — ${doctor.crm}`,
      '',
      `Resultado: ${exam.result}`,
      '',
      'Conclusão: Exame dentro dos parâmetros normais para a faixa etária da paciente.',
      'Recomenda-se acompanhamento clínico semestral.',
    ].join('\n'),
    issuedById: doctor.id,
    status: ReportStatus.ACTIVE,
  });
  await reportRepo.save(activeReport);

  await AppDataSource.destroy();

  console.log('\n✔ Seed concluído com sucesso!\n');
  console.log('═══════════════════════════════════════════════');
  console.log(' Credenciais de acesso');
  console.log('═══════════════════════════════════════════════');
  console.log(` Admin   : admin@sgcm.com        / Admin@123`);
  console.log(` Doctor  : carlos.mendes@sgcm.com / Doctor@123`);
  console.log(` Patient : ana.souza@sgcm.com     / Patient@123`);
  console.log('═══════════════════════════════════════════════\n');
  console.log('Dados criados:');
  console.log(' • 3 usuários (Admin, Doctor, Patient)');
  console.log(' • 1 especialidade + vínculo médico-especialidade');
  console.log(' • 8 agendamentos (IN_PERSON×6, ONLINE×1, HOME×1)');
  console.log('     status: COMPLETED×3, CONFIRMED×2, PENDING×2, CANCELLED×1');
  console.log(' • 3 atendimentos: Consultation (FINISHED), Exam (FINISHED), FollowUp (IN_PROGRESS)');
  console.log(' • 4 procedimentos no FollowUp: Simple, Specialized PENDING/AUTHORIZED/DENIED');
  console.log(' • 1 prontuário médico (MedicalRecord) para a Consultation');
  console.log(' • 2 laudos (Report) para o Exam: 1 ACTIVE + 1 REVOKED\n');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
