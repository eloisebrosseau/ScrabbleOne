import { Injectable } from '@angular/core';
import { Direction } from '@app/classes/board/direction';
import { PlayerType } from '@app/classes/player-type';
import { Vec2 } from '@app/classes/vec2';
import { BoardService } from '@app/services/board/board.service';
import { ReserveService } from '@app/services/reserve/reserve.service';
import { Subject } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root',
})
export class PlayerService {
    rack: string[] = [];
    turnComplete: Subject<PlayerType>;
    rackUpdated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

    constructor(private reserveService: ReserveService, private boardService: BoardService) {
        const initNbTiles = 7;

        for (let tile = 0; tile < initNbTiles; tile++) {
            this.rack.push(this.reserveService.drawLetter());
        }

        this.turnComplete = new Subject<PlayerType>();
    }

    placeLetters(word: string, position: Vec2, direction: Direction): string {
        const lettersToPlace = this.boardService.retrieveNewLetters(word, position, direction);
        const rackMessage = this.checkIfLettersInRack(word);
        if (rackMessage !== '') return rackMessage;

        const validationData = this.boardService.lookupLetters(lettersToPlace);

        if (!validationData.isSuccess) return validationData.description;

        this.updateRack(lettersToPlace.map((e) => e.letter).join());
        this.updateReserve(lettersToPlace.length);
        this.rackUpdated.next(!this.rackUpdated.getValue());

        this.boardService.placeLetters(lettersToPlace);

        this.completeTurn();

        return '';
    }

    exchangeLetters(lettersToExchange: string): string {
        const minLettersInReserve = 7;
        const lettersToExchangeLength = lettersToExchange.length;
        const rackMessage = this.checkIfLettersInRack(lettersToExchange);

        if (rackMessage !== '') return rackMessage;

        if (this.reserveService.length < minLettersInReserve) {
            return 'There are not enough letters in the reserve. You may not use this command.';
        }

        for (let i = 0; i < lettersToExchangeLength; i++) {
            this.rack.push(this.reserveService.drawLetter());
        }

        // we forgot to add update rack here
        for (const letter of lettersToExchange) {
            this.reserveService.putBackLetter(letter);
        }

        this.updateRack(lettersToExchange);

        this.completeTurn();

        return '';
    }

    completeTurn(): void {
        this.turnComplete.next(PlayerType.Local);
    }

    updateReserve(lettersToPlaceLength: number): string {
        const reserveLength = this.reserveService.length;

        if (this.reserveService.length === 0) return 'The reserve is empty. You cannot draw any letters.';

        if (this.reserveService.length <= lettersToPlaceLength) {
            for (let i = 0; i < reserveLength; i++) {
                this.rack.push(this.reserveService.drawLetter());
            }
            return 'The reserve is now empty. You cannot draw any more letters.';
        }

        if (this.reserveService.length > lettersToPlaceLength) {
            for (let i = 0; i < lettersToPlaceLength; i++) {
                this.rack.push(this.reserveService.drawLetter());
            }
            return '';
        }

        return 'There was a problem with reserve service. Try again.';
    }

    // For testing
    setRack(mockRack: string[]): void {
        this.rack = [];

        for (const letter of mockRack) {
            this.rack.push(letter);
        }
    }

    // For testing
    get length(): number {
        return this.rack.length;
    }

    private updateRack(lettersToPlace: string): void {
        for (const letter of lettersToPlace) {
            const letterIndex = this.rack.indexOf(letter.toUpperCase());
            if (letterIndex === -1) return;
            this.rack.splice(letterIndex, 1);
        }
    }

    private isCapitalLetter(letter: string): boolean {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        return letter.charCodeAt(0) >= 65 && letter.charCodeAt(0) <= 90;
    }

    private checkIfLettersInRack(lettersToPlace: string): string {
        for (let letter of lettersToPlace) {
            if (this.isCapitalLetter(letter)) {
                letter = '*';
            }
            if (this.rack.indexOf(letter.toUpperCase()) === -1) {
                return 'You are not in possession of the letter ' + letter + '. Cheating is bad.';
            }
        }
        return '';
    }
}
