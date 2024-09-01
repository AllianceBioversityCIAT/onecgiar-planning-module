import { ApiProperty } from '@nestjs/swagger';



export class Ipsr {
    @ApiProperty()
    id: number;
    @ApiProperty()
    title: string;
    @ApiProperty()
    description: string;
}


export class findInitiative_id {
    @ApiProperty()
    id: string;
    @ApiProperty()
    ipsr_id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    value: number;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    ipsr: Ipsr;
    @ApiProperty()
    description: string;
}




export class createIpsrValue {
    @ApiProperty()
    value: number;
    @ApiProperty()
    initiative_id: number;
}
