import { ApiProperty } from '@nestjs/swagger';



export class updateIpsrReq {
    @ApiProperty()
    title: string;
    @ApiProperty()
    description: string;
}
