import { Injectable } from '@angular/core';
import { Direction } from '@app/classes/board/direction';
import { PlayerType } from '@app/classes/player-type';
import { Vec2 } from '@app/classes/vec2';
import { Constants } from '@app/constants/global.constants';
import { BoardService } from '@app/services/board/board.service';
import { ReserveService } from '@app/services/reserve/reserve.service';
import { Subject } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
    providedIn: 'root',
})
export class PlayerService {
    turnComplete: Subject<PlayerType>;
    rackUpdated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
    private rack: string[] = [];

    constructor(private reserveService: ReserveService, private boardService: BoardService) {
        this.turnComplete = new Subject<PlayerType>();
    }

    placeLetters(word: string, position: Vec2, direction: Direction): string {
        const positionToPlace = this.boardService.retrieveNewLetters(word, position, direction);
        const lettersToPlace = positionToPlace.map((element) => element.letter).join('');

        const rackMessage = this.checkIfLettersInRack(lettersToPlace);
        if (rackMessage !== '') return rackMessage;

        const validationData = this.boardService.lookupLetters(positionToPlace);

        if (!validationData.isSuccess) return validationData.description;

        this.updateRack(lettersToPlace);
        this.updateReserve(positionToPlace.length);
        this.rackUpdated.next(!this.rackUpdated.getValue());

        this.boardService.placeLetters(positionToPlace);

        this.completeTurn();

        return '';
    }

    exchangeLetters(lettersToExchange: string): string {
        const lettersToExchangeLength = lettersToExchange.length;
        const rackMessage = this.checkIfLettersInRack(lettersToExchange);

        if (rackMessage !== '') return rackMessage;

        if (this.reserveService.length < Constants.MIN_SIZE) {
            return 'There are not enough letters in the reserve. You may not use this command.';
        }

        for (let i = 0; i < lettersToExchangeLength; i++) {
            this.rack.push(this.reserveService.drawLetter());
        }

        for (const letter of lettersToExchange) {
            this.reserveService.putBackLetter(letter);
        }

        this.updateRack(lettersToExchange);
        this.rackUpdated.next(!this.rackUpdated.getValue());

        this.completeTurn();

        return '';
    }

    completeTurn(): void {
        this.turnComplete.next(PlayerType.Local);
    }

    fillRack(lengthToFill: number): void {
        for (let i = 0; i < lengthToFill; i++) {
            this.rack.push(this.reserveService.drawLetter());
        }
    }

    emptyRack(): void {
        this.rack = [];
    }

    getRack(): string[] {
        return this.rack;
    }

    // For testing
    setRack(mockRack: string[]): void {
        this.rack = [];

        for (const letter of mockRack) {
            this.rack.push(letter);
        }
    }

    private updateReserve(lettersToPlaceLength: number): string {
        const reserveLength = this.reserveService.length;
        const rackPlaceLimit = Constants.MIN_SIZE - this.rack.length;

        if (this.reserveService.length === 0) return 'The reserve is empty. You cannot draw any letters.';

        if (lettersToPlaceLength > rackPlaceLimit) {
            lettersToPlaceLength = rackPlaceLimit;
        }

        if (reserveLength <= lettersToPlaceLength) {
            for (let i = 0; i < reserveLength; i++) {
                this.rack.push(this.reserveService.drawLetter());
            }
            return 'The reserve is now empty. You cannot draw any more letters.';
        }

        this.fillRack(lettersToPlaceLength);
        return '';
    }

    private updateRack(lettersToPlace: string): void {
        for (const letter of lettersToPlace) {
            const letterIndex = this.rack.indexOf(letter);
            if (letterIndex === -1) return;
            this.rack.splice(letterIndex, 1);
        }
    }

    private checkIfLettersInRack(lettersToPlace: string): string {
        for (const letter of lettersToPlace) {
            if (this.rack.indexOf(letter) === -1) {
                return 'You are not in possession of the letter ' + letter + '. Cheating is bad.';
            }
        }
        return '';
    }

    // For testing
    get length(): number {
        return this.rack.length;
    }
}
