/* eslint-disable max-classes-per-file -- Need to implements many stubs */
/* eslint-disable no-unused-expressions -- To be */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Board, ImmutableBoard } from '@app/classes/board/board';
import { Dictionary } from '@app/classes/dictionary/dictionary';
import { ValidationResponse } from '@app/classes/validation/validation-response';
import { Config } from '@app/config';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { Direction, Placement } from '@common';
import { expect } from 'chai';
import { PlayGenerator } from './play-generator';

class StubDictionary implements Dictionary {
    words: string[] = [];

    lookUpStart(lookupWord: string): { isWord: boolean; isOther: boolean } {
        let isWord = false;
        let isOther = false;
        for (const word of this.words) {
            if (lookupWord > word) {
                continue;
            }

            if (lookupWord === word) {
                isWord = true;
            }

            if (word.substring(0, lookupWord.length) === lookupWord) {
                isOther = true;
            }
        }

        return { isWord, isOther };
    }

    lookUpEnd(lookupWord: string): boolean {
        let isOther = false;

        for (const word of this.words) {
            if (lookupWord > word) {
                continue;
            }

            if (word.substring(word.length - lookupWord.length, word.length) === lookupWord) {
                isOther = true;
            }
        }

        return isOther;
    }

    lookup(word: string): boolean {
        return this.words.find((w) => w === word) !== undefined;
    }
}

class BoardHandlerMock {
    isValid = true;
    board = new Board(Config.GRID.GRID_SIZE);
    foundWords: Placement[][] = [];

    // eslint-disable-next-line no-unused-vars -- Parameters are not needed here as we already got the in retrieveNewLetters.
    lookupLetters(letters: Placement[]): ValidationResponse {
        this.foundWords.push(letters);
        return this.isValid ? { isSuccess: true, score: 0, placements: [], words: [] } : { isSuccess: false, description: '' };
    }

    retrieveNewLetters(letters: Placement[]): Placement[] {
        return letters;
    }

    get immutableBoard(): ImmutableBoard {
        return this.board;
    }
}

describe('PlayGenerator', () => {
    let boardHandlerMock: BoardHandlerMock;
    let stubDictionary: StubDictionary;

    beforeEach(() => {
        boardHandlerMock = new BoardHandlerMock();
        stubDictionary = new StubDictionary();
    });

    it('should be created', () => {
        expect(new PlayGenerator(stubDictionary, boardHandlerMock as unknown as BoardHandler, [])).to.be.ok;
    });

    it('should generate word on empty board', () => {
        const WORD = 'angular';
        stubDictionary.words.push(WORD);

        const playGenerator = new PlayGenerator(stubDictionary, boardHandlerMock as unknown as BoardHandler, WORD.split(''));
        playGenerator.generateNext();

        expect(boardHandlerMock.foundWords[0].length).to.equal(WORD.length);
    });

    it('should retrieve existing word', () => {
        const WORD = 'scrabble';
        boardHandlerMock.board.merge([
            { letter: 's', position: { x: 7, y: 7 } },
            { letter: 'c', position: { x: 8, y: 7 } },
            { letter: 'r', position: { x: 9, y: 7 } },
            { letter: 'a', position: { x: 10, y: 7 } },
            { letter: 'b', position: { x: 11, y: 7 } },
            { letter: 'b', position: { x: 12, y: 7 } },
            { letter: 'l', position: { x: 13, y: 7 } },
            { letter: 'e', position: { x: 14, y: 7 } },
        ]);

        const playGenerator = new PlayGenerator(stubDictionary, boardHandlerMock as unknown as BoardHandler, []);
        // eslint-disable-next-line dot-notation -- Needed for private method testing
        const startPosition = playGenerator['retrieveStartPosition']({ x: 14, y: 7 }, Direction.Right);
        // eslint-disable-next-line dot-notation -- Needed for private method testing
        const retrievedWord = playGenerator['retrieveExistingWord'](startPosition, Direction.Right);

        expect(startPosition).to.eql({ x: 7, y: 7 });
        expect(retrievedWord).to.eql(WORD);
    });

    it('should generate word on non-empty board', () => {
        const GENERATED_WORD = 'lassitude';
        const RACK = ['s', 's', 'i', 't', 'u', 'd', 'e'];
        stubDictionary.words.push(GENERATED_WORD);
        boardHandlerMock.board.merge([
            { letter: 'l', position: { x: 7, y: 7 } },
            { letter: 'a', position: { x: 8, y: 7 } },
        ]);

        const playGenerator = new PlayGenerator(stubDictionary, boardHandlerMock as unknown as BoardHandler, RACK);
        playGenerator.generateNext();

        expect(boardHandlerMock.foundWords[0].length).to.equal(GENERATED_WORD.length);
        expect(playGenerator.orderedPlays.length).to.equal(1);
    });

    it('should not generate non validated words', () => {
        const WORD = 'angular';
        stubDictionary.words.push(WORD);

        boardHandlerMock.isValid = false;
        const playGenerator = new PlayGenerator(stubDictionary, boardHandlerMock as unknown as BoardHandler, WORD.split(''));
        playGenerator.generateNext();

        expect(playGenerator.orderedPlays.length).to.equal(0);
    });
});
