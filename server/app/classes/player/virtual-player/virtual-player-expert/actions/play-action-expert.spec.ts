/* eslint-disable @typescript-eslint/no-unused-expressions,no-unused-expressions */
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { Placement } from '@common';
import { expect } from 'chai';
import Sinon, { createSandbox, createStubInstance, SinonSandbox, stub } from 'sinon';
import { PlayGenerator } from '@app/classes/virtual-player/play-generator';
import { Play } from '@app/classes/virtual-player/play';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { PlaceAction } from '@app/classes/player/virtual-player/actions/place-action';
import { PlayActionExpert } from '@app/classes/player/virtual-player/virtual-player-expert/actions/play-action-expert';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { ExchangeAction } from '@app/classes/player/virtual-player/actions/exchange-action';
import { PlayerStatsHandler } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-handler';

const VALID_PLACEMENT: Placement[] = [
    { letter: 'B', position: { x: 0, y: 0 } },
    { letter: 'a', position: { x: 0, y: 1 } },
    { letter: 'c', position: { x: 0, y: 2 } },
];
const PLAY: Play[] = [{ isSuccess: true, score: 12, placements: [], words: [] }];
const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

describe('PlayActionExpert', () => {
    let boardHandler: Sinon.SinonStubbedInstance<BoardHandler>;
    let socketHandler: Sinon.SinonStubbedInstance<SocketHandler>;
    let statsHandler: Sinon.SinonStubbedInstance<PlayerStatsHandler>;
    let reserveHandler: ReserveHandler;
    let playGeneratorA: Sinon.SinonStubbedInstance<PlayGenerator>;
    let playGeneratorB: Sinon.SinonStubbedInstance<PlayGenerator>;
    let sandboxRandom: SinonSandbox;
    let rack: string[];
    let action: PlayActionExpert;

    beforeEach(() => {
        socketHandler = createStubInstance(SocketHandler);

        boardHandler = createStubInstance(BoardHandler);
        boardHandler.lookupLetters.returns({ isSuccess: true, score: 0, placements: [], words: [] });
        boardHandler.placeLetters.returns({ isSuccess: false, description: '' });
        boardHandler.retrieveNewLetters.returns(VALID_PLACEMENT);

        reserveHandler = createStubInstance(ReserveHandler);

        statsHandler = createStubInstance(PlayerStatsHandler);

        playGeneratorA = createStubInstance(PlayGenerator);
        playGeneratorA.generateNext.returns(false);
        playGeneratorB = createStubInstance(PlayGenerator);
        playGeneratorB.generateNext.returns(false);

        rack = [];

        stub(playGeneratorA, 'orderedPlays').get(() => {
            return PLAY;
        });
        stub(playGeneratorB, 'orderedPlays').get(() => {
            return [];
        });

        action = new PlayActionExpert(
            boardHandler as unknown as BoardHandler,
            playGeneratorA as unknown as PlayGenerator,
            rack,
            statsHandler,
            socketHandler as unknown as SocketHandler,
            reserveHandler as unknown as ReserveHandler,
        );

        LETTERS.forEach((l) => rack.push(l));
        sandboxRandom = createSandbox();
    });

    afterEach(() => {
        sandboxRandom.restore();
    });

    it('should create action', () => {
        expect(action).to.be.ok;
    });

    it('should generate play', () => {
        sandboxRandom.stub(Math, 'random').returns(0);
        const returnValue = action.execute();
        expect(returnValue).to.be.not.null;
    });

    it('should not generate play', () => {
        action = new PlayActionExpert(
            boardHandler as unknown as BoardHandler,
            playGeneratorB as unknown as PlayGenerator,
            rack,
            statsHandler,
            socketHandler as unknown as SocketHandler,
            reserveHandler as unknown as ReserveHandler,
        );
        const returnValue = action.execute();
        expect(returnValue).to.be.instanceof(ExchangeAction);
    });

    it('should not generate plays', () => {
        const playGeneratorMock = createStubInstance(PlayGenerator);
        playGeneratorMock.generateNext.returns(false);
        stub(playGeneratorMock, 'orderedPlays').get(() => {
            return [];
        });
        action = new PlayActionExpert(
            boardHandler as unknown as BoardHandler,
            playGeneratorA as unknown as PlayGenerator,
            rack,
            statsHandler,
            socketHandler as unknown as SocketHandler,
            reserveHandler as unknown as ReserveHandler,
        );
        sandboxRandom.stub(Math, 'random').returns(0);
        const returnValue = action.execute();
        expect(returnValue).to.be.instanceof(PlaceAction);
    });
});
