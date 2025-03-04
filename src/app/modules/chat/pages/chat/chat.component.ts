import { AfterViewInit, Component, ElementRef, Inject, OnInit, Output, ViewChild } from '@angular/core';
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
  chatSelected: ChatUser | null = null;
  receiver: string = 'user';
  user: any;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private webSocketService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.webSocketService.initConnectionSocket();

    this.authService.getCurrentUser().subscribe((user: any) => {
      this.user = user;
      if (user?.imageUrl) {
        this.authService.getImage('user', user.imageUrl).subscribe((imageUrl: string) => {
          this.user.imageUrl = imageUrl;
        });
      }
    });

    this.chatService.getChats().subscribe((chatList: ChatUser[]) => {
      this.chats = chatList;

      this.chats.forEach(chat => {
        if (chat?.imageUrl) {
          this.authService.getImage('user', chat.imageUrl).subscribe((imageUrl: string) => {
            chat.imageUrl = imageUrl;
          });
        }

        setTimeout(() => {
          this.webSocketService.joinChat(chat);
        }, 100);
      });
    });

    
  }

  onSelectChat(id: number) {
    if (this.chatSelected?.id === id) {
      return;
    }

    this.chatSelected = this.chats.find(chat => chat.id === id) || null;
    this.receiver = this.chatSelected?.name || 'user';
    if (this.chatSelected) {
      this.messages = [];
      this.messages = this.webSocketService.getMessages(id);
    }
  }

  sendMessage() {
    if (this.chatSelected && this.messageContent) {
      this.webSocketService.sendMessage(this.chatSelected.id, this.messageContent, this.user.id);
      this.messageContent = '';
      setTimeout(() => {
        const message = this.messages[this.messages.length - 1];
        const messageElement = document.getElementById(message.timestamp);

        if (messageElement) {
          messageElement.scrollIntoView({
            behavior: 'auto',
            block: 'end',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(timestamp: number): string {
    const validTimestamp = Number(timestamp);
    if (isNaN(validTimestamp)) {
      return 'Invalid time';
    }

    const date = new Date(validTimestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}