import { EndGameData } from '@app/classes/end-game-data';
import { PlayerInfo } from '@app/classes/player-info';
import { Player } from '@app/classes/player/player';
import { Action } from '@app/classes/player/virtual-player/actions/action';
import { VirtualPlayerExpert } from '@app/classes/player/virtual-player/virtual-player-expert/virtual-player-expert';
import { SessionData } from '@app/classes/session-data';
import { SessionInfo } from '@app/classes/session-info';
import { Config } from '@app/config';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { PlayerHandler } from '@app/handlers/player-handler/player-handler';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { PlayerStatsHandler } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-handler';
import { SessionStatsHandler } from '@app/handlers/stats-handlers/session-stats-handler/session-stats-handler';
import { GameMode, GameType, MessageType, Score, ServerConfig, SystemMessages } from '@common';
import { Subscription } from 'rxjs';
import * as logger from 'winston';

export class SessionHandler {
    sessionData: SessionData;
    private timer: NodeJS.Timer;

    private readonly playerSubscription: Subscription;

    constructor(
        public sessionInfo: SessionInfo,
        public boardHandler: BoardHandler,
        public reserveHandler: ReserveHandler,
        private playerHandler: PlayerHandler,
        private socketHandler: SocketHandler,
        private statsHandler: SessionStatsHandler,
    ) {
        this.sessionData = { isActive: false, isStarted: false, timeLimitEpoch: 0 };
        this.playerSubscription = this.playerHandler.onTurn().subscribe((id) => this.onTurn(id));
    }

    getServerConfig(sessionId: string): ServerConfig {
        const firstPlayer = this.players.find((p) => p.id === sessionId) ?? this.players[0];
        const secondPlayer = this.players.find((p) => p.id !== firstPlayer.id) ?? this.players[1];

        return {
            id: firstPlayer.id,
            startId: this.players.filter((p) => p.isTurn).map((p) => p.id)[0] ?? '',
            gameType: this.sessionInfo.gameType,
            gameMode: this.gameMode,
            playTimeMs: this.sessionInfo.playTimeMs,
            firstPlayerName: firstPlayer.playerInfo.name,
            secondPlayerName: secondPlayer.playerInfo.name,
        };
    }

    start(): void {
        this.sessionData.isActive = true;
        this.sessionData.isStarted = true;
        this.timer = setInterval(() => this.timerTick(), Config.SESSION.REFRESH_INTERVAL_MS);

        this.refresh();
        this.statsHandler.start();
        this.playerHandler.start();

        this.socketHandler.sendMessage({ title: 'Commandes possibles', body: SystemMessages.HelpMessage, messageType: MessageType.System });

        logger.info(`Game ${this.sessionInfo.id} started`);
    }

    dispose(): EndGameData {
        this.sessionData.isActive = false;
        this.sessionData.timeLimitEpoch = 0;
        this.playerHandler.dispose();
        this.playerSubscription.unsubscribe();
        clearInterval(this.timer);

        return this.endGameData;
    }

    addPlayer(player: Player): void {
        player.init(this.boardHandler, this.reserveHandler, this.socketHandler, this.statsHandler);
        this.playerHandler.addPlayer(player);
    }

    convertWhileRunning(playerId: string): void {
        logger.debug(`SessionHandler - convert - PlayerId: ${playerId}`);

        const removedPlayer = this.playerHandler.removePlayer(playerId);

        if (removedPlayer == null) {
            logger.warn(`Failed to convert player (${playerId})`);
            return;
        }

        this.sessionInfo.gameType = GameType.SinglePlayer;
        const virtualPlayerInfo: PlayerInfo = {
            id: removedPlayer.playerInfo.id,
            name: removedPlayer.playerInfo.name + ' Virtuel',
            isHuman: false,
        };

        const actionCallback = (action: Action): Action | null => action.execute();
        const virtualPlayer = new VirtualPlayerExpert(this.boardHandler.dictionaryHandler, virtualPlayerInfo, actionCallback);

        this.addPlayer(virtualPlayer);
        this.socketHandler.sendData('opponentQuit', virtualPlayerInfo.name);

        logger.info(`Player converted: ${playerId}`);
    }

    private endGame(): void {
        logger.debug(`SessionHandler - EndGame - Id: ${this.sessionInfo.id}`);

        this.statsHandler.end();

        const winner = this.statsHandler.winnerId;
        this.socketHandler.sendData('endGame', winner);
        logger.debug(`winner: ${winner}`);

        this.dispose();
    }

    get players(): Player[] {
        return this.playerHandler.players;
    }

    get gameMode(): GameMode {
        return this.statsHandler.gameMode;
    }

    private timerTick(): void {
        const timeLeftMs = Math.max(0, this.sessionData.timeLimitEpoch - new Date().getTime());
        if (timeLeftMs === 0) {
            this.players.forEach((p) => (p.isTurn = false));
        }

        this.socketHandler.sendData('timerTick', { ms: timeLeftMs });
    }

    private onTurn(id: string): void {
        if (this.statsHandler.isEndGame) {
            this.endGame();
            return;
        }

        this.refresh();

        this.players.find((p) => p.id === id)?.startTurn();
        this.sessionData.timeLimitEpoch = new Date().getTime() + this.sessionInfo.playTimeMs;
    }

    private refresh(): void {
        this.socketHandler.sendData('board', this.boardHandler.immutableBoard.boardData);
        this.socketHandler.sendData('reserve', this.reserveHandler.reserve);
    }

    private get endGameData(): EndGameData {
        const scores: Score[] = this.players
            .filter((p) => p.playerInfo.isHuman)
            .map((p) => {
                const playerStatsHandler = this.statsHandler.playerStatsHandlers.find((s) => s.id === p.id) as PlayerStatsHandler;

                return {
                    name: p.playerInfo.name,
                    scoreValue: playerStatsHandler.stats.points,
                };
            });

        return {
            scores,
            gameMode: this.gameMode,
        };
    }
}
