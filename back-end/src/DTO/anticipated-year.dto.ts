import { ApiProperty } from '@nestjs/swagger';





export class Phase2 {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    reportingYear: number;
    @ApiProperty()
    tocPhase: string;
    @ApiProperty()
    startDate: string;
    @ApiProperty()
    endDate: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    show_eoi: boolean;
  }
export class getAnticipatedYear {
    @ApiProperty()
    id: number;
    @ApiProperty()
    month: string;
    @ApiProperty()
    year: number;
    @ApiProperty()
    phase: Phase2;
  }



export class createAnticipatedYearReq {
    @ApiProperty()
    month: string;
    @ApiProperty()
    year: number;
    @ApiProperty()
    phase: number;
}

export class createAnticipatedYearRes extends  createAnticipatedYearReq{
    @ApiProperty()
    id: number;
}