import { ApiProperty } from '@nestjs/swagger';

export class Phases {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    endDate: Date;
    @ApiProperty()
    reportingYear: number;
    @ApiProperty()
    show_eoi: boolean;
    @ApiProperty()
    startDate: Date;
    @ApiProperty()
    status: string;
    @ApiProperty()
    tocPhase: string;
}

export class createPeriodReq {
    @ApiProperty()
    phase: number;
    @ApiProperty()
    quarter: string;
    @ApiProperty()
    year: number;
}


export class deletePeriodReq {
    @ApiProperty()
    id: number;
}




export class createPeriodRes extends  createPeriodReq{
    @ApiProperty()
    id: number;
}


export class findAll {
    @ApiProperty()
    id: number;
    @ApiProperty()
    quarter: string;
    @ApiProperty()
    year: number; 
    @ApiProperty()
    phase: Phases;
}


export class findByPhaseId {
    @ApiProperty()
    id: number;
    @ApiProperty()
    quarter: string;
    @ApiProperty()
    year: number; 
}