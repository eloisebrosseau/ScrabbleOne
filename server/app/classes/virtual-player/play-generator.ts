import { Direction, reverseDirection, Vec2, Square, Placement } from '@common';
import { ImmutableBoard } from '@app/classes/board/board';
import { Dictionary } from '@app/classes/dictionary/dictionary';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { Play } from '@app/classes/virtual-player/play';

interface PositionedWord {
    word: string;
    startPosition: number;
}

export class PlayGenerator {
    private readonly plays: Play[];
    private readonly board: ImmutableBoard;
    private readonly dictionary: Dictionary;
    private readonly boardHandler: BoardHandler;
    private readonly availableLetters: string[];
    private readonly positionsToTry: Vec2[];

    constructor(dictionary: Dictionary, boardHandler: BoardHandler, availableLetters: string[]) {
        this.plays = [];

        this.board = boardHandler.immutableBoard;
        this.positionsToTry = this.board.positions.length === 0 ? [this.board.center] : this.board.positions;
        this.dictionary = dictionary;
        this.boardHandler = boardHandler;
        this.availableLetters = availableLetters;
    }

    private static getRandomPosition(excludedMax: number): number {
        return Math.floor(Math.random() * excludedMax);
    }

    private static generatePlacement(positionWord: PositionedWord, startPosition: Vec2, direction: Direction): Placement[] {
        const placements: Placement[] = [];
        let increment: Vec2;
        let position: Vec2;

        if (direction === Direction.Right) {
            increment = { x: 1, y: 0 };
            position = { x: positionWord.startPosition, y: startPosition.y };
        } else {
            increment = { x: 0, y: 1 };
            position = { x: startPosition.x, y: positionWord.startPosition };
        }

        for (const letter of positionWord.word) {
            placements.push({ letter, position: { x: position.x, y: position.y } });
            position.x += increment.x;
            position.y += increment.y;
        }

        return placements;
    }

    generateNext(): boolean {
        const positionIndex = PlayGenerator.getRandomPosition(this.positionsToTry.length);
        const position = this.positionsToTry.splice(positionIndex, 1);
        this.tryGenerate(position[0], Direction.Right);
        this.tryGenerate(position[0], Direction.Down);

        return this.positionsToTry.length !== 0;
    }

    get orderedPlays(): Play[] {
        return Array.from(this.plays).sort((a, b) => b.score - a.score);
    }

    private tryGenerate(position: Vec2, direction: Direction): void {
        const startPosition = this.retrieveStartPosition(position, direction);
        const existingWord = this.retrieveExistingWord(startPosition, direction);

        const foundWords = this.findWords(existingWord, direction === Direction.Right ? startPosition.x : startPosition.y);

        for (const positionedWord of foundWords) {
            const letters = this.boardHandler.retrieveNewLetters(PlayGenerator.generatePlacement(positionedWord, startPosition, direction));
            const response = this.boardHandler.lookupLetters(letters);
            if (response.isSuccess) {
                this.plays.push(response);
            }
        }
    }

    private retrieveStartPosition(position: Vec2, direction: Direction) {
        const reversedDirection = reverseDirection(direction);
        let square = this.board.getRelative(position, reversedDirection);

        while (square != null && square.letter !== '') {
            position = square.position;
            square = this.board.getRelative(square.position, reversedDirection);
        }

        return position;
    }

    private retrieveExistingWord(firstPosition: Vec2, direction: Direction): string {
        let word = '';
        let square: Square | null = this.board.getSquare(firstPosition);

        while (square != null && square.letter !== '') {
            word += square.letter;
            square = this.board.getRelative(square.position, direction);
        }

        return word;
    }

    private findWords(startWord: string, startPosition: number): PositionedWord[] {
        const generatedWords: PositionedWord[] = [];
        this.findWord(generatedWords, this.availableLetters, { word: startWord, startPosition }, true);
        this.findWord(generatedWords, this.availableLetters, { word: startWord, startPosition }, false);

        const filter = new Map<string, PositionedWord>();
        generatedWords.forEach((w) => filter.set(w.word + w.startPosition, w));

        return Array.from(filter.values());
    }

    private findWord(generatedWords: PositionedWord[], letters: string[], startWord: PositionedWord, isForward: boolean) {
        for (let index = 0; index < letters.length; index++) {
            const positionedWord = Object.assign({}, startWord);

            if (isForward) {
                positionedWord.word = startWord.word + letters[index];
            } else {
                positionedWord.word = letters[index] + startWord.word;
                positionedWord.startPosition--;
            }

            const { isWord, isOther: isOtherStart } = this.dictionary.lookUpStart(positionedWord.word);

            const isOtherEnd = this.dictionary.lookUpEnd(positionedWord.word);

            if (isWord) {
                generatedWords.push(positionedWord);
            }

            const clonedLetters = letters.slice();
            clonedLetters.splice(index, 1);

            if (isOtherStart) {
                this.findWord(generatedWords, clonedLetters, positionedWord, true);
            }

            if (isOtherEnd) {
                this.findWord(generatedWords, clonedLetters, positionedWord, false);
            }
        }
    }
}
