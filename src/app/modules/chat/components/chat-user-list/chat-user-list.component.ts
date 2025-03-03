import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChatUser } from '../../models/ChatUser';

@Component({
  selector: 'chat-user-list',
  templateUrl: './chat-user-list.component.html',
  styleUrl: './chat-user-list.component.scss'
})
export class ChatUserListComponent {
  @Input() chat!: ChatUser;
  @Input() id_chat: number | null = null;
  @Output() selectChat = new EventEmitter<number>();

  userId!: number;

  constructor() {

  }

  ngOnInit() {
    this.userId = this.chat.id;

  }

  onSelectChat = () => {
    this.selectChat.emit(this.userId)
  }

}
