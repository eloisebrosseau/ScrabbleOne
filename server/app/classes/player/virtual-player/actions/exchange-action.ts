import { SkipAction } from '@app/classes/player/virtual-player/actions/skip-action';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { PlayerStatsNotifier } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-notifier';
import { MessageType } from '@common';
import * as logger from 'winston';
import { Action } from './action';

export class ExchangeAction implements Action {
    constructor(
        private readonly reserve: ReserveHandler,
        private readonly socketHandler: SocketHandler,
        private readonly statsNotifier: PlayerStatsNotifier,
        private readonly rack: string[],
        private isRandom: boolean,
    ) {}

    execute(): Action | null {
        if (this.reserve.length === 0) {
            logger.debug('Reserve empty - Skip');
            return new SkipAction(this.statsNotifier, this.socketHandler);
        }

        const exchangeCount = this.exchangeSize;
        const lettersToExchange: string[] = [];

        // Remove letter from rack
        for (let i = 0; i < exchangeCount; i++) {
            const indexToReplace = Math.floor(Math.random() * this.rack.length);
            lettersToExchange.push(this.rack.splice(indexToReplace, 1)[0]);
        }

        // Add back letters from reserve
        lettersToExchange.forEach(() => this.rack.push(this.reserve.drawLetterFromReserve()));

        // Put back letters in reserve
        lettersToExchange.forEach((letter) => this.reserve.putBackLetter(letter));

        this.statsNotifier.notifyExchange();
        this.statsNotifier.notifyRackUpdate(this.rack);
        this.socketHandler.sendMessage({ title: '', body: `${exchangeCount} lettres échangées`, messageType: MessageType.Message });

        return null;
    }

    private get exchangeSize(): number {
        return this.isRandom
            ? Math.min(this.reserve.length, Math.ceil(Math.random() * this.rack.length))
            : Math.min(this.rack.length, this.reserve.length);
    }
}
