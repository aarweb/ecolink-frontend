import { AfterViewChecked, AfterViewInit, Component, ElementRef, Inject, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AuthService } from '../../../../auth/services/AuthService.service';
import { ChatService } from '../../services/chat.service';
import { ChatUser } from '../../models/ChatUser';
import { WebSocketService } from '../../services/websocket.service';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../../../core/models/User';
import { Message } from '../../models/Message';
import { Successfull } from '../../../blog/models/Successfull';
import { MessageType } from '../../models/TypeMessage.enum';


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChildren('observedElement') observedElements!: QueryList<ElementRef>;
  private observer!: IntersectionObserver;
  hasObserved = false;
  private previousElements: ElementRef[] = [];


  id: number = 0;
  chats: ChatUser[] = [];
  private chatsSubscription: any;
  messages: Message[] = [];
  messageContent: string = '';
  imageContent: File | null = null
  chatSelected: ChatUser | null = null;
  receiver: string = 'user';
  user: any;
  loading: boolean = false;
  isNew = false;
  maxCharacters = 255;
  unreadMessages = false;
  isSubmittingImage = false;
  consultaSolicitada = false;
  buttonDisabled: boolean = false;
  animationActive: boolean = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private webSocketService: WebSocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Suscribirse a los cambios en la lista de chats
    this.chatsSubscription = this.webSocketService.chats$.subscribe(chats => {
      // Ordenar los chats por fecha más reciente
      this.chats = [...chats].sort((a, b) => {
        if (!a.lastMessageDate) return 1;
        if (!b.lastMessageDate) return -1;
        return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
      });
    });
  }


  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }

    if (this.chatsSubscription) {
      this.chatsSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.observedElements.length > 0 && this.hasNewElements()) {
      this.initializeObserver();
    }
    // Removed scrollToBottom() call to avoid running on every change
  }

  private initializeObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const id = element.getAttribute('id');
          const message = this.messages.find(m => m.timestamp === id);
          if (message && this.chatSelected && !message.read) {
            this.webSocketService.readMessage(message.id, this.chatSelected.id, this.user.id);
          }
        }
      });
    });

    this.observedElements.forEach((element) => {
      this.observer.observe(element.nativeElement);
    });

    this.previousElements = this.observedElements.toArray();
  }

  private hasNewElements(): boolean {
    return this.previousElements.length !== this.observedElements.length;
  }

  getLastUserMessage(): Message | null {
    if (!this.messages?.length || !this.user?.id) return null;

    // Find the last message sent by the current user
    const userMessages = this.messages.filter(msg => msg.sender === this.user.id);
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }

  private scrollToBottom(): void {
    if (!this.messageContainer) return;
    const container = this.messageContainer.nativeElement;
    setTimeout(() => { // Always scroll to the bottom
      container.scrollTop = container.scrollHeight;
    }, 0);
  }

  onScroll(event: Event): void {
    // Podemos agregar lógica de carga de mensajes antiguos aquí si es necesario
  }

  ngOnInit(): void {
    this.loading = true;

    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.isNew = this.route.snapshot.url[0]?.path === 'new';

      this.webSocketService.initConnectionSocket().then(() => {
        this.joinChats().then(() => {
          this.chats.forEach(chat => {
            if (chat.lastMessage.endsWith('.png') || chat.lastMessage.endsWith('.jpg') || chat.lastMessage.endsWith('.jpeg') || chat.lastMessage.endsWith('.webp')) {
              chat.lastMessage = 'Image';
            }
          }
          );
          if (this.id && this.isNew) {
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
            }, error => {
              this.router.navigate(['/chat']);
            });
          } else if (this.id && !this.isNew) {
            this.onSelectChat(this.id);
          }

          this.webSocketService.getNewChat(this.user.id).subscribe((chat: ChatUser) => {
            this.authService.getImage('user', chat.imageUrl).subscribe((imageUrl: string) => {
              chat.imageUrl = imageUrl;

              if (
                chat.lastMessage.endsWith('.png') ||
                chat.lastMessage.endsWith('.jpg') ||
                chat.lastMessage.endsWith('.jpeg') ||
                chat.lastMessage.endsWith('.webp')
              ) {
                chat.lastMessage = 'Image';
              }
              this.chats.push(chat);
              console.log('Nuevo chat recibido:', chat);
              const unreadCount = this.chats.filter(c => c.id === chat.id).length;
              chat.unreadCount = unreadCount;
              this.webSocketService.joinChat(chat).then(() => {
                if (this.chatSelected && this.chatSelected.id === chat.id) {
                  this.messages = this.webSocketService.getMessages(chat.id);
                  this.scrollToBottom();
                  console.log('[chat.component] Chat activo actualizado con mensajes del chat:', chat.id);
                } else {
                  console.log('[chat.component] Mensajes cargados en background para chat:', chat.id);
                }
              });
            });
          });

          this.loading = false;
        }).catch(error => {
          this.loading = false;
        });
      });

      this.authService.getCurrentUser().subscribe((user: any) => {
        this.user = user;
        if (user?.imageUrl) {
          this.authService.getImage('user', user.imageUrl).subscribe((imageUrl: string) => {
            this.user.imageUrl = imageUrl;
          });
        }
      });
    });
  }

  private messageSubscription: any;

  private setupMessageSubscription() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.messageSubscription = this.webSocketService.getEventSubject().subscribe((messageData: any) => {
      if (messageData) {
        setTimeout(() => {
          const targetChat = this.chats.find(chat => chat.id === messageData.chatId);
          if (targetChat) {
            if (messageData.sender == this.user.id) {
              targetChat.lastMessage = `You: ${messageData.content}`;
            } else {
              targetChat.lastMessage = messageData.content;
            }
          }
          // Execute scrollToBottom when a message is received
          if (this.chatSelected) {
            this.scrollToBottom();
          }
          this.existsUnreadMessages();
          this.initializeObserver();
        }, 100);
      }
    });
  }


  joinChats(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.chatService.getChats().subscribe((chatList: ChatUser[]) => {
        this.chats = chatList;
        const joinPromises = this.chats.map(async chat => {
          this.authService.getImage('user', chat.imageUrl).subscribe((imageUrl: string) => {
            chat.imageUrl = imageUrl;
          });
          await this.webSocketService.joinChat(chat);
        });

        // Configurar la suscripción a mensajes una sola vez
        this.setupMessageSubscription();

        Promise.all(joinPromises)
          .then(() => {
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      });
    });
  }


  onSelectChat(id: number) {
    if (this.chatSelected?.id === id) {
      return;
    }

    this.chatSelected = this.chats.find(chat => chat.id == id) || null;
    this.receiver = this.chatSelected?.name || 'user';

    if (this.chatSelected && this.chatSelected.id >= 0) {
      this.messages = [];
      if (this.chatSelected.id != -1) {
        this.webSocketService.joinChat(this.chatSelected).then(() => {
          this.messages = this.webSocketService.getMessages(id);
          let lastMessage = this.messages[this.messages.length - 1];
          setTimeout(() => {
            this.goToMessage(lastMessage);
          }, 100);
        });
        const newUrl = `/chat/${id}`;
        window.history.pushState({}, '', newUrl);
      }
    }
  }

  sendMessage(type: MessageType = MessageType.TEXT) {

    if (!this.chatSelected) {
      return;
    }

    if (!this.messageContent || this.messageContent.trim() === '' || this.messageContent.length > 255) {
      return;
    }

    if (this.chatSelected.id >= 0) {
      this.sendExistingChatMessage(this.chatSelected, type);
    } else {
      this.sendNewChatMessage();
    }
  }

  sendExistingChatMessage(chat: ChatUser, type: MessageType = MessageType.TEXT) {
    this.webSocketService.sendMessage(chat.id, this.messageContent, this.user.id, type);
    this.messageContent = '';
    setTimeout(() => {
      const message = this.messages[this.messages.length - 1];
      this.goToMessage(message);
    }, 100);
  }

  sendNewChatMessage() {
    const existingChat = this.chats.find(chat => chat.id !== -1 && chat.name === this.receiver);
    if (existingChat) {
      console.log('El chat ya existe, activándolo:', existingChat.id);
      this.chats = this.chats.filter(c => c.id !== -1);
      this.onSelectChat(existingChat.id);
      return; // No se envía la solicitud para crear un chat nuevo.
    }


    this.chatService.create(this.id, this.messageContent).subscribe((chat: ChatUser) => {
      this.webSocketService.notifyNewChat(this.id);
      this.router.navigate(['/chat/' + chat.id]);
    });
  }

  goToMessage(message: Message) {
    const messageElement = document.getElementById(message.timestamp);

    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: 'auto',
        block: 'end',
        inline: 'nearest'
      });
    }
  }

  goToFirstUnreadMessage() {
    const firstUnreadMessage = this.messages.find(message => !message.read);
    if (firstUnreadMessage) {
      this.goToMessage(firstUnreadMessage);
    }
  }

  existsUnreadMessages(): void {
    this.unreadMessages = this.messages.some(message => !message.read);
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleImageSubmit() {
    this.isSubmittingImage = !this.isSubmittingImage;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.imageContent = input.files[0];
    }
  }

  submitImage() {
    if (!this.chatSelected || !this.chatSelected.id || !this.imageContent) {
      return;
    }

    const formData = new FormData();
    formData.append('image', this.imageContent, this.imageContent.name);

    this.chatService.submitImage(this.chatSelected.id, formData).subscribe({
      next: (res: Successfull) => {
        this.imageContent = null;
        this.isSubmittingImage = false;
        this.messageContent = res.message;
        this.sendMessage(MessageType.IMAGE);
      },
      error: (error) => console.error("Error al enviar imagen", error)
    });
  }
  chatIsSelf(): boolean {
    return this.chatSelected && this.user && this.chatSelected.name === this.user.name;
  }

  obtenerRespuestaRecomendada() {
    if (this.consultaSolicitada) {
      return;
    }
    this.consultaSolicitada = true;
    this.buttonDisabled = true;
    this.animationActive = true;
    // Asignamos el mensaje con animación activa
    this.messageContent = 'Solicitando mensaje...';

    const recentMessages = this.messages
      .filter(message => message.type === MessageType.TEXT)
      .slice(-10)
      .map(message => {
        let messageToSave = "";
        if (message.sender == this.user.id) {
          messageToSave = `You: ${message.content}`;
        } else {
          messageToSave = `${this.chatSelected?.name}: ${message.content}`;
        }
        return messageToSave;
      });

    this.chatService.getObtenerRespuesta(recentMessages).subscribe({
      next: (respuesta: string) => {
        this.messageContent = respuesta;
        this.consultaSolicitada = false;
        this.buttonDisabled = false;
        this.animationActive = false;
      },
      error: (error) => {
        console.error('Error al obtener la respuesta recomendada:', error);
        this.consultaSolicitada = false;
        this.buttonDisabled = false;
        this.animationActive = false;
        this.messageContent = '';
      }
    });
  }
}
