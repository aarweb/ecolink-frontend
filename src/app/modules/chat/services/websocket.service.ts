import { Injectable, OnInit } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ChatUser } from '../models/ChatUser';
import { ChatService } from './chat.service';
import { Message } from '../models/Message';
import { Observable, Subject } from 'rxjs';
import { MessageType } from '../models/TypeMessage.enum';
import { AuthService } from '../../../auth/services/AuthService.service';

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
  private chats: ChatUser[] = [];
  private userId: number | null = null;

  private newMessageSubject = new Subject<any>();
  private chatsUpdated = new Subject<ChatUser[]>();
  chats$ = this.chatsUpdated.asObservable();


  constructor(private chatService: ChatService, private authService: AuthService) { }

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
      // Obtener el ID del usuario actual
      this.authService.getCurrentUser().subscribe((user: any) => {
        this.userId = user?.id;
      }, (error: any) => {
        console.error('Error fetching current user:', error);
      });
    });
  }

  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
    return null;
  }

  joinChat(chat: ChatUser): Promise<void> {
  // Agregar el chat a la lista si no existe
  if (!this.chats.some(c => c.id === chat.id)) {
    this.chats.push(chat);
    console.log('[joinChat] Chat agregado a la lista:', chat);
  }
  return new Promise<void>((resolve, reject) => {
    const chat_id = chat.id;
    if (!chat_id) {
      console.error('[joinChat] No se puede unir a un chat sin ID');
      return reject('Cannot join a chat without ID');
    }
    if (!this.connected) {
      console.error('[joinChat] No se puede unir a un chat sin conexión');
      return reject('Cannot join a chat without connection');
    }
    if (this.subscribedChats.has(chat_id)) {
      console.log('[joinChat] Ya está suscrito al chat', chat_id);
      return resolve();
    }
  
    // Suscribirse al tópico del chat
    const subscription = this.stompClient.subscribe(`/topic/chat/${chat_id}`, (message: any) => {
      console.log(`[joinChat] Mensaje recibido en chat ${chat_id}:`, message.body);
      const parsedMessage = JSON.parse(message.body);
      const { content, sender, timestamp, id, type } = parsedMessage;
  
      // Actualizar la fecha más reciente del chat
      const chatIndex = this.chats.findIndex(c => c.id === chat_id);
      if (chatIndex !== -1) {
        this.chats[chatIndex].lastMessageDate = new Date(timestamp);
        console.log(`[joinChat] Actualizando fecha del chat ${chat_id} a ${timestamp}`);
        this.sortAndNotifyChats();
      }
  
      // Asegurarse de que exista la lista de mensajes para el chat
      if (!this.chatMessages[chat_id]) {
        this.chatMessages[chat_id] = [];
      }
  
      const messageExists = this.chatMessages[chat_id].find((message: Message) => message.id === id);
  
      if (!messageExists) {
        // Agregar el mensaje al historial
        if (type === MessageType.IMAGE) {
          this.authService.getImage('message', content).subscribe((imageUrl: string) => {
            const newMessage = { content: imageUrl, sender, timestamp, id, type };
            console.log(`[joinChat] Mensaje de imagen procesado para chat ${chat_id}:`, newMessage);
            this.chatMessages[chat_id].push(newMessage);
  
            const targetChat = this.chats.find(c => c.id === chat_id);
            if (targetChat) {
              targetChat.lastMessage = 'Image';
              console.log(`[joinChat] Notificando nuevo mensaje (Image) para chat ${chat_id}`);
              this.notifyNewMessage({ content: 'Image', chatId: chat_id, sender });
            }
          });
        } else {
          const newMessage = { content, sender, timestamp, id, type };
          console.log(`[joinChat] Se creó un nuevo mensaje de texto para chat ${chat_id}:`, newMessage);
          this.chatMessages[chat_id].push(newMessage);
  
          const targetChat = this.chats.find(c => c.id === chat_id);
          if (targetChat) {
            targetChat.lastMessage = content;
            targetChat.lastMessageDate = new Date(timestamp);
            console.log(`[joinChat] Actualizando chat ${chat_id} con mensaje: ${content}`);
            this.sortAndNotifyChats();
            console.log(`[joinChat] Notificando nuevo mensaje para chat ${chat_id}`);
            this.notifyNewMessage({ content, chatId: chat_id, sender });
          }
        }
      } else {
        console.log(`[joinChat] Mensaje ya existente en chat ${chat_id} con id: ${id}`);
        messageExists.read = true;
      }
    });
  
    this.subscribedChats.add(chat_id);
    this.subscriptions.set(chat_id, subscription);
    console.log(`[joinChat] Suscripción establecida para chat ${chat_id}`);
  
    // Obtener los mensajes iniciales del chat
    this.chatService.getMessages(chat_id).subscribe(
      (messages: Message[]) => {
        console.log(`[joinChat] Mensajes iniciales para chat ${chat_id}:`, messages);
        const images = messages.filter((msg: Message) => msg.type === MessageType.IMAGE);
        images.forEach((msg: Message) => {
          this.authService.getImage('message', msg.content).subscribe((imageUrl: string) => {
            msg.content = imageUrl;
            console.log(`[joinChat] Imagen actualizada para mensaje ${msg.id} en chat ${chat_id}`);
          });
        });
        this.chatMessages[chat_id] = messages;
  
        const unreadCount = messages.filter((msg: Message) => !msg.read && Number(msg.sender) !== Number(this.userId)).length;
        const targetChat = this.chats.find(c => c.id === chat_id);
        if (targetChat) {
          targetChat.unreadCount = unreadCount;
          console.log(`[joinChat] Contador de mensajes sin leer para chat ${chat_id}: ${unreadCount}`);
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            targetChat.lastMessageDate = new Date(lastMessage.timestamp);
            targetChat.lastMessage = lastMessage.type === MessageType.IMAGE ? 'Image' : lastMessage.content;
            console.log(`[joinChat] Último mensaje actualizado en chat ${chat_id}: ${targetChat.lastMessage}`);
            this.sortAndNotifyChats();
          }
        }
        resolve();
      },
      error => {
        console.error(`[joinChat] Error obteniendo mensajes para chat ${chat_id}:`, error);
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

  sendMessage(chat_id: number, message: string, sender: number, type: MessageType) {
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
            content: message,
            type: type
          })
        );
      }
    }
  }

  getMessages(chat_id: number): Message[] {
    return this.chatMessages[chat_id] || [];
  }

  getNewChat(id: number): Observable<ChatUser> {
    return new Observable((observer) => {
      this.stompClient.subscribe(`/topic/chat/${id}/new`, (message: any) => {
        const chat: ChatUser = JSON.parse(message.body);

        if (chat == null) {
          return;
        }

        observer.next(chat);
      });
    });
  }

  notifyNewChat(id: number) {
    this.stompClient.send(
      `/app/chat/${id}/new`,
      {
        Authorization: `Bearer ${this.jwt}`,
      });
  }

  private sortAndNotifyChats() {
    if (!this.chats || this.chats.length === 0) return;

    // Asegurarse de que todos los chats tengan una fecha
    this.chats.forEach(chat => {
      if (!chat.lastMessageDate) {
        // Si no hay fecha, usar la fecha actual como fallback
        chat.lastMessageDate = new Date();
      }
    });

    // Ordenar los chats
    this.chats.sort((a, b) => {
      if (!a.lastMessageDate || !b.lastMessageDate) return 0;
      return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
    });

    // Emitir el nuevo orden
    this.chatsUpdated.next([...this.chats]);
  }

  private notifyNewMessage(message: any) {
    const chat = this.chats.find(c => c.id === message.chatId);
    if (chat) {
      if (message.sender != this.userId) {
        console.log("Console log 2", "Sender of the message: ", message.sender, "User ID: ", this.userId);
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }
      chat.lastMessage = message.content;
      chat.lastMessageDate = new Date();
      this.sortAndNotifyChats();
    }

    // Notificar a los suscriptores
    this.newMessageSubject.next(message);
  }

  getEventSubject() {
    return this.newMessageSubject.asObservable();
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

      // Actualizar el contador de mensajes no leídos
      const chat = this.chats.find(c => c.id === chat_id);
      if (chat) {
        chat.unreadCount = (chat.unreadCount || 0) - 1;
        if (chat.unreadCount < 0) {
          chat.unreadCount = 0;
        }
      }
    }
  }
}
