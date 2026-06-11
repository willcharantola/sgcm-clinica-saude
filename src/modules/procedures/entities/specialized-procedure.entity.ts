import { ChildEntity, Column } from 'typeorm';
import {
  AuthorizationStatus,
  ComplexityLevel,
  Procedure,
  ProcedureType,
} from './procedure.entity';

@ChildEntity(ProcedureType.SPECIALIZED)
export class SpecializedProcedure extends Procedure {
  @Column({ nullable: true, type: 'text' })
  requiredEquipment: string;

  @Column({ type: 'varchar', default: ComplexityLevel.LOW })
  complexityLevel: ComplexityLevel;

  @Column({ type: 'boolean', default: false })
  requiresAuthorization: boolean;

  @Column({ type: 'varchar', default: AuthorizationStatus.PENDING })
  authorizationStatus: AuthorizationStatus;

  @Column({ nullable: true, type: 'datetime' })
  authorizedAt: Date;

  @Column({ nullable: true })
  authorizedById: number;

  @Column({ nullable: true, type: 'text' })
  denialReason: string;
}
