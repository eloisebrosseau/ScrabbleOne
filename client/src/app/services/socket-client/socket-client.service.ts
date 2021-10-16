import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketClientService {
  socketClient: Socket = io(environment.serverUrl, { transports: ['websocket'], upgrade: false });
  constructor() {}
}
