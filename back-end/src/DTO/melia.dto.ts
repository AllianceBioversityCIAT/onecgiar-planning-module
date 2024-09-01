import { ApiProperty } from '@nestjs/swagger';


export class getMeliaTypes {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    availability: string;
    @ApiProperty()
    HideCrossCutting: boolean;
}



export class getImportMeliaTypes {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    description: string;
}



export class MeliaType {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    availability?: string;
    @ApiProperty()
    HideCrossCutting: boolean;
  }

  export class InitiativeMelia {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    melia_type_id: number;
    @ApiProperty()
    methodology: string;
    @ApiProperty()
    experimental: boolean;
    @ApiProperty()
    questionnaires: string;
    @ApiProperty()
    completion_year: string;
    @ApiProperty()
    management_decisions: string;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    meliaType: MeliaType;
  }

export class findInitiative_id {
    @ApiProperty()
    id: string;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    initiative_melia_id: number;
    @ApiProperty()
    contribution_results: string;
    @ApiProperty()
    geo_scope: string;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    initiativeMelia: InitiativeMelia;
  }



export class  getInitiativeMelias {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    melia_type_id: number;
    @ApiProperty()
    methodology: string;
    @ApiProperty()
    experimental: boolean;
    @ApiProperty()
    questionnaires: string;
    @ApiProperty()
    completion_year: string;
    @ApiProperty()
    management_decisions: string;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    meliaType: MeliaType;
  }






  export class  Otherinitiative {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    active: number;
    @ApiProperty()
    status: string;
    @ApiProperty()
    stageId: number;
    @ApiProperty()
    short_name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    official_code: string;
    @ApiProperty()
    action_area_id: string;
    @ApiProperty()
    action_area_description: string;
    @ApiProperty()
    last_update_at: string;
    @ApiProperty()
    last_submitted_at: string;
    @ApiProperty()
    latest_submission_id: number;
}


export class  getInitiativeMeliaById {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    melia_type_id: number;
    @ApiProperty()
    methodology: string;
    @ApiProperty()
    experimental: boolean;
    @ApiProperty()
    questionnaires: string;
    @ApiProperty()
    completion_year: string;
    @ApiProperty()
    management_decisions: string;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    meliaType: MeliaType;
    @ApiProperty()
    other_initiatives: Otherinitiative;
}




export class Partner {
    @ApiProperty()
    code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    websiteLink: string;
  }

  export class Initiativecountry {
    @ApiProperty()
    code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    isoAlpha2: string;
    @ApiProperty()
    isoAlpha3: string;
  }

  export class Initiativeregion {
    @ApiProperty()
    um49Code: number;
    @ApiProperty()
    name: string;
  }


export class findOne {
    @ApiProperty()
    id: string;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    initiative_melia_id: number;
    @ApiProperty()
    contribution_results: string;
    @ApiProperty()
    geo_scope: string;
    @ApiProperty()
    submission_id: number;
    @ApiProperty()
    partners: Partner;
    @ApiProperty()
    initiative_countries: Initiativecountry;
    @ApiProperty()
    initiative_regions: Initiativeregion;
    @ApiProperty()
    co_initiative_countries: Initiativecountry;
    @ApiProperty()
    co_initiative_regions: Initiativeregion;
  }





  export class Initiativecountry2 {
    @ApiProperty()
    code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    isoAlpha2: string;
    @ApiProperty()
    isoAlpha3: string;
    @ApiProperty()
    region: Initiativeregion;
  }


  export class updateMeliaReq {
    @ApiProperty()
    initiative_id: string;
    @ApiProperty()
    wp_id: number;
    @ApiProperty()
    initiative_melia_id: number;
    @ApiProperty()
    geo_scope: string;
    @ApiProperty()
    initiative_regions: Initiativeregion;
    @ApiProperty()
    initiative_countries: Initiativecountry2;
    @ApiProperty()
    partners: Partner;
    @ApiProperty()
    co_initiative_regions: Initiativeregion;
    @ApiProperty()
    co_initiative_countries: Initiativecountry2;
    @ApiProperty()
    contribution_results: string;
  }


  export class updateMeliaRes extends updateMeliaReq {
    @ApiProperty()
    id: string;
    @ApiProperty()
    submission_id?: number;
  }
 












  export class updateInitiativeMeliaReq {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    melia_type_id: number;
    @ApiProperty()
    methodology: string;
    @ApiProperty()
    experimental: boolean;
    @ApiProperty()
    questionnaires: string;
    @ApiProperty()
    completion_year: string;
    @ApiProperty()
    management_decisions: string;
    @ApiProperty()
    other_initiatives: Otherinitiative;
  }



export class updateInitiativeMeliaRes extends updateInitiativeMeliaReq {
    @ApiProperty()
    id: number
  }



  export class createInitiativeMeliaRes extends updateInitiativeMeliaRes {
    @ApiProperty()
    submission_id: number
  }





  export class  Partner2 {
    @ApiProperty()
    code: number;
    @ApiProperty()
    websiteLink: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    added?: string;
    @ApiProperty()
    creation_date?: Date;
    @ApiProperty()
    id?: string;
  }



  export class  createMeliaReq {
    @ApiProperty()
    initiative_id: string;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    initiative_melia_id: number;
    @ApiProperty()
    geo_scope: string;
    @ApiProperty()
    initiative_regions: Initiativeregion;
    @ApiProperty()
    initiative_countries: Initiativecountry2;
    @ApiProperty()
    partners: Partner2;
    @ApiProperty()
    co_initiative_regions: Initiativeregion;
    @ApiProperty()
    co_initiative_countries: Initiativecountry2;
    @ApiProperty()
    contribution_results: string;
  }










  export class createMeliaRes {
    @ApiProperty()
    initiative_id: string;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    initiative_melia_id: number;
    @ApiProperty()
    contribution_results: string;
    @ApiProperty()
    geo_scope: string;
    @ApiProperty()
    partners: Partner;
    @ApiProperty()
    initiative_regions: Initiativeregion;
    @ApiProperty()
    co_initiative_regions: Initiativeregion;
    @ApiProperty()
    initiative_countries: Initiativecountry2;
    @ApiProperty()
    co_initiative_countries: Initiativecountry2;
    @ApiProperty()
    submission_id?: number;
    @ApiProperty()
    id: string;
  }