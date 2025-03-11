import { Injectable, OnInit } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatUser } from '../models/ChatUser';
import { ChatService } from './chat.service';
import { Message } from '../models/Message';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: any;
  private connected: boolean = false;
  private jwt: string | null = null;
  private chatMessages: { [chatId: number]: any[] } = {};
  private subscribedChats: Set<number> = new Set();
  private subscriptions: Map<number, any> = new Map();

  private eventSubject = new Subject<any>();


  constructor(private chatService: ChatService) { }

  initConnectionSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        return resolve();
      }

      const socket = new SockJS('http://localhost:8080/chat', null, {});
      this.stompClient = Stomp.over(() => socket);

      this.stompClient.debug = () => { };

      this.jwt = this.getCookie('jwt');

      if (!this.jwt) {
        reject('The user is not authenticated');
      }
      this.stompClient.connect(
        {
          Authorization: `Bearer ${this.jwt}`
        },
        (frame: any) => {
          this.connected = true;
          resolve();
        },
        (error: any) => {
          console.error('Error to connect to WebSocket:', error);
          reject(error);
        }
      );
    });
  }

  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  joinChat(chat: ChatUser): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const chat_id = chat.id;
      if (!chat_id) {
        console.error('Cannot join a chat without ID');
        return reject('Cannot join a chat without ID');
      }

      if (!this.connected) {
        console.error('Cannot join a chat without connection');
        return reject('Cannot join a chat without connection');
      }

      if (this.subscribedChats.has(chat_id)) {
        return resolve();
      }

      const subscription = this.stompClient.subscribe(`/topic/chat/${chat_id}`, (message: any) => {
        const parsedMessage = JSON.parse(message.body);
        const { content, sender, timestamp, id } = parsedMessage;

        if (!this.chatMessages[chat_id]) {
          this.chatMessages[chat_id] = [];
        }
        
        const messageExists = this.chatMessages[chat_id].find((message: Message) => message.id === id);
        if (!messageExists) {
          this.chatMessages[chat_id].push({ content, sender, timestamp, id });
        } else {
          messageExists.read = true;
        }
        this.notifyNewMessage(id);
      });

      this.subscribedChats.add(chat_id);
      this.subscriptions.set(chat_id, subscription);

      this.chatService.getMessages(chat_id).subscribe(
        (messages: Message[]) => {
          this.chatMessages[chat_id] = messages;
          chat.lastMessage = messages[messages.length - 1]?.content || '';
          resolve();
        },
        error => {
          console.error('Error fetching messages:', error);
          reject(error);
        }
      );
    });
  }

  leaveChat(chat_id: number) {
    if (!this.connected) {
      return;
    }

    if (this.subscriptions.has(chat_id)) {
      this.subscriptions.get(chat_id).unsubscribe();
      this.subscriptions.delete(chat_id);
      this.subscribedChats.delete(chat_id);
    }
  }

  sendMessage(chat_id: number, message: string, sender: number) {
    if (!this.connected) {
      return;
    }

    if (sender === null) {
      return;
    }

    if (chat_id >= 0) {
      if (this.stompClient && this.stompClient.connected && message.length <= 255 && message.length > 0) {
        this.stompClient.send(
          `/app/chat/${chat_id}/message`,
          {
            Authorization: `Bearer ${this.jwt}`,
          },
          JSON.stringify({
            sender: sender,
            content: message
          })
        );
      }
    }
  }

  getMessages(chat_id: number): Message[] {
    return this.chatMessages[chat_id] || [];
  }

  notifyNewMessage(id: number) {
    this.eventSubject.next(id);
  }

  getEventSubject() {
    return this.eventSubject.asObservable();
  }


  readMessage(id: number, chat_id: number, sender: number) {
    if (!this.chatMessages[chat_id]) {
      return;
    };

    const message = this.chatMessages[chat_id].find((message: Message) => message.id === id);

    if (message && !message.read) {
      this.stompClient.send(
        `/app/chat/${chat_id}/read`,
        {
          Authorization: `Bearer ${this.jwt}`,
        },
        JSON.stringify(message)
      );
      message.read = true;
    }
  }
}
