import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: any;
  private connected: boolean = false;
  private jwt: string | null = null;
  private chatMessages: { [chatId: number]: any[] } = {};

  constructor() { }

  initConnectionSocket() {
    if (this.connected) {
      console.log('WebSocket ya está conectado.');
      return;
    }

    const socket = new SockJS('http://localhost:8080/chat', null, {});
    this.stompClient = Stomp.over(() => socket);

    this.jwt = this.getCookie('jwt');

    if (!this.jwt) {
      console.error('No se encontró el token JWT.');
      return;
    }

    this.stompClient.connect(
      {
        Authorization: `Bearer ${this.jwt}`
      },
      (frame: any) => {
        console.log('Conectado:', frame);
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


  joinChat(chat_id: number) {
    if (!this.connected) {
      console.error('WebSocket no está conectado.');
      return;
    }

    if (!this.chatMessages[chat_id]) {
      this.chatMessages[chat_id] = [];
    }

    this.stompClient.subscribe(`/topic/chat/${chat_id}`, (message: any) => {
      console.log('Mensaje recibido:', JSON.parse(message.body));
      const parsedMessage = JSON.parse(message.body);
      const { content, sender, timestamp } = parsedMessage;

      this.chatMessages[chat_id].push({
        content,
        sender,
        timestamp
      });

    });
  }

  sendMessage(chat_id: number, message: string, sender: number) {
  
    if (!this.connected) {
      console.error('WebSocket no está conectado.');
      return;
    }

    if(sender === null) {
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
      console.log(`Mensaje enviado al chat ${chat_id}: ${message}`);
    } else {
      console.error("No se puede enviar el mensaje: WebSocket no está conectado.");
    }
  }

  getMessages(chat_id: number): any[] {
    return this.chatMessages[chat_id] || [];
  }

}
