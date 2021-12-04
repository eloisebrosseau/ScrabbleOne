/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { expect } from 'chai';
import { SessionStatsHandler } from '@app/handlers/stats-handlers/session-stats-handler/session-stats-handler';
import { GoalHandler } from '@app/handlers/goal-handler/goal-handler';
import { assert, createSandbox, createStubInstance, SinonStubbedInstance, stub } from 'sinon';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { PlayerStatsHandler } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-handler';
import { Subject } from 'rxjs';
import { Config } from '@app/config';
import { PlayerStats } from '@common';
const playerStats: PlayerStats = { points: 100, rackSize: 0 };
describe('SessionStatsHandler', () => {
    let handler: SessionStatsHandler;
    let goalHandlerStub: GoalHandler;
    let socketHandlerStub: SinonStubbedInstance<SocketHandler>;
    let reserveHandlerStub: ReserveHandler;
    let goalUpdateSubject: Subject<any>;

    beforeEach(() => {
        socketHandlerStub = createStubInstance(SocketHandler);
        socketHandlerStub['sendMessage'].callsFake(() => {});
        goalHandlerStub = createStubInstance(GoalHandler) as unknown as GoalHandler;
        goalUpdateSubject = new Subject<unknown>();
        goalHandlerStub['updateSubject'] = goalUpdateSubject;
        goalHandlerStub['start'] = () => {};
        reserveHandlerStub = createStubInstance(ReserveHandler) as unknown as ReserveHandler;
        handler = new SessionStatsHandler(socketHandlerStub as unknown as SocketHandler, reserveHandlerStub, goalHandlerStub);
        const playerStatsHandlerStub1 = createStubInstance(PlayerStatsHandler);
        playerStatsHandlerStub1['id'] = 'id';
        playerStatsHandlerStub1['rackScore'] = 7;
        playerStatsHandlerStub1['scoreAdjustment'] = 10;
        stub(playerStatsHandlerStub1, 'stats').get(() => {
            return playerStats;
        });
        handler['playerStatsHandlers'].push(playerStatsHandlerStub1 as unknown as PlayerStatsHandler);
        handler['playerStatsHandlers'].push(playerStatsHandlerStub1 as unknown as PlayerStatsHandler);
    });

    it('should be created', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(handler).to.be.ok;
    });

    it('should return playerhandler', () => {
        expect(handler.getPlayerStatsHandler('id')).to.be.instanceof(PlayerStatsHandler);
        handler['playerStatsHandlers'] = [];
        const sandbox = createSandbox();
        const playerStatsHandlerStub2 = createStubInstance(PlayerStatsHandler) as unknown as PlayerStatsHandler;
        playerStatsHandlerStub2['id'] = 'id';
        playerStatsHandlerStub2['rackScore'] = 7;
        playerStatsHandlerStub2['scoreAdjustment'] = 10;
        handler['playerStatsHandlers'].push(playerStatsHandlerStub2);
        const spy = sandbox.spy(handler['subscriptions'], 'push');
        expect(handler.getPlayerStatsHandler('666')).to.be.instanceof(PlayerStatsHandler);
        sandbox.assert.calledOnce(spy);
        sandbox.restore();
    });

    it('should start', () => {
        const sandbox = createSandbox();
        const spy = sandbox.spy(goalHandlerStub, 'start');
        handler.start();
        sandbox.assert.calledWith(spy, ['id', 'id']);
        sandbox.restore();
    });

    it('should end', () => {
        const sandbox = createSandbox();
        sandbox.stub(reserveHandlerStub, 'length').get(() => 0);
        handler.end();
        sandbox.restore();
        assert.called(socketHandlerStub.sendData);
    });

    it('should end and adjust scores', () => {
        const sandbox = createSandbox();
        const playerStatsHandlerStub1 = createStubInstance(PlayerStatsHandler);
        sandbox.stub(playerStatsHandlerStub1, 'stats').get(() => {
            return { points: 100, rackSize: 0 };
        });
        playerStatsHandlerStub1['rackSize'] = 0;
        handler.playerStatsHandlers = [
            playerStatsHandlerStub1 as unknown as PlayerStatsHandler,
            playerStatsHandlerStub1 as unknown as PlayerStatsHandler,
        ];
        sandbox.stub(reserveHandlerStub, 'length').get(() => 0);
        handler.end();
        sandbox.restore();
        assert.called(socketHandlerStub.sendData);
    });

    it('should tell when it has skipped', () => {
        const playerStatsHandlerStub1 = createStubInstance(PlayerStatsHandler) as unknown as PlayerStatsHandler;
        playerStatsHandlerStub1['skippedTurns'] = Config.MAX_SKIP_TURN + 1;
        handler['playerStatsHandlers'] = [playerStatsHandlerStub1];
        expect(handler['isOverSkipLimit']).to.be.true;

        playerStatsHandlerStub1['skippedTurns'] = Config.MAX_SKIP_TURN - 1;
        handler['playerStatsHandlers'] = [playerStatsHandlerStub1];
        expect(handler['isOverSkipLimit']).to.be.false;
    });

    it('should update data when triggered by events', () => {
        const sandbox = createSandbox();
        const playerStatsHandlerStub2 = createStubInstance(PlayerStatsHandler) as unknown as PlayerStatsHandler;
        playerStatsHandlerStub2['id'] = 'id';
        playerStatsHandlerStub2['rackScore'] = 7;
        playerStatsHandlerStub2['scoreAdjustment'] = 10;

        handler['playerStatsHandlers'].push(playerStatsHandlerStub2);
        handler['getPlayerStatsHandler']('id');
        goalUpdateSubject.next(undefined);
        sandbox.restore();
    });

    it('should tell when there is no winner', () => {
        const sandbox = createSandbox();
        handler['playerStatsHandlers'] = [];
        const playerStatsHandlerStub2 = createStubInstance(PlayerStatsHandler) as unknown as PlayerStatsHandler;
        playerStatsHandlerStub2['id'] = 'id2';
        playerStatsHandlerStub2['scoreAdjustment'] = 10;
        handler['playerStatsHandlers'].push(playerStatsHandlerStub2);
        sandbox.stub(playerStatsHandlerStub2, 'stats').get(() => {
            return { points: 100, rackSize: 0 };
        });
        const playerStatsHandlerStub1 = createStubInstance(PlayerStatsHandler) as unknown as PlayerStatsHandler;
        playerStatsHandlerStub1['id'] = 'id2';
        playerStatsHandlerStub1['scoreAdjustment'] = 10;
        handler['playerStatsHandlers'].push(playerStatsHandlerStub1);
        sandbox.stub(playerStatsHandlerStub1, 'stats').get(() => {
            return { points: 100, rackSize: 0 };
        });
        expect(handler['winnerId']).to.be.eq('');
        sandbox.restore();
    });

    it('should tell when game is finished', () => {
        expect(handler.isEndGame).to.be.true;
    });
});
