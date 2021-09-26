import { Injectable } from '@angular/core';
import { PlayerType } from '@app/classes/player-type';
import { PlayGeneratorService } from '@app/services/virtual-player/play-generator.service';
import { Constants } from '@app/constants/global.constants';
import { Subject } from 'rxjs';
import { ReserveService } from '@app/services/reserve/reserve.service';
import { BoardService } from '@app/services/board/board.service';
import { TimerService } from '@app/services/timer-service/timer.service';
import { TimeSpan } from '@app/classes/time/timespan';
import { Timer } from '@app/classes/time/timer';
const MAX_PLAYTIME_SECONDS = 20;
const MIN_PLAYTIME_SECONDS = 3;

@Injectable({
    providedIn: 'root',
})
export class VirtualPlayerService {
    turnComplete: Subject<PlayerType>;
    private rack: string[] = [];
    private minTimer: Timer;

    constructor(
        private readonly playGeneratorService: PlayGeneratorService,
        private readonly reserveService: ReserveService,
        private readonly boardService: BoardService,
        private readonly timerService: TimerService,
    ) {
        this.turnComplete = new Subject<PlayerType>();
        this.minTimer = new Timer(TimeSpan.fromSeconds(MIN_PLAYTIME_SECONDS));
    }

    startTurn() {
        this.timerService.start(TimeSpan.fromSeconds(MAX_PLAYTIME_SECONDS), PlayerType.Virtual);
        this.minTimer.startTimer();
        this.fillRack();

        let random = Math.random();

        if (random < Constants.virtualPlayer.SKIP_PERCENTAGE) {
            this.skipTurn();
            return;
        }
        random -= Constants.virtualPlayer.SKIP_PERCENTAGE;

        if (random < Constants.virtualPlayer.EXCHANGE_PERCENTAGE) {
            this.exchange();
            this.skipTurn();
            return;
        }

        this.play();
        this.endTurn();
    }

    async endTurn() {
        await this.minTimer.timerCompleted;

        this.minTimer.stopTimer();
        this.timerService.reset();
        this.turnComplete.next(PlayerType.Virtual);
    }

    skipTurn() {
        this.endTurn();
    }

    fillRack(): void {
        while (this.reserveService.length > 0 && this.rack.length < Constants.reserve.SIZE) {
            this.rack.push(this.reserveService.drawLetter());
        }
    }

    private exchange() {
        const randomLetterCount = Math.floor(Math.random() * this.rack.length);

        for (let i = 0; i < randomLetterCount; i++) {
            const letterToReplace = Math.floor(Math.random() * this.rack.length);
            const letter = this.rack[letterToReplace];

            this.reserveService.putBackLetter(letter);
            this.rack[letterToReplace] = this.reserveService.drawLetter();
        }
    }

    private async play() {
        const generator = this.playGeneratorService.newGenerator(this.rack);
        const scoreRange = this.getScoreRange();

        while (generator.generateNext() && this.timerService.time.totalMilliseconds > 0);

        const filteredPlays = generator.orderedPlays.filter((e) => e.score >= scoreRange.min && e.score <= scoreRange.max);

        if (filteredPlays.length === 0) {
            return;
        }

        const play = filteredPlays[Math.floor(Math.random() * filteredPlays.length)];

        await this.minTimer.timerCompleted;

        this.boardService.placeLetters(play.letters);
        play.letters.forEach((letter) => this.rack.splice(this.rack.findIndex((rackLetter) => letter.letter === rackLetter)));
    }

    private getScoreRange(): { min: number; max: number } {
        let random = Math.random();
        const scoreRanges = Constants.virtualPlayer.SCORE_RANGE;

        for (const scoreRange of scoreRanges) {
            if (random < scoreRange.percentage) {
                return scoreRange.range;
            }
            random -= scoreRange.percentage;
        }

        return { min: 0, max: 0 };
    }
}
