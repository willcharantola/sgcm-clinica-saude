// src/modules/users/entities/admin.entity.ts
import { ChildEntity, Column } from 'typeorm';
import { User, UserType } from './user.entity';

@ChildEntity(UserType.ADMIN)
export class Admin extends User {
  @Column({ nullable: true })
  accessLevel: string;
}