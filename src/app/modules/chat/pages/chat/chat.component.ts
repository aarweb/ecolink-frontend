import { AfterViewInit, Component, ElementRef, Inject, OnInit, Output, ViewChild } from '@angular/core';
import { AuthService } from '../../../../auth/services/AuthService.service';
import { ChatService } from '../../services/chat.service';
import { ChatUser } from '../../models/ChatUser';
import { IMessage } from '@stomp/stompjs';
import { WebSocketService } from '../../services/websocket.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../../core/models/User';
import { Successfull } from '../../../blog/models/Successfull';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  id: number = 0;
  chats: ChatUser[] = [];
  messages: any[] = [];
  messageContent: string = '';
  chatSelected: ChatUser | null = null;
  receiver: string = 'user';
  user: any;
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.route.params.subscribe(params => {
      this.id = params['id'];
    });

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

    if (this.id) {
      this.chatService.getNewUser(this.id).subscribe((user: User) => {
        const newChat: ChatUser = {
          id: -1,
          name: user.name,
          imageUrl: user.imageUrl,
          lastMessage: ''
        };
        this.authService.getImage('user', user.imageUrl).subscribe((imageUrl: string) => {
          newChat.imageUrl = imageUrl;
        });
        this.chats.push(newChat);
        this.onSelectChat(-1);
      },
        error => {
          this.router.navigate(['/chat']);
        }
      );
    }
    this.loading = false;
  }

  onSelectChat(id: number) {
    if (this.chatSelected?.id === id) {
      return;
    }

    this.chatSelected = this.chats.find(chat => chat.id === id) || null;
    this.receiver = this.chatSelected?.name || 'user';
    if (this.chatSelected) {
      this.messages = [];
      if (this.chatSelected.id != -1) {
        this.messages = this.webSocketService.getMessages(id);
      }
    }
  }

  sendMessage() {
    if (this.chatSelected && this.messageContent) {
      if (this.chatSelected.id >= 0) {
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
      } else {
        this.chatService.create(this.id, this.messageContent).subscribe((message: Successfull) => {
          this.router.navigate(['/chat/']);
        });
      }
    }
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}