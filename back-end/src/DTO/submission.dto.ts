import { ApiProperty } from '@nestjs/swagger';
import { Phases } from './period.dto';
import { createUserRes } from './user.dto';


export class updateStatus {
    @ApiProperty()
    status_reason: string;
    @ApiProperty()
    status: string;
}


export class saveReq {
    @ApiProperty()
    phase_id: number;
}













export class Ostwp {
    @ApiProperty()
    initvStgId: number;
    @ApiProperty()
    regions: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    is_global: number;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    active: string;
    @ApiProperty()
    countries: string;
    @ApiProperty()
    initiativeId: number;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    wp_official_code: number;
    @ApiProperty()
    pathway_content: string;
    @ApiProperty()
    updated_at: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    id: number;
    @ApiProperty()
    stageId: number;
  }
  export class Scientificmethod {
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }
  export class Responsibleorganization {
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
  }
  export class Partner {
    @ApiProperty()
    code?: number | number;
    @ApiProperty()
    websiteLink: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    added?: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    creation_date?: string;
    @ApiProperty()
    id?: string;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    add_source?: string;
  }
  export class Baseline {
    @ApiProperty()
    value: string;
    @ApiProperty()
    date: string;
  }
  export class Type {
    @ApiProperty()
    value: string;
    @ApiProperty()
    name: string;
  }
  export class Indicator {
    @ApiProperty()
    unit_of_measurement: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    data_collection_source: string;
    @ApiProperty()
    baseline: Baseline;
    @ApiProperty()
    id: string;
    @ApiProperty()
    data_collection_frequency: string;
    @ApiProperty()
    type: Type;
    @ApiProperty()
    data_collection_method: string;
    @ApiProperty()
    target: Baseline;
  }

 
  export class Pathways2 {
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    image: string;
    @ApiProperty()
    color: string;
    @ApiProperty()
    specification: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    updating_date: string;
    @ApiProperty()
    title: string;
    @ApiProperty()
    example: string;
  }
  export class Pathway {
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    image: string;
    @ApiProperty()
    color: string;
    @ApiProperty()
    specification: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    updating_date: string;
    @ApiProperty()
    title: string;
  }
  export class Typeofoutput {
    @ApiProperty()
    name: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }







export class TocData {
    @ApiProperty()
    description?: string;
    @ApiProperty()
    title: string;
    @ApiProperty()
    flow_id: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    group?: string;
    @ApiProperty()
    type_of_output?: Typeofoutput;
    @ApiProperty()
    pathways: (Pathway | Pathways2);
    @ApiProperty()
    indicators?: Indicator;
    @ApiProperty()
    partners?: Partner;
    @ApiProperty()
    responsible_organization?: Responsibleorganization;
    @ApiProperty()
    scientific_methods: Scientificmethod;
    @ApiProperty()
    category: string;
    @ApiProperty()
    research_questions: Scientificmethod;
    @ApiProperty()
    isInternalFlow: boolean;
    @ApiProperty()
    country?: any;
    @ApiProperty()
    is_actor_a_partner?: boolean;
    @ApiProperty()
    type_of_outcome?: Typeofoutput;
    @ApiProperty()
    location?: string;
    @ApiProperty()
    region?: any;
    @ApiProperty()
    actor_type_of_change?: string | string;
    @ApiProperty()
    reviewer_comments?: string;
    @ApiProperty()
    ost_wp?: Ostwp;
    @ApiProperty()
    image?: string;
    @ApiProperty()
    stakeholder_comments?: string;
    @ApiProperty()
    work_package_toc?: string;
    @ApiProperty()
    isGroup?: boolean;
    @ApiProperty()
    actor_type?: string;
    @ApiProperty()
    measure_of_success_minimum?: string;
    @ApiProperty()
    measure_of_success_moderate?: string;
    @ApiProperty()
    measure_of_success_maximum?: string;
  }



export class  saveResponse {
    @ApiProperty()
    id: number;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    status_reason?: string;
    @ApiProperty()
    user: createUserRes;
    @ApiProperty()
    phase: Phases;
    @ApiProperty()
    toc_data: TocData
}

export class updateCenterStatusReq {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    organization_code: string;
    @ApiProperty()
    status: boolean;
    @ApiProperty()
    phase_id: number;
}
export class updateCenterStatusRes {
    @ApiProperty()
    message: string;
}


export class updateLatestSubmitionStatus {
  @ApiProperty()
  status: string;
}



export class  save_result_values_req {
    @ApiProperty()
    partner_code: number;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    item_id: string;
    @ApiProperty()
    percent_value: string;
    @ApiProperty()
    budget_value: number;
    @ApiProperty()
    no_budget: boolean;
    @ApiProperty()
    phase_id: number;
  }



  export class saveWpBudgetReq {
    @ApiProperty()
    partner_code: number;
    @ApiProperty()
    wp_id: string;
    @ApiProperty()
    budget: string;
    @ApiProperty()
    phaseId: number;
  }

  export class wp_official {
    @ApiProperty()
    wp_official_code: []
  }
  export class getWpBudgets {
    @ApiProperty()
    organization_code: wp_official;
  }




export class getSaved {
    @ApiProperty()
    perValues: wp_official;
    @ApiProperty()
    values: wp_official;
    @ApiProperty()
    no_budget: wp_official;
}




export class Result {
    @ApiProperty()
    id: number;
    @ApiProperty()
    toc_data: TocData;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    status_reason?: string;
    @ApiProperty()
    user: createUserRes;
    @ApiProperty()
    phase: Phases;
  }


export class getAll {
    @ApiProperty()
    result: Result;
    @ApiProperty()
    count: number;
}














export class  Data {
    @ApiProperty()
    text: string;
  }


export class  Nodetype {
    @ApiProperty()
    color: string;
    @ApiProperty()
    category: string;
    @ApiProperty()
    title: string;
    @ApiProperty()
    text?: string;
    @ApiProperty()
    data?: Data;
  }


  export class  ActionArea {
    @ApiProperty()
    clarisa_id: number;
    @ApiProperty()
    image: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: number;
    @ApiProperty()
    title: string;
    @ApiProperty()
    toc_id: string;
  }

  export class  Initiative {
    @ApiProperty()
    initvStgId: number;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    inInit: number;
    @ApiProperty()
    description: string;
    @ApiProperty()
    active: number;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    action_area_id: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    official_code: string;
    @ApiProperty()
    id: number;
    @ApiProperty()
    action_area_description: string;
    @ApiProperty()
    stageId: number;
    @ApiProperty()
    status: string;
  }


  export class  Creator {
    @ApiProperty()
    toc_role: string;
    @ApiProperty()
    last_name: string;
    @ApiProperty()
    creation_date?: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    updating_date?: string;
    @ApiProperty()
    first_name: string;
    @ApiProperty()
    email: string;
    @ApiProperty()
    country?: string;
    @ApiProperty()
    role?: string;
    @ApiProperty()
    city?: string;
    @ApiProperty()
    application_is_authenticated?: number;
    @ApiProperty()
    client_id?: number;
    @ApiProperty()
    profile_id?: number;
    @ApiProperty()
    organization?: string;
    @ApiProperty()
    land_line?: string;
    @ApiProperty()
    organization_type?: string;
    @ApiProperty()
    main_phone?: string;
    @ApiProperty()
    fax?: string;
    @ApiProperty()
    photo?: string;
    @ApiProperty()
    skype_id?: string;
    @ApiProperty()
    positions?: string;
    @ApiProperty()
    user_id?: number;
    @ApiProperty()
    info_visibility?: number;
  }


  export class  Datum {
    @ApiProperty()
    node_types: Nodetype;
    @ApiProperty()
    Funder: any;
    @ApiProperty()
    diagram_image: string;
    @ApiProperty()
    publish_reason: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    title: string;
    @ApiProperty()
    type: string;
    @ApiProperty()
    cgiar_project: boolean;
    @ApiProperty()
    approved: boolean;
    @ApiProperty()
    version_title: string;
    @ApiProperty()
    initiative_id?: number;
    @ApiProperty()
    enable_participatory_development_board?: boolean;
    @ApiProperty()
    Team: any;
    @ApiProperty()
    id: string;
    @ApiProperty()
    status_reason: string;
    @ApiProperty()
    related_node_id: string;
    @ApiProperty()
    latest: boolean;
    @ApiProperty()
    phase: string;
    @ApiProperty()
    creator?: Creator;
    @ApiProperty()
    initiative?: Initiative;
    @ApiProperty()
    project_state: string;
    @ApiProperty()
    narrative: string;
    @ApiProperty()
    ActionArea: ActionArea;
    @ApiProperty()
    nodeDataArray: any;
    @ApiProperty()
    archive: boolean;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    version: number;
    @ApiProperty()
    related_flow_id: string;
    @ApiProperty()
    organization_id: string;
    @ApiProperty()
    organization: any;
    @ApiProperty()
    updating_date?: string;
    @ApiProperty()
    status: string;
  }




  export class  getTocs {
    @ApiProperty()
    page: string;
    @ApiProperty()
    pageCount: number;
    @ApiProperty()
    limit: string;
    @ApiProperty()
    total: number;
    @ApiProperty()
    data: Datum;
  }

































  export class PerValues {
}
export class Consolidated {
    @ApiProperty()
    perValues: PerValues;
    @ApiProperty()
    values: PerValues;
    @ApiProperty()
    no_budget: PerValues;
  }

export class Init {
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
  export class Period {
    @ApiProperty()
    id: number;
    @ApiProperty()
    year: number;
    @ApiProperty()
    quarter: string;
  }
export class Phase {
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
    @ApiProperty()
    periods: Period;
  }

export class User {
    @ApiProperty()
    id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    first_name: string;
    @ApiProperty()
    last_name: string;
    @ApiProperty()
    role: string;
    @ApiProperty()
    full_name: string;
  }
  export class Responsibleorganizations {
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
  }

  export class Scientificmethods {
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }
  export class Ostw {
    @ApiProperty()
    initvStgId: number;
    @ApiProperty()
    regions: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    is_global: number;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    active: string;
    @ApiProperty()
    countries: string;
    @ApiProperty()
    initiativeId: number;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    wp_official_code: number;
    @ApiProperty()
    pathway_content: string;
    @ApiProperty()
    updated_at: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    id: number;
    @ApiProperty()
    stageId: number;
  }
export class Tocdatum {
    @ApiProperty()
    description?: string;
    @ApiProperty()
    title: string;
    @ApiProperty()
    flow_id: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    group?: string;
    @ApiProperty()
    type_of_output?: Typeofoutput;
    @ApiProperty()
    pathways: any;
    @ApiProperty()
    indicators?: (Indicators | Indicators2 | Indicators3);
    @ApiProperty()
    partners?: any;
    @ApiProperty()
    responsible_organization?: Responsibleorganizations;
    @ApiProperty()
    scientific_methods: Scientificmethods;
    @ApiProperty()
    category: string;
    @ApiProperty()
    research_questions: Scientificmethods;
    @ApiProperty()
    country?: any;
    @ApiProperty()
    is_actor_a_partner?: boolean;
    @ApiProperty()
    type_of_outcome?: Typeofoutput;
    @ApiProperty()
    location?: string;
    @ApiProperty()
    region?: any;
    @ApiProperty()
    actor_type_of_change?: string | string;
    @ApiProperty()
    opacity?: number;
    @ApiProperty()
    reviewer_comments?: string;
    @ApiProperty()
    ost_wp?: Ostw;
    @ApiProperty()
    image?: string;
    @ApiProperty()
    stakeholder_comments?: string;
    @ApiProperty()
    work_package_toc?: string;
    @ApiProperty()
    isGroup?: boolean;
    @ApiProperty()
    actor_type?: string;
    @ApiProperty()
    measure_of_success_minimum?: string;
    @ApiProperty()
    measure_of_success_moderate?: string;
    @ApiProperty()
    measure_of_success_maximum?: string;
  }


export class Indicators3 {
    @ApiProperty()
    unit_of_measurement: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    data_collection_source: string;
    @ApiProperty()
    baseline: Baseline;
    @ApiProperty()
    id: string;
    @ApiProperty()
    data_collection_frequency: string;
    @ApiProperty()
    type: Type;
    @ApiProperty()
    data_collection_method: string;
    @ApiProperty()
    target: Baseline;
  }
 export class Indicators2 {
    @ApiProperty()
    country: any;
    @ApiProperty()
    unit_of_measurement: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    data_collection_source: string;
    @ApiProperty()
    baseline: Baseline;
    @ApiProperty()
    id: string;
    @ApiProperty()
    type: Type;
    @ApiProperty()
    data_collection_frequency: string;
    @ApiProperty()
    region: any;
    @ApiProperty()
    data_collection_method: string;
    @ApiProperty()
    target: Baseline;
  }
export class Indicators {
    @ApiProperty()
    unit_of_measurement: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    data_collection_source: string;
    @ApiProperty()
    baseline: Baseline;
    @ApiProperty()
    id: string;
    @ApiProperty()
    data_collection_frequency: string;
    @ApiProperty()
    type: Type;
    @ApiProperty()
    data_collection_method: string;
    @ApiProperty()
    target: Baseline;
  }














export class getbyid {
    @ApiProperty()
    id: number;
    @ApiProperty()
    toc_data: Tocdatum;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    status_reason?: any;
    @ApiProperty()
    user: User;
    @ApiProperty()
    phase: Phase;
    @ApiProperty()
    initiative: Init;
    @ApiProperty()
    results: any;
    @ApiProperty()
    consolidated: Consolidated;
  }










  export class  Typeofoutput1 {
    @ApiProperty()
    name: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }
  export class  Responsibleorganization1 {
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
  }
  export class  Scientificmethod1 {
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    related_node_id: string;
    @ApiProperty()
    value: string;
  }
  export class  Partner1 {
    @ApiProperty()
    code?: number;
    @ApiProperty()
    websiteLink: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    creation_date?: string;
    @ApiProperty()
    add_source?: string;
  }
  export class  Type1 {
    @ApiProperty()
    value: string;
    @ApiProperty()
    name: string;
  }
  export class  Baseline1 {
    @ApiProperty()
    value: string;
    @ApiProperty()
    date: string;
  }
  export class  Indicator1 {
    @ApiProperty()
    country: any[];
    @ApiProperty()
    description: string;
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    baseline: Baseline1;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    type: Type1;
    @ApiProperty()
    target: Baseline1[];
    @ApiProperty()
    unit_of_measurement: string;
    @ApiProperty()
    location: string;
    @ApiProperty()
    data_collection_source: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    data_collection_frequency: string;
    @ApiProperty()
    region: any[];
    @ApiProperty()
    related_node_id: string;
    @ApiProperty()
    data_collection_method: string;
  }
  export class  Pathway1 {
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    image: string;
    @ApiProperty()
    color: string;
    @ApiProperty()
    specification: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    creation_date: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    updating_date: string;
    @ApiProperty()
    title: string;
    @ApiProperty()
    related_node_id: string;
    @ApiProperty()
    example: string;
  }

  export class  getTocData {
    @ApiProperty()
    isInternalFlow: boolean;
    @ApiProperty()
    description: string;
    @ApiProperty()
    main: boolean;
    @ApiProperty()
    title: string;
    @ApiProperty()
    flow_id: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    group: string;
    @ApiProperty()
    type_of_output: Typeofoutput1;
    @ApiProperty()
    pathways: Pathway1[];
    @ApiProperty()
    indicators: Indicator1[];
    @ApiProperty()
    partners: Partner1[];
    @ApiProperty()
    responsible_organization: Responsibleorganization1;
    @ApiProperty()
    scientific_methods: Scientificmethod1[];
    @ApiProperty()
    category: string;
    @ApiProperty()
    research_questions: Scientificmethod1[];
  }


 

 