import { ApiProperty } from '@nestjs/swagger';
import { Initiative } from 'src/entities/initiative.entity';

export class importInitiatives {
    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    short_name: string;
    @ApiProperty()
    official_code: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    status: string
    @ApiProperty()
    stageId: number;
    @ApiProperty()
    description: string;
    @ApiProperty()
    action_area_id: number;
    @ApiProperty()
    action_area_description: string;
    @ApiProperty()
    stages: Array<stages>
}

export class stages {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initvStgId: number;
    @ApiProperty()
    stageId: number;
    @ApiProperty()
    active: boolean;
    
}

export class importInitiativeswp {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    initiative_offical_code: string;
    @ApiProperty()
    stage_id: number;
    @ApiProperty()
    initiative_status: boolean;
    @ApiProperty()
    wp_official_code: number;
    @ApiProperty()
    wp_id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    results: string;
    @ApiProperty()
    pathway_content: string;
    @ApiProperty()
    is_global: boolean;
    @ApiProperty()
    status: boolean;
    @ApiProperty()
    countries: [
    {
    id: number;
    iso_alpha_2: string;
    name: string
    }
    ];
    @ApiProperty()
    regions: [
    {
        id: number;
        name: string
    }
    ]
}


export class getInitiatives {

    @ApiProperty()
    id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    active: boolean;
    @ApiProperty()
    status: boolean;
    @ApiProperty()
    stageId: number;
    @ApiProperty()
    short_name: string;
    @ApiProperty()
    description: string;
    @ApiProperty()
    official_code: string
    @ApiProperty()
    action_area_id: number;
    @ApiProperty()
    action_area_description: string
    @ApiProperty()
    last_update_at: Date;
    @ApiProperty()
    last_submitted_at: Date;
    @ApiProperty()
    latest_submission_id: number;
}


export class createRoleResponse {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    id: number;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    role: string;
    @ApiProperty()
    organizations: string;
    @ApiProperty()
    updatedAt: Date;
    @ApiProperty()
    createdAt: Date;
}

export class createRoleReq {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    role: string;
    @ApiProperty()
    organizations: string;
}




export class updateRoleReq {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    role: string;
    @ApiProperty()
    organizations: string;
}


export class updateRoleResponse {
    @ApiProperty()
    id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    role: string;
    @ApiProperty()
    organizations: string;
    @ApiProperty()
    updatedAt: Date;
}















export class  Centerstatus {
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    organization_code: number;
    @ApiProperty()
    phase_id: number;
    @ApiProperty()
    status: boolean;
  }
  export class  Latestsubmission {
    @ApiProperty()
    id: number;
    @ApiProperty()
    toc_data: Tocdatum[];
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    created_at: string;
    @ApiProperty()
    status: string;
    @ApiProperty()
    status_reason?: any;
  }
  export class  Typeofoutput {
    @ApiProperty()
    name: string;
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }

  export class  Responsibleorganization {
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

  export class  Ostwp {
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
  export class  Tocdatum {
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
    pathways: (Pathway | Pathways2)[];
    @ApiProperty()
    indicators?: Indicator[];
    @ApiProperty()
    partners?: Partner[];
    @ApiProperty()
    responsible_organization?: Responsibleorganization;
    @ApiProperty()
    scientific_methods: Scientificmethod[];
    @ApiProperty()
    category: string;
    @ApiProperty()
    research_questions: Scientificmethod[];
    @ApiProperty()
    isInternalFlow: boolean;
    @ApiProperty()
    country?: Country2[];
    @ApiProperty()
    is_actor_a_partner?: boolean;
    @ApiProperty()
    type_of_outcome?: Typeofoutput;
    @ApiProperty()
    location?: string;
    @ApiProperty()
    region?: any[];
    @ApiProperty()
    actor_type_of_change?: string[] | string;
    @ApiProperty()
    reviewer_comments?: string;
    @ApiProperty()
    ost_wp?: Ostwp;
    @ApiProperty()
    image?: string;
    @ApiProperty()
    stakeholder_comments?: string;
    @ApiProperty()
    flow_type?: string;
    @ApiProperty()
    wp_type?: string;
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

  export class  Country2 {
    @ApiProperty()
    code: number;
    @ApiProperty()
    isoAlpha2: string;
    @ApiProperty()
    isoAlpha3: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    toc_id: string;
  }
  export class  Scientificmethod {
    @ApiProperty()
    id: string;
    @ApiProperty()
    value: string;
  }

  export class  Partner {
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
  export class  Baseline {
    @ApiProperty()
    value: string;
    @ApiProperty()
    date: string;
  }

  export class  Type {
    @ApiProperty()
    value: string;
    @ApiProperty()
    name: string;
  }
  export class  Indicator {
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
    target: Baseline[];
    @ApiProperty()
    country?: Country[];
  }
  export class  Country {
    @ApiProperty()
    toc_id: string;
    @ApiProperty()
    code: number;
    @ApiProperty()
    isoAlpha2: string;
    @ApiProperty()
    isoAlpha3: string;
    @ApiProperty()
    name: string;
    @ApiProperty()
    regionDTO: string;
  }


  export class  Pathways2 {
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
  export class  Pathway {
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

  export class  Role {
    @ApiProperty()
    id: number;
    @ApiProperty()
    email: string;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    role: string;
    @ApiProperty()
    createdAt: string;
    @ApiProperty()
    updatedAt: string;
  }









export class  initiativeFull {
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
    @ApiProperty()
    roles: Role[];
    @ApiProperty()
    latest_submission: Latestsubmission;
    @ApiProperty()
    center_status: Centerstatus[];
  }


  export class allowedToAccessChat {
    @ApiProperty()
    allowed: boolean
  }



  export class  Period {
    @ApiProperty()
    id: number;
    @ApiProperty()
    year: number;
    @ApiProperty()
    quarter: string;
  }

  export class  Workpackage {
    @ApiProperty()
    wp_id: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    acronym: string;
    @ApiProperty()
    results?: any;
    @ApiProperty()
    stage_id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    pathway_content: string;
    @ApiProperty()
    wp_official_code: string;
    @ApiProperty()
    initiative_status: string;
    @ApiProperty()
    initiative_offical_code: string;
  }
  export class  Organization {
    @ApiProperty()
    code: number;
    @ApiProperty()
    name: string;
    @ApiProperty()
    acronym: string;
  }
  export class Initiatives {
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
  export class  User {
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
  export class  getInitHistoryResponse {
    @ApiProperty()
    id: number;
    @ApiProperty()
    item_name: string;
    @ApiProperty()
    resource_property: string;
    @ApiProperty()
    old_value: string;
    @ApiProperty()
    new_value: string;
    @ApiProperty()
    user_id: number;
    @ApiProperty()
    initiative_id: number;
    @ApiProperty()
    organization_id: number;
    @ApiProperty()
    wp_id: number;
    @ApiProperty()
    period_id: number;
    @ApiProperty()
    createdAt: string;
    @ApiProperty()
    user: User;
    @ApiProperty()
    initiative: Initiatives;
    @ApiProperty()
    organization: Organization;
    @ApiProperty()
    work_package: Workpackage;
    @ApiProperty()
    period: Period;
  }

