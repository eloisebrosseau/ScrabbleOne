import { Component, OnInit } from '@angular/core';
import { Constants } from '@app/constants/global.constants';
import { GameService } from '@app/services/game/game.service';

@Component({
    selector: 'app-init-solo-mode',
    templateUrl: './init-solo-mode.component.html',
    styleUrls: ['./init-solo-mode.component.scss'],
})
export class InitSoloModeComponent implements OnInit {
    readonly gameTypesList = Constants.gameTypesList;
    readonly turnLengthList = Constants.turnLengthList;
    readonly botNames = Constants.botNames;
    readonly minutesList = Constants.turnLengthMinutes;
    readonly secondsList = Constants.turnLengthSeconds;

    constructor(public game: GameService) {}

    ngOnInit(): void {
        this.game.secondPlayerName = this.game.randomizeBotName(this.botNames);
    }
}
