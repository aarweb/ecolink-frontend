export interface ChatUser {
    id: number;
    name: string;
    imageUrl: string;
    lastMessage: string;
    lastMessageDate?: Date;
}