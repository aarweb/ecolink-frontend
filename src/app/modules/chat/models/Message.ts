import { MessageType } from "./TypeMessage.enum";

export interface Message {
    id: number;
    content: string;
    sender: string;
    timestamp: string;
    read: boolean;
    type: MessageType;
}