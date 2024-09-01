import { ApiProperty } from '@nestjs/swagger';



export class updateCrossCuttingReq {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    title: string;
    @ApiProperty()
    description: string;
}
