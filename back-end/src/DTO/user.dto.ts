import { ApiProperty } from '@nestjs/swagger';


export class createUserReq {
    @ApiProperty()
    email: string;
    @ApiProperty()
    first_name: string;
    @ApiProperty()
    last_name: string;
    @ApiProperty()
    role: string;
}

export class createUserRes extends  createUserReq {
    @ApiProperty()
    id: number;
}

export class deleteUserReq {
    @ApiProperty()
    id: number;
}


export class exportUsers {
    @ApiProperty()
    id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    full_name: string;
    @ApiProperty()
    role: string;
}