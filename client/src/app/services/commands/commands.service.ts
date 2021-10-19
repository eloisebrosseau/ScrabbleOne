import { Injectable } from '@angular/core';
import { Direction } from '@app/classes/board/direction';
import { MessageType } from '@app/classes/message';
import { PlayerType } from '@app/classes/player-type';
import { Constants } from '@app/constants/global.constants';
import { SystemMessages } from '@app/constants/system-messages.constants';
import { GameService } from '@app/services/game/game.service';
import { MessagingService } from '@app/services/messaging/messaging.service';
import { PlayerService } from '@app/services/player/player.service';
import { letterDefinitions, Vec2 } from '@common';
import { ReserveService } from '../reserve/reserve.service';

@Injectable({
    providedIn: 'root',
})
export class CommandsService {
    placeWordCommandRegex: RegExp = /^([a-o]){1}([1-9]|1[0-5]){1}([hv]){1}$/;
    wordRegex: RegExp = /^[A-zÀ-ú]{1,15}$/;
    rackRegex: RegExp = /^[a-z*]{1,7}$/;
    messageRegex: RegExp = /^[A-zÀ-ú0-9 !.?'"]{1,512}$/;

    constructor(public messagingService: MessagingService, public playerService: PlayerService, public gameService: GameService, public reserveService: ReserveService) {}

    parseInput(input: string): boolean {
        // Arguments: [COMMAND, OPTIONS, WORD]
        if (input.startsWith('!')) {
            let successfulCommand = true;
            const args = input.split(' ');
            switch (args[0]) {
                case '!aide':
                    this.showHelp();
                    break;
                case '!debug':
                    this.toggleDebug();
                    break;
                case '!placer':
                    successfulCommand = this.checkPlaceCommand(args[1], this.removeAccents(args[2]));
                    break;
                case '!passer':
                    successfulCommand = this.skipTurn();
                    break;
                case '!echanger':
                    successfulCommand = this.exchangeLetters(this.removeAccents(args[1]));
                    break;
                case '!réserve':
                    successfulCommand = this.displayReserve();
                    break;
                default:
                    this.messagingService.send('', SystemMessages.InvalidCommand, MessageType.Error);
                    return false;
            }
            if (successfulCommand) this.messagingService.send('Commande réussie', input, MessageType.System, this.gameService.currentTurn);
        } else {
            if (this.messageRegex.test(input)) {
                this.messagingService.send('', input, MessageType.Message);
            } else {
                this.messagingService.send(SystemMessages.InvalidFormat, SystemMessages.InvalidUserMessage, MessageType.Error);
                return false;
            }
        }
        return true;
    }

    // Source: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript by Lewis Diamond on 05/29/16
    private removeAccents(word: string): string {
        return word.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    }

    private displayReserve(): boolean {
        // (title: string, body: string, messageType: MessageType, user?: PlayerType
        let body = '';
        for (const [letter, letterData] of letterDefinitions) {
            /*
                TODO:
                    1. A vérifier: Changer le return de getLetterQuantity a string (et les tests pertinents)
                    2. Get lettre de la réserve et leur current quantity et rajouter dans un string []
                    3. Join le array
                    4. Tester lol
                    5. Afficher taille réserve dans panneau
            */
            this.reserveService.getLetterQuantity(letter);
            this.messagingService.send(SystemMessages.ReserveContentTitle, body, MessageType.Error);
        }

        return true;
    }

    private showHelp() {
        this.messagingService.send(SystemMessages.HelpTitle, SystemMessages.HelpMessage, MessageType.System);
    }

    private checkPlaceCommand(options: string, word: string): boolean {
        if (!this.isUsersTurn()) return false;

        if (!this.placeWordCommandRegex.test(options)) {
            this.messagingService.send('', SystemMessages.InvalidOptions, MessageType.Error);
            return false;
        }
        // Arguments: [COMMAND, OPTIONS, WORD]
        // Options: [Y, X, DIRECTION]
        if (this.wordRegex.test(word)) {
            const yCoordinate = Number(options.charCodeAt(0) - Constants.CHAR_OFFSET);
            const xCoordinate = Number(options.charAt(1)) - 1;
            const direction: Direction = options.charAt(2) === 'v' ? Direction.Down : Direction.Right;
            const vecCoordinate: Vec2 = { x: xCoordinate, y: yCoordinate };
            this.playerService.placeLetters(word, vecCoordinate, direction);
        } else {
            this.messagingService.send('', SystemMessages.InvalidWord, MessageType.Error);
            return false;
        }

        return true;
    }

    private exchangeLetters(letters: string): boolean {
        if (!this.isUsersTurn()) return false;

        if (this.rackRegex.test(letters)) {
            this.playerService.exchangeLetters(letters);
            return true;
        } else {
            this.messagingService.send('', SystemMessages.InvalidLetters, MessageType.Error);
            return false;
        }
    }

    private skipTurn(): boolean {
        if (!this.isUsersTurn()) return false;

        this.playerService.completeTurn();
        return true;
    }

    private toggleDebug(): void {
        this.messagingService.debuggingMode = !this.messagingService.debuggingMode;
        this.messagingService.send('', this.messagingService.debuggingMode ? SystemMessages.DebugOn : SystemMessages.DebugOff, MessageType.Log);
    }

    private isUsersTurn(): boolean {
        if (this.gameService.currentTurn === PlayerType.Virtual) {
            this.messagingService.send('', SystemMessages.InvalidTurn, MessageType.Log);
            return false;
        }
        return true;
    }
}
