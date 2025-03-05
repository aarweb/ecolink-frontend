import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ChatUser } from '../models/ChatUser';
import { Observable } from 'rxjs';
import { Message } from '../models/Message';
import { User } from '../../../core/models/User';
import { Successfull } from '../../blog/models/Successfull';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl: string = environment.apiUrl + '/chat';

  constructor(private http: HttpClient) { }

  getChats(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(this.baseUrl, { withCredentials: true });
  }

  getNewUser(id: number): Observable<User> {
    return this.http.get<User>(this.baseUrl + '/new/' + id, { withCredentials: true });
  }

  // Subir chat
  create(id: number, message: string): Observable<Successfull> {
    return this.http.post<Successfull>(this.baseUrl + '/new/' + id, {
      message
    }, { withCredentials: true });
  }

  getMessages(id: number): Observable<Message[]> {
    return this.http.get<Message[]>(this.baseUrl + '/messages/' + id, { withCredentials: true });
  }
}