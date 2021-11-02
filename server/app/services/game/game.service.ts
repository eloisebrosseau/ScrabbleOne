import { JoinServerConfig, MultiplayerCreateConfig, MultiplayerJoinConfig, ServerConfig, SinglePlayerConfig } from '@common';
import { SessionHandlingService } from '@app/services/sessionHandling/session-handling.service';
import { BoardGeneratorService } from '@app/services/board/board-generator.service';
import { Service } from 'typedi';
import { SessionHandler } from '@app/handlers/session-handler/session-handler';
import { generateId } from '@app/classes/id';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { VirtualPlayer } from '@app/classes/player/virtual-player/virtual-player';
import { HumanPlayer } from '@app/classes/player/human-player/human-player';
import { Action } from '@app/classes/player/virtual-player/actions/action';
import { PlayerInfo } from '@app/classes/player-info';
import { DictionaryService } from '@app/services/dictionary/dictionary.service';
import { SocketService } from '@app/services/socket/socket-service';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import * as logger from 'winston';
import { PlayerHandler } from '@app/handlers/player-handler/player-handler';

@Service()
export class GameService {
    constructor(
        private readonly boardGeneratorService: BoardGeneratorService,
        private readonly sessionHandlingService: SessionHandlingService,
        private readonly dictionnaryService: DictionaryService,
        private readonly socketService: SocketService,
    ) {}

    async initSinglePlayer(gameConfig: SinglePlayerConfig): Promise<ServerConfig> {
        const board = this.boardGeneratorService.generateBoard(gameConfig.isRandomBonus);
        const sessionInfo = {
            id: generateId(),
            playTimeMs: gameConfig.playTimeMs,
            gameType: gameConfig.gameType,
        };

        const boardHandler = new BoardHandler(board, this.boardGeneratorService.generateBoardValidator(board));
        const reserveHandler = new ReserveHandler();
        const socketHandler = new SocketHandler(this.socketService);

        const sessionHandler = new SessionHandler(sessionInfo, boardHandler, reserveHandler, new PlayerHandler(), socketHandler);

        const humanPlayerInfo: PlayerInfo = {
            id: generateId(),
            name: gameConfig.playerName,
            isHuman: true,
        };

        const virtualPlayerInfo: PlayerInfo = {
            id: generateId(),
            name: gameConfig.virtualPlayerName,
            isHuman: false,
        };

        const humanPlayer = this.addHumanPlayer(humanPlayerInfo, sessionHandler);
        this.addVirtualPlayer(virtualPlayerInfo, sessionHandler);

        this.sessionHandlingService.addHandler(sessionHandler);

        logger.info(`Single player game: ${sessionHandler.sessionInfo.id} initialised`);

        return sessionHandler.getServerConfig(humanPlayer.id);
    }

    async initMultiplayer(gameConfig: MultiplayerCreateConfig): Promise<string> {
        const board = this.boardGeneratorService.generateBoard(gameConfig.isRandomBonus);
        const sessionInfo = {
            id: generateId(),
            playTimeMs: gameConfig.playTimeMs,
            gameType: gameConfig.gameType,
        };

        const boardHandler = new BoardHandler(board, this.boardGeneratorService.generateBoardValidator(board));
        const reserveHandler = new ReserveHandler();
        const socketHandler = new SocketHandler(this.socketService);

        const sessionHandler = new SessionHandler(sessionInfo, boardHandler, reserveHandler, new PlayerHandler(), socketHandler);

        const humanPlayerInfo: PlayerInfo = {
            id: generateId(),
            name: gameConfig.playerName,
            isHuman: true,
        };

        const humanPlayer = this.addHumanPlayer(humanPlayerInfo, sessionHandler);

        this.sessionHandlingService.addHandler(sessionHandler);

        logger.info(`Multiplayer game: ${sessionHandler.sessionInfo.id} initialised`);

        return humanPlayer.id;
    }

    async joinMultiplayer(gameConfig: MultiplayerJoinConfig): Promise<ServerConfig | null> {
        const sessionHandler = this.sessionHandlingService.getHandlerBySessionId(gameConfig.sessionId);

        if (sessionHandler == null || sessionHandler.sessionData.isStarted) {
            return null;
        }

        const humanPlayerInfo: PlayerInfo = {
            id: generateId(),
            name: gameConfig.playerName,
            isHuman: true,
        };

        const humanPlayer = this.addHumanPlayer(humanPlayerInfo, sessionHandler);

        this.sessionHandlingService.updateEntry(sessionHandler);

        logger.info(`Multiplayer game: ${sessionHandler.sessionInfo.id} joined by ${humanPlayerInfo.id}`);

        return sessionHandler.getServerConfig(humanPlayer.id);
    }

    async start(id: string): Promise<string | null> {
        const sessionHandler = this.sessionHandlingService.getHandlerByPlayerId(id);
        const waitingPlayer = sessionHandler?.players.filter((p) => p.id !== id)[0];

        if (sessionHandler == null || waitingPlayer == null || sessionHandler.sessionData.isStarted) {
            return null;
        }

        const startId = sessionHandler.start();

        const joinConfig: JoinServerConfig = { startId, serverConfig: sessionHandler.getServerConfig(waitingPlayer.id) };
        this.socketService.send('onJoin', sessionHandler.sessionInfo.id, joinConfig);

        logger.info(`Game started: ${id}`);

        return startId;
    }

    async stop(id: string): Promise<boolean> {
        const handler = this.sessionHandlingService.removeHandler(id);

        if (handler == null) {
            logger.warn(`Failed to stop game: ${id}`);
            return false;
        }

        handler.dispose();

        logger.info(`Game stopped: ${id}`);

        return true;
    }

    private addHumanPlayer(playerInfo: PlayerInfo, sessionHandler: SessionHandler): HumanPlayer {
        const humanPlayer = new HumanPlayer(playerInfo);
        sessionHandler.addPlayer(humanPlayer);

        return humanPlayer;
    }

    private addVirtualPlayer(playerInfo: PlayerInfo, sessionHandler: SessionHandler): VirtualPlayer {
        const actionCallback = (action: Action): Action | null => action.execute();
        const virtualPlayer = new VirtualPlayer(playerInfo, this.dictionnaryService, actionCallback);

        sessionHandler.addPlayer(virtualPlayer);

        return virtualPlayer;
    }
}