import { PlayGenerator } from '@app/classes/virtual-player/play-generator';
import { BoardHandler } from '@app/handlers/board-handler/board-handler';
import { Config } from '@app/config';
import { SocketHandler } from '@app/handlers/socket-handler/socket-handler';
import { MessageType } from '@common';
import * as logger from 'winston';
import { Action } from '@app/classes/player/virtual-player/actions/action';
import { PlaceAction } from '@app/classes/player/virtual-player/actions/place-action';
import { ExchangeAction } from '@app/classes/player/virtual-player/actions/exchange-action';
import { ReserveHandler } from '@app/handlers/reserve-handler/reserve-handler';
import { PlayerStatsNotifier } from '@app/handlers/stats-handlers/player-stats-handler/player-stats-notifier';
import { ConsoleFormatter } from '@app/classes/player/console-formatter/console-formatter';

export class PlayActionExpert implements Action {
    constructor(
        private readonly boardHandler: BoardHandler,
        private readonly playGenerator: PlayGenerator,
        private readonly rack: string[],
        private readonly statsNotifier: PlayerStatsNotifier,
        private readonly socketHandler: SocketHandler,
        private readonly reserveHandler: ReserveHandler,
    ) {}

    execute(): Action | null {
        logger.debug('Generating plays - Expert');

        while (this.playGenerator.generateNext());

        const orderedPlays = this.playGenerator.orderedPlays;

        if (orderedPlays.length === 0) {
            logger.debug('No play generated - Exchange');
            return new ExchangeAction(this.reserveHandler, this.socketHandler, this.statsNotifier, this.rack, false);
        }

        const play = orderedPlays[0];

        this.socketHandler.sendMessage({ title: 'Mot placé', body: ConsoleFormatter.formatPlay(play), messageType: MessageType.Message });
        this.socketHandler.sendMessage({
            title: 'Mot alternatifs',
            body: ConsoleFormatter.formatPlays(orderedPlays.slice(1, Config.VIRTUAL_PLAYER.NB_ALTERNATIVES + 1)),
            messageType: MessageType.Log,
        });

        return new PlaceAction(this.boardHandler, this.statsNotifier, this.rack, play);
    }
}
