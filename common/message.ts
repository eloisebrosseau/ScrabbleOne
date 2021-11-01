export enum MessageType {
    Message,
    Log,
    Error,
    System,
    Game,
}

export interface Message {
    title: string;
    body: string;
    messageType: MessageType;
    userId: string;
}
