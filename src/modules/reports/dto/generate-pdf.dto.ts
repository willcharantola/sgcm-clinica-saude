export class GeneratePdfDto {
  patientName: string;
  doctorName: string;
  doctorCrm: string;
  examType: string;
  result: string;
  examDate: Date;
  issuedAt: Date;
  validationCode: string;
}
