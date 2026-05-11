// src/modules/users/entities/patient.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { User, UserType } from './user.entity';

@ChildEntity(UserType.PATIENT)
export class Patient extends User {
  @Column({ unique: true })
  cpf: string;

  @Column({ type: 'date' })
  birthDate: Date;
}