import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ChatUser } from '../models/ChatUser';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private baseUrl: string = environment.apiUrl + '/chat';

  constructor(private http: HttpClient) { }

  getChats(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(this.baseUrl, {withCredentials: true});
  }

  getMessages(id: number): any[] {
    return [];
  }
}
