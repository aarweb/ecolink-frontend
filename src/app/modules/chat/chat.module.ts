import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatRoutingModule } from './chat-routing.module';
import { ChatComponent } from './pages/chat/chat.component';
import { SharedModule } from '../../shared/shared.module';
import { ChatUserListComponent } from './components/chat-user-list/chat-user-list.component';


@NgModule({
  declarations: [
    ChatComponent,
    ChatUserListComponent
  ],
  imports: [
    CommonModule,
    ChatRoutingModule,
    SharedModule
  ]
})
export class ChatModule { }
