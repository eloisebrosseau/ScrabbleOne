/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation -- Need to access private properties for testing*/
/* eslint-disable max-classes-per-file -- Needs many stubbed classes in order to test*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { EndGameWinner } from '@app/classes/end-game-winner';
import { GameConfig } from '@app/classes/game-config';
import { PlayerType } from '@app/classes/player/player-type';
import { TimeSpan } from '@app/classes/time/timespan';
import { GameService } from '@app/services/game/game.service';
import { PlayerService } from '@app/services/player/player.service';
import { RackService } from '@app/services/rack/rack.service';
import { SessionService } from '@app/services/session/session.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { DictionaryMetadata, GameMode, GameType, ServerConfig, SessionStats, VirtualPlayerLevel } from '@common';
import { Observable, Subject } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environmentExt } from '@environment-ext';

const localUrl = (base: string, call: string, id?: string) => `${environmentExt.apiUrl}${base}/${call}${id ? '/' + id : ''}`;

const dictionary: DictionaryMetadata = {
    _id: 'dictionary.json',
    path: 'test.json',
    title: 'dict',
    description: 'Dictionary',
    nbWords: 1024,
};

@Injectable({
    providedIn: 'root',
})
class SessionServiceStub {
    private _id: string;
    private _gameConfig: GameConfig;

    constructor() {
        this._gameConfig = {
            gameType: GameType.Multiplayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };
    }

    get gameConfig(): GameConfig {
        return this._gameConfig;
    }
    get id(): string {
        return this._id;
    }
}

describe('GameService', () => {
    let service: GameService;
    let mockRack: string[];
    const session = new SessionServiceStub();
    let httpMock: HttpTestingController;

    let playerServiceSpyObj: jasmine.SpyObj<PlayerService>;
    let rackServiceSpyObj: jasmine.SpyObj<RackService>;
    let serverConfigObservableSpyObj: jasmine.SpyObj<Observable<ServerConfig>>;
    let sessionStatsObservableSpyObj: jasmine.SpyObj<Observable<SessionStats>>;
    let socketService: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        socketService = jasmine.createSpyObj('SocketClientService', ['on', 'reset', 'join', 'send']);
        const callback = (event: string, action: (Param: any) => void) => {
            action({});
        };
        socketService.on.and.callFake(callback);
        mockRack = ['K', 'E', 'S', 'E', 'I', 'O', 'V'];
        rackServiceSpyObj = jasmine.createSpyObj('RackService', ['update', 'refresh']);
        sessionStatsObservableSpyObj = jasmine.createSpyObj('Observable<SessionStats>', ['toPromise']);
        serverConfigObservableSpyObj = jasmine.createSpyObj('Observable<ServerConfig>', ['toPromise']);

        playerServiceSpyObj = jasmine.createSpyObj('playerService', ['startTurn', 'turnComplete', 'fillRack', 'reset', 'emptyRack', 'refresh'], {
            playerData: { score: 0, skippedTurns: 0, rack: [] },
            rack: mockRack,
            turnComplete: new Subject(),
        });
        playerServiceSpyObj.reset.and.returnValue();

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                { provide: PlayerService, useValue: playerServiceSpyObj },
                { provide: RackService, useValue: rackServiceSpyObj },
                { provide: SessionService, useValue: session },
                { provide: SocketClientService, useValue: socketService },
            ],
        });

        service = TestBed.inject(GameService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start single player', fakeAsync(() => {
        const config = {
            gameType: GameType.SinglePlayer,
            gameMode: GameMode.Log2990,
            virtualPlayerLevel: VirtualPlayerLevel.Easy,
            playTimeMs: 1000,
            playerName: 'Monique',
            virtualPlayerName: 'Alphonse',
            isRandomBonus: false,
            dictionary,
        };

        serverConfigObservableSpyObj.toPromise.and.resolveTo(config);

        service.startSinglePlayer(config).then(() => {
            expect(socketService.join).toHaveBeenCalled();
        });

        const request = httpMock.expectOne(localUrl('game', 'init/single'));
        request.flush({ isSuccess: true, payload: { id: '' } });
    }));

    it('should not start single player', fakeAsync(() => {
        const config = {
            gameType: GameType.SinglePlayer,
            gameMode: GameMode.Log2990,
            virtualPlayerLevel: VirtualPlayerLevel.Easy,
            playTimeMs: 1000,
            playerName: 'Monique',
            virtualPlayerName: 'Alphonse',
            isRandomBonus: false,
            dictionary,
        };

        serverConfigObservableSpyObj.toPromise.and.resolveTo(config);

        service.startSinglePlayer(config).then(() => {
            expect(socketService.join).not.toHaveBeenCalled();
        });

        const request = httpMock.expectOne(localUrl('game', 'init/single'));
        request.flush({ isSuccess: false, payload: { id: '' } });
    }));

    it('should reset playerService', async () => {
        await service.reset();
        expect(playerServiceSpyObj.reset).toHaveBeenCalled();
    });

    it('should not refresh and not change current turn if player type is equal to current player', async () => {
        const sessionId = '1';
        session['_id'] = '1';
        const playerType = PlayerType.Local;
        service['currentTurn'] = PlayerType.Local;
        const spy = spyOn<any>(service, 'refresh');

        await service['onNextTurn'](sessionId);
        spy.and.callThrough();
        expect(spy).not.toHaveBeenCalled();
        expect(service['currentTurn']).toBe(playerType);
    });

    it('should end game', async () => {
        const winnerId = '1';

        const gameConfig = {
            gameType: GameType.Multiplayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };

        const serverConfig = {
            id: '1',
            startId: '2',
            gameMode: GameMode.Log2990,
            gameType: GameType.Multiplayer,
            playTimeMs: 1000,
            firstPlayerName: 'Monique',
            secondPlayerName: 'Alphonse',
        };

        session['_id'] = '1';
        session['_gameConfig'] = gameConfig;

        await service['start'](serverConfig);
        spyOn<any>(service, 'onNextTurn').and.callThrough();
        await service['endGame'](winnerId);
        service['gameEndingSubject'].next();
        expect(session['_gameConfig'].firstPlayerName).toBe(gameConfig.firstPlayerName);
    });

    it('should call gameEnding.next with EndGameWinner.Draw', async () => {
        const gameConfig = {
            gameType: GameType.Multiplayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };

        const winnerId = '';
        const winner = EndGameWinner.Draw;
        session['_gameConfig'] = gameConfig;

        const spy = spyOn<any>(service['gameEndingSubject'], 'next');
        await service['endGame'](winnerId);
        expect(spy).toHaveBeenCalledWith(winner);
    });

    it('should call gameEnding.next with EndGameWinner.Remote', async () => {
        const gameConfig = {
            gameType: GameType.Multiplayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };

        const winnerId = '1';
        const winner = EndGameWinner.Remote;
        session['_id'] = '2';
        session['_gameConfig'] = gameConfig;

        const spy = spyOn<any>(service['gameEndingSubject'], 'next');
        await service['endGame'](winnerId);
        expect(spy).toHaveBeenCalledWith(winner);
    });

    it('should call observables', fakeAsync(() => {
        service.onTurn.subscribe((param) => {
            expect(param).toBe(PlayerType.Local);
        });

        service.onGameEnding.subscribe((param) => {
            expect(param).toBe(EndGameWinner.Remote);
        });

        service.onOpponentQuit.subscribe((param) => {
            expect(param).toBe('123');
        });

        service['turnSubject'].next(PlayerType.Local);
        service['gameEndingSubject'].next(EndGameWinner.Remote);
        service['opponentQuitingSubject'].next('123');
    }));

    it('should call onTurn.next if currentTurn is equal to playerType', async () => {
        const gameConfig = {
            gameType: GameType.SinglePlayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };

        const serverConfig = {
            id: '1',
            startId: '2',
            gameMode: GameMode.Log2990,
            gameType: GameType.Multiplayer,
            playTimeMs: 1000,
            firstPlayerName: 'Monique',
            secondPlayerName: 'Alphonse',
        };

        const stats = {
            localStats: { points: 10, rackSize: 7 },
            remoteStats: { points: 10, rackSize: 7 },
        };
        const id = '1';
        const playerType = PlayerType.Local;
        session['_id'] = '1';
        session['_gameConfig'] = gameConfig;
        service.stats = stats;
        service['currentTurn'] = playerType;

        const spy = spyOn<any>(service['gameEndingSubject'], 'next');
        await service['start'](serverConfig);
        spy.and.callThrough();
        await service['onNextTurn'](id);
        spy.and.callThrough();
        sessionStatsObservableSpyObj.toPromise.and.resolveTo(service.stats);
        spy.and.callThrough();

        expect(spy).not.toHaveBeenCalledWith(playerType);
    });

    it('should not call onTurn.next if currentTurn is equal to playerType', async () => {
        const gameConfig = {
            gameType: GameType.SinglePlayer,
            gameMode: GameMode.Classic,
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Monique',
        };

        const stats = {
            localStats: { points: 10, rackSize: 7 },
            remoteStats: { points: 10, rackSize: 7 },
        };

        const id = '1';
        const playerType = PlayerType.Local;
        session['_id'] = id;
        session['_gameConfig'] = gameConfig;
        service.stats = stats;
        service['currentTurn'] = playerType;
        service['gameRunning'] = true;

        const spy = spyOn<any>(service['gameEndingSubject'], 'next');
        spy.and.callThrough();
        await service['onNextTurn'](id);
        spy.and.callThrough();
        sessionStatsObservableSpyObj.toPromise.and.resolveTo(service.stats);
        spy.and.callThrough();

        expect(spy).not.toHaveBeenCalledWith(playerType);
    });
});
