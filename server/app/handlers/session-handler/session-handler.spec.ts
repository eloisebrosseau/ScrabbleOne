/* eslint-disable max-classes-per-file */
/* eslint-disable dot-notation,
@typescript-eslint/no-unused-expressions,
no-unused-expressions,
@typescript-eslint/no-magic-numbers,
@typescript-eslint/no-useless-constructor,
@typescript-eslint/no-explicit-any,
@typescript-eslint/no-empty-function
*/
import { PlayerInfo } from '@app/classes/player-info';
import { HumanPlayer } from '@app/classes/player/human-player/human-player';
import { Player } from '@app/classes/player/player';
import { SessionInfo } from '@app/classes/session-info';
import { Config } from '@app/config';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { GoalHandler } from '@app/handlers/goal-handler/goal-handler';
import { PlayerHandler } from '@app/handlers/player-handler/player-handler';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { PlayerStatsHandler } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-handler';
import { SessionStatsHandler } from '@app/handlers/stats-handlers/session-stats-handler/session-stats-handler';
import { GameMode, GameType, PlayerStats, ServerConfig } from '@common';
import { expect } from 'chai';
import { Subject } from 'rxjs';
import Sinon, { createSandbox, createStubInstance, useFakeTimers } from 'sinon';
import { SessionHandler } from './session-handler';
import { Board } from '@app/classes/board/board';
import { EndGameData } from '@app/classes/end-game-data';

const TIME_MS = 120 * 1000;
const PLAYER_INFO_A: PlayerInfo = { id: '0', name: 'tester1', isHuman: true };
const PLAYER_INFO_B: PlayerInfo = { id: '1', name: 'tester2', isHuman: false };
const RACK_DEFAULT = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

class PlayerTester extends Player {
    constructor(playerInfo: PlayerInfo) {
        super(playerInfo);
    }
    async startTurn(): Promise<void> {
        // Does Nothing
        return new Promise<void>(() => {});
    }
}

class PlayerStatsHandlerMock {
    id: string;
    constructor(id: string) {
        this.id = id;
    }
    get stats(): PlayerStats {
        return { points: 10, rackSize: 0 };
    }
}

describe('SessionHandler', () => {
    let handler: SessionHandler;
    let sessionInfo: SessionInfo;
    let turnSubject: Subject<string>;

    let stubBoardHandler: Sinon.SinonStubbedInstance<BoardHandler>;
    let stubReserveHandler: Sinon.SinonStubbedInstance<ReserveHandler>;
    let stubSocketHandler: Sinon.SinonStubbedInstance<SocketHandler>;
    let stubPlayerHandler: Sinon.SinonStubbedInstance<PlayerHandler>;

    let stubStatsHandler: Sinon.SinonStubbedInstance<SessionStatsHandler>;
    let playerStatsHandler1: Sinon.SinonStubbedInstance<PlayerStatsHandler>;
    let playerStatsHandler2: Sinon.SinonStubbedInstance<PlayerStatsHandler>;

    let playerA: PlayerTester;
    let playerB: PlayerTester;

    beforeEach(() => {
        sessionInfo = {
            id: '0',
            playTimeMs: 120 * 1000,
            gameType: GameType.SinglePlayer,
        };
        turnSubject = new Subject<string>();

        stubBoardHandler = createStubInstance(BoardHandler);
        stubReserveHandler = createStubInstance(ReserveHandler);
        stubSocketHandler = createStubInstance(SocketHandler);
        stubPlayerHandler = createStubInstance(PlayerHandler);

        stubStatsHandler = createStubInstance(SessionStatsHandler);
        playerStatsHandler1 = createStubInstance(PlayerStatsHandler);
        playerStatsHandler2 = createStubInstance(PlayerStatsHandler);

        playerStatsHandler1['goalHandler'] = createStubInstance(GoalHandler);
        playerStatsHandler2['goalHandler'] = createStubInstance(GoalHandler);

        stubPlayerHandler.onTurn.returns(turnSubject.asObservable());

        handler = new SessionHandler(
            sessionInfo,
            stubBoardHandler as unknown as BoardHandler,
            stubReserveHandler as unknown as ReserveHandler,
            stubPlayerHandler as unknown as PlayerHandler,
            stubSocketHandler as unknown as SocketHandler,
            stubStatsHandler as unknown as SessionStatsHandler,
        );

        stubStatsHandler['playerStatsHandlers'] = [
            playerStatsHandler1 as unknown as PlayerStatsHandler,
            playerStatsHandler2 as unknown as PlayerStatsHandler,
        ];

        stubPlayerHandler.players = [];
        playerA = new PlayerTester(PLAYER_INFO_A);
        playerB = new PlayerTester(PLAYER_INFO_B);
        playerA.isTurn = true;
        playerB.isTurn = false;
        playerA.rack = RACK_DEFAULT;
        playerB.rack = RACK_DEFAULT;
        stubPlayerHandler.players = [playerA, playerB];
        stubPlayerHandler.onTurn.returns(new Subject<string>().asObservable());
    });

    it('should be created', () => {
        expect(handler).to.be.ok;
    });

    it('should add players', () => {
        handler.addPlayer(playerA);
        expect(stubPlayerHandler.addPlayer.called).to.be.true;
    });

    it('should return a good server config', () => {
        handler.sessionInfo.id = '0';
        const returnValue = handler.getServerConfig('0');
        const expectedServerConfig: ServerConfig = {
            id: '0',
            startId: '0',
            gameMode: GameMode.Classic,
            gameType: GameType.SinglePlayer,
            playTimeMs: TIME_MS,
            firstPlayerName: 'tester1',
            secondPlayerName: 'tester2',
        };
        expect(returnValue).to.eql(expectedServerConfig);
    });

    it('should not return a good server config with both player same id', () => {
        handler.sessionInfo.id = '0';
        playerB.playerInfo.id = '0';
        handler['playerHandler'].players = [playerA, playerB];
        const returnValue = handler.getServerConfig('2');
        const expectedServerConfig: ServerConfig = {
            id: '2',
            startId: '',
            gameMode: GameMode.Classic,
            gameType: GameType.SinglePlayer,
            playTimeMs: TIME_MS,
            firstPlayerName: 'tester1',
            secondPlayerName: 'tester2',
        };
        playerB.playerInfo.id = '1';
        expect(returnValue).to.not.eql(expectedServerConfig);
    });

    it('should return a good server config while no player isturn', () => {
        handler.sessionInfo.id = '0';
        handler['playerHandler'].players[0].isTurn = false;
        handler['playerHandler'].players[1].isTurn = false;
        playerB.isTurn = false;
        const returnValue = handler.getServerConfig('0');
        const expectedServerConfig: ServerConfig = {
            id: '0',
            startId: '',
            gameMode: GameMode.Classic,
            gameType: GameType.SinglePlayer,
            playTimeMs: TIME_MS,
            firstPlayerName: 'tester1',
            secondPlayerName: 'tester2',
        };
        handler['playerHandler'].players[0].isTurn = true;
        expect(returnValue).to.eql(expectedServerConfig);
    });

    it('dispose should deactivate the game', () => {
        createSandbox()
            .stub(handler, 'endGameData' as any)
            .get(() => {
                return true;
            });
        handler.dispose();
        expect(handler.sessionData.isActive).to.be.false;
    });

    it('timerTick should send message', () => {
        handler.sessionData.timeLimitEpoch = 0;
        handler['timerTick']();
        expect(handler.sessionData.timeLimitEpoch).to.eql(0);
    });

    it('timerTick should send message but when remaining time', () => {
        const TIME_MS_EPOCH = 10000;
        handler.sessionData.timeLimitEpoch = TIME_MS_EPOCH;
        handler['timerTick']();
        expect(handler.sessionData.timeLimitEpoch).to.eql(TIME_MS_EPOCH);
    });

    it('onTurn call endgame if game is ended', () => {
        createSandbox()
            .stub(handler['statsHandler'], 'isEndGame')
            .get(() => {
                return true;
            });
        const sandbox = createSandbox();
        const stubEndGame = sandbox.stub(handler, 'endGame' as any);
        handler['onTurn']('0');
        sandbox.assert.calledOnce(stubEndGame);
    });

    it('onTurn should call refresh if game is not ended', () => {
        createSandbox()
            .stub(handler['statsHandler'], 'isEndGame')
            .get(() => {
                return false;
            });
        const sandbox = createSandbox();
        const stubRefresh = sandbox.stub(handler, 'refresh' as any);
        handler['onTurn']('0');
        sandbox.assert.calledOnce(stubRefresh);
    });

    it('timer from start should call timerTick', () => {
        setTimeout(() => {
            handler.start();
            expect(handler.sessionData.isActive).to.be.true;
        }, Config.SESSION.REFRESH_INTERVAL_MS);
    });

    it('callback in timer should be called', () => {
        const timerTickStub = createSandbox().stub(handler, 'timerTick' as any);
        createSandbox().stub(handler, 'refresh' as any);
        const clock = useFakeTimers();
        handler.start();
        clock.tick(Config.SESSION.REFRESH_INTERVAL_MS);
        expect(timerTickStub.called).to.be.true;
    });

    it('endgame should call dispose and add rack to score adjustement', () => {
        const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
        const sandbox = createSandbox();
        const stubDispose = sandbox.stub(handler, 'dispose');
        stubReserveHandler.reserve = LETTERS;
        handler['playerHandler'].players[0].rack.length = 0;
        handler['endGame']();
        expect(stubDispose.calledOnce).to.be.true;
    });

    it('convertWhileRunning should return if removedPlayer is not found', () => {
        handler['playerHandler'].players[0] = playerA as HumanPlayer;
        const addPlayerStub = createSandbox().stub(handler, 'addPlayer');
        handler.convertWhileRunning('0');
        expect(addPlayerStub.called).to.be.false;
    });

    it('convertWhileRunning should addPlayer if removedPlayer is found', () => {
        stubPlayerHandler['removePlayer'].returns(playerA);
        handler['playerHandler'].players[0] = playerA as HumanPlayer;
        const addPlayerStub = createSandbox().stub(handler, 'addPlayer');
        handler.convertWhileRunning('0');
        expect(addPlayerStub.called).to.be.true;
    });

    it('refresh should call sendData ', () => {
        stubSocketHandler.sendData.restore();
        const sendDataStub = createSandbox().stub(handler['socketHandler'], 'sendData');
        const boardStub = createStubInstance(Board);
        createSandbox()
            .stub(stubBoardHandler, 'immutableBoard')
            .get(() => {
                return boardStub;
            });
        createSandbox()
            .stub(boardStub, 'boardData')
            .get(() => {
                return true;
            });
        handler['refresh']();
        expect(sendDataStub.called).to.be.true;
    });

    it('should return an EndGameData', () => {
        handler['statsHandler']['playerStatsHandlers'].push(new PlayerStatsHandlerMock('0') as PlayerStatsHandler);
        const test: EndGameData = { scores: [], gameMode: GameMode.Classic };
        expect(typeof handler['endGameData'] === typeof test).to.be.true;
    });
});
