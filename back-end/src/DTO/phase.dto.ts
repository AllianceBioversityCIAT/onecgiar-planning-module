import { ApiProperty } from '@nestjs/swagger';
import { getCountriesRegions } from './organizations.dto';


export class createPhaseReq {
    @ApiProperty()
    name: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    endDate: Date;
    @ApiProperty()
    previousPhase: number;
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

export class createPhaseRes extends  createPhaseReq{
    @ApiProperty()
    id: number;
}


export class assignOrganizationsReq {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    phase_id: number;
    @ApiProperty()
    organizations: getCountriesRegions;
}

export class getPhases {
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
    @ApiProperty()
    previousPhase: createPhaseRes;
}


export class activateAndDeactivateAndDeleteReq {
    @ApiProperty()
    id: number;
}


export class getInitiativesPhase {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    initiative_name: string;
    @ApiProperty()
    initiative_active: boolean;
    @ApiProperty()
    initiative_status: string;
    @ApiProperty()
    initiative_stage_id: number;
    @ApiProperty()
    initiative_short_name: string;
    @ApiProperty()
    initiative_description: string;
    @ApiProperty()
    initiative_official_code: string;
    @ApiProperty()
    initiative_action_area_id: number;
    @ApiProperty()
    initiative_action_area_description: string;
    @ApiProperty()
    initiative_last_update_at: Date;
    @ApiProperty()
    initiative_last_submitted_at: Date;
    @ApiProperty()
    initiative_latest_submission_id: number;
    @ApiProperty()
    assigned_organizations: string;
}


export class getAssignedOrganizations {
    @ApiProperty()
    code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    acronym: string;

}



export class updatePhaseReq {
    @ApiProperty()
    name: string;
    @ApiProperty()
    endDate: Date;
    @ApiProperty()
    previousPhase: number;
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


export class getTocPhases {
    @ApiProperty()
    end_date: string;
    @ApiProperty()
    reporting_year: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    updating_date: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    start_date: string;
}
