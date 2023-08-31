import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppSocket } from './socket.service';
import { InQuePipe } from './inQue.pipe';
import { SubmissionComponent } from './submission/submission.component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MeliaComponent } from './submission/melia/melia.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { CrossCuttingComponent } from './submission/cross-cutting/cross-cutting.component';
import { ViewDataComponent } from './submission/view-data/view-data.component';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { InitiativesComponent } from './initiatives/initiatives.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TeamMembersComponent } from './team-members/team-members.component';
import { NewTeamMemberComponent } from './components/new-team-member/new-team-member.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatSelectModule } from '@angular/material/select';
import { ToastrModule } from 'ngx-toastr';
import { PhasesComponent } from "./admin/phases/phases.component";
import { PhaseDialogComponent } from "./admin/phases/phase-dialog/phase-dialog.component";
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import { PeriodsComponent } from './admin/periods/periods.component';
import { PeriodDialogComponent } from './admin/periods/period-dialog/period-dialog.component';
import { AuthComponent } from "./auth/auth.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { SubmitedVersionsComponent } from './submited-versions/submited-versions.component';
@NgModule({
  declarations: [
    AppComponent,
    InQuePipe,
    SubmissionComponent,
    MeliaComponent,
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
    AuthComponent,
    SubmitedVersionsComponent
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
    MatTooltipModule
  ],
  providers: [AppSocket],
  bootstrap: [AppComponent],
})
export class AppModule {}
