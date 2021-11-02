import { AvailableGameConfig, GameType, Message, MessageType } from '@common';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { SocketService } from '@app/services/socket/socket-service';
import { SessionHandlingService } from '@app/services/sessionHandling/session-handling.service';
import { Config } from '@app/config';
import * as logger from 'winston';
import { Timer } from '@app/classes/delay';

const END_GAME_DELAY_MS = 5000;

@Service()
export class RoomController {
    private readonly socketIdToPlayerId: Map<string, string>;

    constructor(private readonly socketService: SocketService, private readonly sessionHandlingService: SessionHandlingService) {
        this.socketIdToPlayerId = new Map<string, string>();
    }

    async isRoomFull(socket: Socket, sessionId: string): Promise<boolean> {
        const maxPlayers = Config.MAX_PLAYERS;
        const roomSockets = await socket.in(sessionId).fetchSockets();

        logger.info(`Inside isRoomFull: ${roomSockets.length}`);

        return roomSockets.length >= maxPlayers;
    }

    handleSockets(): void {
        this.socketService.socketServer.on('connection', (socket) => {
            logger.info(`Connection with user id: ${socket.id}`);

            socket.on('disconnect', async (reason) => {
                logger.info(`User disconnect: ${socket.id} - Reason: ${reason}`);

                const playerId = this.socketIdToPlayerId.get(socket.id);

                if (playerId === undefined) {
                    return;
                }

                this.socketIdToPlayerId.delete(socket.id);
                await this.stop(playerId);

                this.socketService.socketServer.emit('availableRooms', this.sessionInfos);
            });

            socket.on('message', (message: Message) => {
                logger.debug(`Socket: ${socket.id} sent ${message.messageType}`);

                if (message.messageType === MessageType.Message) {
                    const sessionId = this.sessionHandlingService.getSessionId(this.socketIdToPlayerId.get(socket.id) ?? '');
                    this.socketService.socketServer.in(sessionId).emit('message', message);
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
                        this.socketIdToPlayerId.set(socket.id, playerId);
                        logger.info(`Joined room: ${sessionId}`);
                    }

                    this.socketService.socketServer.emit('availableRooms', this.sessionInfos);
                } else {
                    logger.info(`Invalid room ID provided: ${sessionId}`);
                }
            });
        });
    }

    private get sessionInfos(): AvailableGameConfig[] {
        return this.sessionHandlingService.availableSessions.map((s) => ({
            id: s.sessionInfo.id,
            playTimeMs: s.sessionInfo.playTimeMs,
            waitingPlayerName: s.players[0].playerInfo.name,
        }));
    }

    private async stop(id: string): Promise<boolean> {
        const handler = this.sessionHandlingService.getHandlerByPlayerId(id);

        if (handler == null) {
            logger.warn(`Failed to stop game: ${id}`);
            return false;
        }

        await Timer.delay(END_GAME_DELAY_MS);

        if (handler.sessionInfo.gameType === GameType.Multiplayer && handler.sessionData.isActive) {
            handler.endGame();
            logger.info(`Game ended: ${id}`);
        } else {
            handler.dispose();
            this.sessionHandlingService.removeHandler(id);
            logger.info(`Game disposed: ${id}`);
        }

        return true;
    }
}
