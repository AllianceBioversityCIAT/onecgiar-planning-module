import { ApiProperty } from '@nestjs/swagger';

export class getCountriesRegions {
    @ApiProperty()
    code: string;
}


export class getRegions {
    @ApiProperty()
    name: string;

    @ApiProperty()
    um49Code: number;
}


export class getCountries {
    @ApiProperty()
    um49Code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    code: string;
    @ApiProperty()
    isoAlpha2: string;
    @ApiProperty()
    isoAlpha3: string;
    @ApiProperty()
    region: getRegions
}





export class getPartners {
    @ApiProperty()
    websiteLink: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    code: string;
    @ApiProperty()
    acronym: string;
}

export class getPartnersreq {
    @ApiProperty()
    term: string;
}






