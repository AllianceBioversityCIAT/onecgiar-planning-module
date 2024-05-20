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
    HistoryOfChangeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    MatChipsModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatMenuModule,
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
    MatSelectModule,
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
    SortPipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
