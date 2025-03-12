import { Component, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Meta, Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { HeaderService } from 'src/app/header.service';
import { InitiativesService } from 'src/app/services/initiatives.service';

@Component({
  selector: 'app-sync-init',
  templateUrl: './sync-init.component.html',
  styleUrls: ['./sync-init.component.scss']
})
export class SyncInitComponent {
  constructor(
    private initiativeService: InitiativesService,
    private dialog: MatDialog,
    private headerService: HeaderService,
    private toastr: ToastrService,
    private title: Title,
    private meta: Meta,
    private fb: FormBuilder
  ) {
    this.headerService.background =
      "linear-gradient(to  bottom, #04030F, #020106)";
    this.headerService.backgroundNavMain =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundUserNavButton =
      "linear-gradient(to  top, #0F212F, #09151E)";
    this.headerService.backgroundFooter =
      "linear-gradient(to  top, #0F212F, #09151E)";

    this.headerService.backgroundDeleteYes = "#FF5A54";
    this.headerService.backgroundDeleteClose = "#04030F";
    this.headerService.backgroundDeleteLr = "#04030F";
    this.headerService.logoutSvg="brightness(0) saturate(100%) invert(4%) sepia(6%) saturate(6779%) hue-rotate(208deg) brightness(80%) contrast(104%)";
  }
  displayedColumns: string[] = [
    'INIT-ID',
    'Science programs Name',
    'Actions',
  ];

  dataSource = new MatTableDataSource<any>([]);
  initCodes: string[] = [];

  async ngOnInit() {
    this.getInitiatives();

    this.title.setTitle('Sync Initiative');
    this.meta.updateTag({ name: 'description', content: 'Sync Initiative' });
  }

  async getInitiatives() {
    let initiative: any = await this.initiativeService.getClarisaPrograms();
    this.dataSource = new MatTableDataSource<any>(initiative);
  }

  checkInit(event: MatCheckboxChange, code: string) {
    if(event.checked) {
      this.initCodes.push(code);
    } else {
      const indexCode = this.initCodes.indexOf(code);
      if (indexCode !== -1) {
        this.initCodes.splice(indexCode, 1);
      }
    }
  }

  async syncData() {
    // if(this.initCodes.length) {
    //   this.dialog
    //   .open(DeleteConfirmDialogComponent, {
    //     data: {
    //       message: `Are you sure you want to sync this program`,
    //       svg: '../../../assets/shared-image/sync.png'
    //     },
    //   })
    //   .afterClosed().subscribe(async res => {
    //     if(res){
    //       await this.initiativeService.syncInit(this.initCodes).then(
    //         () => {
    //           this.getInitiatives();
    //           this.toastr.success('Sync successfully');
    //         }, (error) => {
    //           this.toastr.error(error.error.message);
    //         }
    //       );
    //     }
    //   });
    // } else {
    //   this.toastr.error('please select programs you want to sync it');
    // }
  }
}
