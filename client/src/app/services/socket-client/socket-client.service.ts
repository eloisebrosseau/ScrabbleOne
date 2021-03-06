import { Injectable } from '@angular/core';
import { environment } from '@environment';
import { io, Socket } from 'socket.io-client';

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    private socketClient: Socket;

    constructor() {
        this.socketClient = io(environment.serverUrl, { transports: ['websocket'], upgrade: false });
    }

    reset(): void {
        this.socketClient.emit('exit');
    }

    join(id: string): void {
        this.socketClient.emit('joinRoom', id);
    }

    on<T>(event: string, action: (param: T) => void): void {
        this.socketClient.on(event, action);
    }

    send<T>(event: string, message?: T): void {
        if (message) {
            this.socketClient.emit(event, message);
        } else {
            this.socketClient.emit(event);
        }
    }
}
