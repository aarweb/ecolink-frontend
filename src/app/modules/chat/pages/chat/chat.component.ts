import { Component, Inject, OnInit, Output } from '@angular/core';
import { AuthService } from '../../../../auth/services/AuthService.service';
import { ChatService } from '../../services/chat.service';
import { ChatUser } from '../../models/ChatUser';
import { IMessage } from '@stomp/stompjs';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  chats: ChatUser[] = [];
  messages: any[] = [];
  messageContent: string = '';
  id_chat: number | null = null;
  receiver: string = 'user';
  user: any;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private webSocketService: WebSocketService
  ) {
    this.webSocketService.initConnectionSocket();
  }

  ngOnInit() {
    // Obtener el usuario actual
    this.authService.getCurrentUser().subscribe((user: any) => {
      this.user = user;
    });
    
    // Obtener la lista de chats
    this.chatService.getChats().subscribe((chatList: ChatUser[]) => {
      this.chats = chatList;

      this.chats.forEach(chat => {
        if (chat?.imageUrl) {
          this.authService.getImage('user', chat.imageUrl).subscribe((imageUrl: string) => {
            chat.imageUrl = imageUrl;
          });
        }
      });
    });

  }

  onSelectChat(id: number) {
    this.id_chat = id;
    this.webSocketService.joinChat(id);
    this.receiver = this.chats.find(chat => chat.id === id)?.name || 'user';
    this.messages = this.webSocketService.getMessages(id);
  }

  sendMessage() {
    if (this.id_chat && this.messageContent) {
      console.log(this.user);
      this.webSocketService.sendMessage(this.id_chat, this.messageContent, this.user.id);
      this.messageContent = '';
    }
  };

}