import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatUser } from '../models/ChatUser';

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

  constructor() { }

  initConnectionSocket() {
    if (this.connected) {
      return;
    }

    const socket = new SockJS('http://localhost:8080/chat', null, {});
    this.stompClient = Stomp.over(() => socket);

    this.stompClient.debug = () => {};
    
    this.jwt = this.getCookie('jwt');

    if (!this.jwt) {
      return;
    }

    this.stompClient.connect(
      {
        Authorization: `Bearer ${this.jwt}`
      },
      (frame: any) => {
        this.connected = true;
      },
      (error: any) => {
        console.error('Error de conexión WebSocket:', error);
      }
    );
  }

  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  joinChat(chat: ChatUser) {
    const chat_id = chat.id;
    if (!this.connected) {
      return;
    }

    if (this.subscribedChats.has(chat_id)) {
      return;
    }

    this.subscribedChats.add(chat_id);

    if (!this.chatMessages[chat_id]) {
      this.chatMessages[chat_id] = [];
    }

    const subscription = this.stompClient.subscribe(`/topic/chat/${chat_id}`, (message: any) => {
      const parsedMessage = JSON.parse(message.body);
      const { content, sender, timestamp } = parsedMessage;

      this.chatMessages[chat_id].push({ content, sender, timestamp });
      chat.lastMessage = content;
    });

    this.subscriptions.set(chat_id, subscription);
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

    if (this.stompClient && this.stompClient.connected) {
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

  getMessages(chat_id: number): any[] {
    return this.chatMessages[chat_id] || [];
  }
}
