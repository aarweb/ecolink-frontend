import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatComponent } from './pages/chat/chat.component';
import { ChatGuard } from '../../core/guards/chat.guard';

const routes: Routes = [
  {
    path: '',
    component: ChatComponent,
    canActivate: [ChatGuard]
  },
  {
    path: ':id',
    component: ChatComponent,
    canActivate: [ChatGuard]
  },
  {
    path: 'new/:id',
    component: ChatComponent,
    canActivate: [ChatGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChatRoutingModule { }
