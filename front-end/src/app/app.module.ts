import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { SatPopoverModule } from "@ncstate/sat-popover";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { MatCardModule } from "@angular/material/card";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { MatChipsModule } from "@angular/material/chips";

import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatInputModule } from "@angular/material/input";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AppSocket } from "./socket.service";
import { InQuePipe } from "./inQue.pipe";
import { SubmissionComponent } from "./submission/submission.component";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDialogModule } from "@angular/material/dialog";
import { MatMenuModule } from "@angular/material/menu";
import { ConfirmComponent } from "./confirm/confirm.component";
import { CrossCuttingComponent } from "./submission/cross-cutting/cross-cutting.component";
import { ViewDataComponent } from "./submission/view-data/view-data.component";
import { NgxJsonViewerModule } from "ngx-json-viewer";
import { InitiativesComponent } from "./initiatives/initiatives.component";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatPaginatorModule } from "@angular/material/paginator";
import { TeamMembersComponent } from "./team-members/team-members.component";
import { NewTeamMemberComponent } from "./components/new-team-member/new-team-member.component";
import { NgSelectModule } from "@ng-select/ng-select";
import { MatSelectModule } from "@angular/material/select";
import { ToastrModule } from "ngx-toastr";
import { PhasesComponent } from "./admin/phases/phases.component";
import { PhaseDialogComponent } from "./admin/phases/phase-dialog/phase-dialog.component";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { PeriodsComponent } from "./admin/periods/periods.component";
import { PeriodDialogComponent } from "./admin/periods/period-dialog/period-dialog.component";
import { UsersComponent } from "./admin/users/users.component";
import { UserDialogComponent } from "./admin/users/user-dialog/user-dialog.component";
import { AuthComponent } from "./auth/auth.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { SubmitedVersionsComponent } from "./submited-versions/submited-versions.component";
import { SubmitedVersionComponent } from "./submited-versions/submited-version/submited-version.component";
import { HttpHeaderService } from "./services/http-header.service";
import { AdminComponent } from "./admin/admin.component";
import { AdminNavbarComponent } from "./admin/admin-navbar/admin-navbar.component";
import { MatToolbarModule } from "@angular/material/toolbar";
import { StatusComponent } from "./submited-versions/status/status.component";
import { IpsrComponent } from "./submission/ipsr/ipsr.component";
import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { CenterStatusComponent } from "./submission/center-status/center-status.component";
import { OrganizationsComponent } from "./admin/organizations/organizations.component";
import { OrganizationDialogComponent } from "./admin/organizations/organization-dialog/organization-dialog.component";
import { AdminIpsrComponent } from "./admin/ipsr/admin-ipsr.component";
import { IpsrDialogComponent } from "./admin/ipsr/ipsr-dialog/ipsr-dialog.component";
import { PhaseInitiativesComponent } from "./admin/phases/phase-initiatives/phase-initiatives.component";
import { AssignOrganizationsComponent } from "./assign-organizations/assign-organizations.component";
import { SpinnerComponent } from "./spinner/spinner.component";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { LoadingInterceptor } from "./loading.interceptor";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatRadioModule } from "@angular/material/radio";
import { AccessDeniedComponent } from "./access-denied/access-denied.component";
import { DeleteConfirmDialogComponent } from "./delete-confirm-dialog/delete-confirm-dialog.component";
import { SearchInitComponent } from "./search-init/search-init.component";
import { FilterVersionComponent } from "./submited-versions/filter-version/filter-version.component";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ParametersSettingsComponent } from "./admin/parameters-settings/parameters-settings.component";
// import { AnticipatedYearComponent } from "./admin/anticipated-year/anticipated-year.component";
import { AnticipatedYearDialogComponent } from "./admin/anticipated-year/anticipated-year-dialog/anticipated-year-dialog.component";
import { OrderSelectPipePipe } from "./components/order-select-pipe.pipe";
import { PopoverModule } from "./share/popover/popover.module";
import { PopoverManagementComponent } from "./admin/popover-management/popover-management.component";
import { PopoverDialogComponent } from "./admin/popover-management/popover-dialog/popover-dialog.component";
import { EditorModule } from "./share/editor/editor.module";
// import { EditorModules,TINYMCE_SCRIPT_SRC } from "@tinymce/tinymce-angular";
// import { NgxEditorModule } from "ngx-editor";
import { TrustHTMLModule } from "./share/trust-html/trust-html.module";
import { SortPipe } from "./share/pipes/sort.pipe";
import { EmailsComponent } from "./admin/emails/emails.component";
import { EmailBodyComponent } from "./admin/emails/email-body/email-body.component";
import { ChatModule } from "./share/chat/chat.module";
import { TimeagoModule } from "ngx-timeago";
import { CustomMessageComponent } from "./custom-message/custom-message.component";
import { TrackPORBsComponent } from "./admin/track-porbs/track-porbs.component";
import { HighchartsChartModule } from "highcharts-angular";
import { HistoryOfChangeComponent } from './submission/history-of-change/history-of-change.component';
import { UnderMaintenancePageComponent } from "./under-maintenance-page/under-maintenance-page.component";
import { EditUnderMaintenanceComponent } from "./admin/parameters-settings/edit-under-maintenance/edit-under-maintenance.component";
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { TotalInitSummaryComponent } from './admin/total-init-summary/total-init-summary.component';
import { SyncInitComponent } from './admin/sync-init/sync-init.component';
import { ArchivedComponent } from './admin/archived/archived.component';
import { ArchiveComponent } from './archive/archive.component';
import { SubmittedVersionComponent } from './archive/submitted-version/submitted-version.component';
import { TeamMemberComponent } from './archive/team-member/team-member.component';
import { TableComponent } from './archive/table/table.component';
import { VersionComponent } from './archive/version/version.component';
import { GrantedAccessPipePipe } from './team-members/granted-access-pipe.pipe';
import { CenterValidateComponent } from './submission/center-validate/center-validate.component';
import { QualitativeIndicatorsComponent } from './submission/qualitative-indicators/qualitative-indicators.component';
import { BudgetAssumptionsComponent } from './submission/budget-assumptions/budget-assumptions.component';
import { BudgetAssumptionSummaryComponent } from './submission/budget-assumption-summary/budget-assumption-summary.component';
import { GeographicLocationComponent } from './submission/geographic-location/geographic-location.component';
import { StickyOnScrollDirective } from "./sticky-on-scroll.directive";
import { SubmitMessageComponent } from './submission/submit-message/submit-message.component';
import { ExportComponent } from './admin/export/export.component';
import { OnlineUsersComponent } from './admin/online-users/online-users.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PorbComponent } from "./porb/porb.component";
import { PorbOverviewComponent } from "./porb/components/porb-overview/porb-overview.component";
import { PoolSectionComponent } from "./porb/components/porb-budget-sections/sections/pool/pool-section.component";
import { PartnersSectionComponent } from "./porb/components/porb-budget-sections/sections/partners/partners-section.component";
import { W3SectionComponent } from "./porb/components/porb-budget-sections/sections/w3/w3-section.component";
import { MeliaSectionComponent } from "./porb/components/porb-budget-sections/sections/melia/melia-section.component";
import { AnaplanSectionComponent } from "./porb/components/porb-budget-sections/sections/anaplan/anaplan-section.component";
import { BudgetAndAssumptionComponent } from "./porb/components/porb-budget-sections/shared/budget-and-assumption/budget-and-assumption.component";
import { CrossSectionComponent } from "./porb/components/porb-budget-sections/sections/cross/cross-section.component";
import { CrossAddDialogComponent } from "./porb/components/porb-budget-sections/sections/cross/cross-add-dialog.component";
import { ClearBudgetConfirmDialogComponent } from "./porb/components/porb-budget-sections/shared/clear-budget-confirm-dialog.component";
import { PorbTourComponent } from "./porb/components/porb-tour/porb-tour.component";
import { StanderdCrossCuttingComponent } from "./admin/standerd-cross-cutting/standerd-cross-cutting.component";
import { StanderdCrossCuttingDialogComponent } from "./admin/standerd-cross-cutting/standerd-cross-cutting-dialog/standerd-cross-cutting-dialog.component";


@NgModule({
  declarations: [
    AppComponent,
    InQuePipe,
    SubmissionComponent,
    ConfirmComponent,
    CrossCuttingComponent,
    ViewDataComponent,
    InitiativesComponent,
    PhasesComponent,
    PhaseDialogComponent,
    TeamMembersComponent,
    NewTeamMemberComponent,
    PeriodsComponent,
    PeriodDialogComponent,
    UsersComponent,
    UserDialogComponent,
    AuthComponent,
    SubmitedVersionsComponent,
    SubmitedVersionComponent,
    AdminComponent,
    AdminNavbarComponent,
    StatusComponent,
    IpsrComponent,
    HeaderComponent,
    FooterComponent,
    CenterStatusComponent,
    OrganizationsComponent,
    OrganizationDialogComponent,
    AdminIpsrComponent,
    IpsrDialogComponent,
    PhaseInitiativesComponent,
    AssignOrganizationsComponent,
    SpinnerComponent,
    AccessDeniedComponent,
    DeleteConfirmDialogComponent,
    SearchInitComponent,
    FilterVersionComponent,
    ParametersSettingsComponent,
    // AnticipatedYearComponent,
    AnticipatedYearDialogComponent,
    OrderSelectPipePipe,
    PopoverManagementComponent,
    PopoverDialogComponent,
    SortPipe,
    EmailsComponent,
    EmailBodyComponent,
    CustomMessageComponent,
    TrackPORBsComponent,
    HistoryOfChangeComponent,
    UnderMaintenancePageComponent,
    EditUnderMaintenanceComponent,
    TotalInitSummaryComponent,
    SyncInitComponent,
    ArchivedComponent,
    ArchiveComponent,
    SubmittedVersionComponent,
    TeamMemberComponent,
    TableComponent,
    VersionComponent,
    GrantedAccessPipePipe,
    CenterValidateComponent,
    QualitativeIndicatorsComponent,
    BudgetAssumptionsComponent,
    BudgetAssumptionSummaryComponent,
    GeographicLocationComponent,
    StickyOnScrollDirective,
    SubmitMessageComponent,
    ExportComponent,
    OnlineUsersComponent,
    PorbComponent,
    PorbOverviewComponent,
    PoolSectionComponent,
    PartnersSectionComponent,
    W3SectionComponent,
    MeliaSectionComponent,
    AnaplanSectionComponent,
    BudgetAndAssumptionComponent,
    CrossSectionComponent,
    CrossAddDialogComponent,
    ClearBudgetConfirmDialogComponent,
    PorbTourComponent,
    StanderdCrossCuttingComponent,
    StanderdCrossCuttingDialogComponent
  ],
  imports: [ 
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    NgxJsonViewerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    BrowserAnimationsModule,
    NgSelectModule,
    ToastrModule.forRoot(),
    MatTooltipModule,
    MatToolbarModule,
    MatSlideToggleModule,
    MatRadioModule,
    NoopAnimationsModule,
    SatPopoverModule,
    PopoverModule,
    EditorModule,
    TrustHTMLModule,
    ChatModule,
    HighchartsChartModule,
    TimeagoModule.forRoot(),
    NgxMaskDirective, NgxMaskPipe,
    MatProgressBarModule
  ],
  providers: [
    AppSocket,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpHeaderService,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true,
    },
    // {
    //   provide: TINYMCE_SCRIPT_SRC,
    //   useValue: "tinymce/tinymce.min.js",
    // },
    SortPipe,
    provideNgxMask()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
