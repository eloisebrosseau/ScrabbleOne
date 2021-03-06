/* eslint-disable dot-notation -- reserve is private and we need access for the test */
/* eslint-disable no-unused-expressions -- Needed for chai library assertions */
/* eslint-disable @typescript-eslint/no-unused-expressions -- Needed for chai library assertions */
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { expect } from 'chai';
import { createSandbox, SinonSandbox } from 'sinon';

describe('ReserveHandler', () => {
    let letterToExchange: string;
    let reserveHandler: ReserveHandler;
    let mathRandomSandbox: SinonSandbox;

    beforeEach(() => {
        letterToExchange = 'a';
        reserveHandler = new ReserveHandler();
        reserveHandler.reserve = ['a', 'a', 'a', 'b', 'b', 'c'];
        mathRandomSandbox = createSandbox();
    });

    afterEach(() => {
        mathRandomSandbox.restore();
    });

    it('should be created', () => {
        expect(reserveHandler).to.be.ok;
    });

    it('should have added letter in reserve at the correct index', () => {
        reserveHandler.putBackLetter(letterToExchange);

        expect(reserveHandler['reserve'][3]).to.equal('a');
    });

    it('should increase length of reserve by one if letterToExchange successfully added', () => {
        const currentLength = reserveHandler.length;
        reserveHandler.putBackLetter(letterToExchange);

        expect(reserveHandler.length).to.equal(currentLength + 1);
    });

    it('should not add anything to reserve if empty letterToExchange', () => {
        const currentLength = reserveHandler.length;
        letterToExchange = '';

        reserveHandler.putBackLetter(letterToExchange);
        expect(reserveHandler.length).to.equal(currentLength);
    });

    it('should not affect reserve if trying to put back anything but a lower case letter', () => {
        const currentLength = reserveHandler.length;
        reserveHandler.putBackLetter('3');
        reserveHandler.putBackLetter('N');
        reserveHandler.putBackLetter('$');
        expect(reserveHandler.length).to.equal(currentLength);
    });

    it('should correctly put back and sort the reserve if trying to put back a letter that was not previously in the reserve', () => {
        const LETTER_INDEX = 4;
        const LETTERS = ['a', 'a', 'b', 'c', 'e', 'd'];

        reserveHandler.reserve.length = 0;
        LETTERS.forEach((l) => reserveHandler.putBackLetter(l));
        expect(reserveHandler['reserve'][LETTER_INDEX]).to.equal('d');
    });

    it('should decrease length of reserve if letter successfully drawn', () => {
        mathRandomSandbox.stub(Math, 'random').returns(0);
        const currentLength = reserveHandler.length;
        reserveHandler.drawLetterFromReserve();
        expect(reserveHandler.length).to.equal(currentLength - 1);
    });

    it('should successfully return the drawn letter from reserve', () => {
        const RANDOM_STUB_VALUE = 0.7;
        mathRandomSandbox.stub(Math, 'random').returns(RANDOM_STUB_VALUE);
        expect(reserveHandler.drawLetterFromReserve()).to.equal('b');
    });

    it('should return letter at first index in reserve', () => {
        mathRandomSandbox.stub(Math, 'random').returns(0);
        expect(reserveHandler.drawLetterFromReserve()).to.equal('a');
    });

    it('should return letter at last index in reserve', () => {
        mathRandomSandbox.stub(Math, 'random').returns(1);
        expect(reserveHandler.drawLetterFromReserve()).to.equal('c');
    });

    it('should return reserve length', () => {
        expect(reserveHandler.length).to.equal(reserveHandler['reserve'].length);
    });
});
