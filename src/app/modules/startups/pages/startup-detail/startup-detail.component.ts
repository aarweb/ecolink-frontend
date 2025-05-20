import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StartupService } from '../../services/startup.service';
import { StartupDetails } from '../../models/StartupDetails';
import { AuthService } from '../../../../auth/services/AuthService.service';
import { User } from '../../../../core/models/User';

@Component({
  selector: 'startup-detail',
  templateUrl: './startup-detail.component.html',
  styleUrl: './startup-detail.component.scss'
})
export class StartupDetailComponent implements OnInit {
  startupId: string | null = null;
  startup!: StartupDetails;
  showProducts: boolean = true;
  showProposals: boolean = false;
  isStartup: boolean = false;
  isCompany: boolean = false;
  isLogged: boolean = false;

  constructor(private route: ActivatedRoute, private startupService: StartupService, private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe((user: User) => {
      this.isLogged = !!user;
      if (user) {
        if (user.userType.toUpperCase() === 'STARTUP') {
          this.isStartup = true;
        } else if (user.userType.toUpperCase() === 'COMPANY') {
          this.isCompany = true;
        }
      }
    }
    );
    this.startupId = this.route.snapshot.paramMap.get('id');
    if (this.startupId === null) return;
    this.startupService.findStartupById(this.startupId).subscribe((startup: StartupDetails) => {
      this.startup = startup;
      if (startup?.imageUrl) {
        this.authService.getImage('user', this.startup?.imageUrl).subscribe((imageUrl: string) => {
          this.startup.imageUrl = imageUrl;
        });
      }
      for (let i = 0; i < this.startup.odsList.length; i++) {
        this.authService.getImage('ods', this.startup.odsList[i].image).subscribe((imageUrl: string) => {
          this.startup.odsList[i].image = imageUrl;
        });
      }

      for (let i = 0; i < this.startup.products.length; i++) {
        this.authService.getImage('product', this.startup.products[i].imageUrl).subscribe((imageUrl: string) => {
          this.startup.products[i].imageUrl = imageUrl;
        });
      }

    }, error => {
      console.error(error);
    });

  }

  setShowProposals(): void {
    this.showProducts = false;
    this.showProposals = true;
  }

  setShowProducts(): void {
    this.showProducts = true;
    this.showProposals = false;
  }
}
