import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatRoutingModule } from './chat-routing.module';
import { ChatComponent } from './pages/chat/chat.component';
import { SharedModule } from '../../shared/shared.module';
import { ChatUserListComponent } from './components/chat-user-list/chat-user-list.component';
import { ChatMessagesComponent } from './components/chat-messages/chat-messages.component';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    ChatComponent,
    ChatUserListComponent,
    ChatMessagesComponent
  ],
  imports: [
    CommonModule,
    ChatRoutingModule,
    SharedModule,
    FormsModule
  ]
})
export class ChatModule { }
