import { Message, MessageType } from '@common';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { SocketService } from '@app/services/socket/socket-service';
import { SessionHandlingService } from '@app/services/sessionHandling/session-handling.service';
import { Config } from '@app/config';
import * as logger from 'winston';

@Service()
export class RoomController {
    constructor(private readonly socketService: SocketService, private readonly sessionHandlingService: SessionHandlingService) {}

    async isRoomFull(socket: Socket, sessionId: string): Promise<boolean> {
        const maxPlayers = Config.MAX_PLAYERS;
        const roomSockets = await socket.in(sessionId).fetchSockets();

        logger.info(`Inside isRoomFull: ${roomSockets.length}`);

        return roomSockets.length >= maxPlayers;
    }

    handleSockets(): void {
        this.socketService.socketServer.on('connection', (socket) => {
            logger.info(`Connection with user id: ${socket.id}`);

            socket.on('disconnect', (reason) => {
                logger.info(`User disconnect: ${socket.id} - Reason: ${reason}`);
            });

            socket.on('message', (message: Message) => {
                // TODO: when room are functional socket.broadcast.to('testroom').emit('message', message);
                logger.debug(`Socket: ${socket.id} sent ${message.messageType}`);

                if (message.messageType === MessageType.Message) {
                    const room = Array.from(socket.rooms).pop();
                    this.socketService.socketServer.in(room ?? '').emit('message', message);
                } else {
                    this.socketService.socketServer.to(socket.id).emit('message', message);
                }

                logger.info(`Message sent on behalf of ${socket.id}`);
            });

            socket.on('getRooms', () => {
                const sessionInfo = this.sessionInfos;
                socket.emit('availableRooms', sessionInfo);
            });

            socket.on('joinRoom', async (playerId: string) => {
                const sessionId = this.sessionHandlingService.getSessionId(playerId);

                if (sessionId !== '') {
                    if (!(await this.isRoomFull(socket, sessionId))) {
                        socket.join(sessionId);
                        logger.info(`Joined room: ${sessionId}`);
                    }

                    this.socketService.socketServer.emit('availableRooms', this.sessionInfos);
                } else {
                    logger.info(`Invalid room ID provided: ${sessionId}`);
                }
            });
        });
    }

    private get sessionInfos(): string[] {
        return this.sessionHandlingService.availableSessions.map((s) => s.sessionInfo.id);
    }
}