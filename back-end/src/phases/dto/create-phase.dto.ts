export enum phaseStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export class CreatePhaseDto {
  id: number;

  name: string;

  reportingYear: number;

  tocPhase: string;

  startDate: string;

  endDate: string;

  status: phaseStatus;

  show_eoi: boolean;

}
