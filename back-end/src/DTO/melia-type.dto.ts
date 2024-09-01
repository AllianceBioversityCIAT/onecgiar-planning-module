import { ApiProperty } from '@nestjs/swagger';



export class createMeliaTypeReq {
    @ApiProperty()
    name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    availability: string;
    @ApiProperty()
    HideCrossCutting: boolean;
}

