import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NameValidator } from '@app/classes/form-validation/name-validator';
import { TimeSpan } from '@app/classes/time/timespan';
import { Constants } from '@app/constants/global.constants';
import { AdminService } from '@app/services/admin/admin.service';
import { GameService } from '@app/services/game/game.service';
import { PlayerNameService } from '@app/services/player-name/player-name.service';
import { RoomService } from '@app/services/room/room.service';
import { DictionaryMetadata, GameMode, GameType, MultiplayerCreateConfig, SinglePlayerConfig, VirtualPlayerLevel } from '@common';

interface FormConfig {
    virtualPlayerLevelName: string;
    playTime: TimeSpan;
    isRandomBonus: boolean;
    firstPlayerName: string;
    secondPlayerName: string;
}

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- Lists all option, the list is a constant
const TURN_LENGTH_MINUTES = [0, 1, 2, 3, 4, 5];
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- Lists all option, the list is a constant
const TURN_LENGTH_SECONDS = [0, 30];
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- Default play time is readable and immutable
const DEFAULT_PLAY_TIME = TimeSpan.fromMinutesSeconds(1, 0);

@Component({
    selector: 'app-init-game',
    templateUrl: './init-game.component.html',
    styleUrls: ['./init-game.component.scss'],
})
export class InitGameComponent implements OnInit {
    typeOfGameType: typeof GameType;

    virtualPlayerLevelNames: string[];
    botNames: string[];
    minutesList: number[];
    secondsList: number[];
    dictionary: DictionaryMetadata;
    nameValidator: NameValidator;
    minutes: number;
    seconds: number;
    formConfig: FormConfig;

    constructor(
        readonly gameService: GameService,
        private readonly router: Router,
        private readonly roomService: RoomService,
        readonly adminService: AdminService,
        private readonly playerNameService: PlayerNameService,
        readonly dialogRef: MatDialogRef<InitGameComponent>,
        @Inject(MAT_DIALOG_DATA) readonly data: { gameType: GameType; gameMode: GameMode },
    ) {
        this.typeOfGameType = GameType;

        this.virtualPlayerLevelNames = Constants.VIRTUAL_PLAYERS_LEVELS_NAMES;
        this.minutesList = TURN_LENGTH_MINUTES;
        this.secondsList = TURN_LENGTH_SECONDS;

        this.nameValidator = new NameValidator();
        this.minutes = DEFAULT_PLAY_TIME.totalMinutes;
        this.seconds = DEFAULT_PLAY_TIME.seconds;
        this.formConfig = {
            virtualPlayerLevelName: Constants.VIRTUAL_PLAYERS_LEVELS_NAMES[0],
            playTime: DEFAULT_PLAY_TIME,
            isRandomBonus: false,
            firstPlayerName: '',
            secondPlayerName: '',
        };
    }

    private static randomizeBotName(nameArr: string[]): string {
        const randomIndex = Math.floor(Math.random() * nameArr.length);
        return nameArr[randomIndex];
    }

    ngOnInit(): void {
        this.updateVirtualPlayerNames();
        this.botNames = this.playerNameService.virtualPlayerNamesByLevel(VirtualPlayerLevel.Easy);
        this.dictionary = this.adminService.defaultDictionary as DictionaryMetadata;
    }

    updateVirtualPlayerNames() {
        this.botNames = this.playerNameService.virtualPlayerNamesByLevel(this.virtualPlayerLevel);
        this.formConfig.secondPlayerName = InitGameComponent.randomizeBotName(this.botNames);
    }

    async init(): Promise<void> {
        if (!this.confirmInitialization()) {
            return;
        }

        let needsToReroute = true;
        if (this.data.gameType === GameType.SinglePlayer) {
            needsToReroute &&= await this.initSinglePlayer();
        } else {
            needsToReroute &&= await this.initMultiplayer();
        }

        if (needsToReroute) {
            this.dialogRef.close();
            return;
        }

        await this.playerNameService.retrievePlayerNames();
        await this.adminService.retrieveDictionaries();

        this.botNames = this.playerNameService.virtualPlayerNamesByLevel(VirtualPlayerLevel.Easy);
        this.dictionary = this.adminService.defaultDictionary as DictionaryMetadata;
    }

    manageTimeLimits() {
        this.forceSecondsToThirty();
        this.forceSecondsToZero();
    }

    botNameChange(firstPlayerName: string): void {
        while (firstPlayerName === this.formConfig.secondPlayerName) {
            this.formConfig.secondPlayerName = InitGameComponent.randomizeBotName(this.botNames);
        }
    }

    get virtualPlayerLevel(): VirtualPlayerLevel {
        return this.virtualPlayerLevelNames[0] === this.formConfig.virtualPlayerLevelName ? VirtualPlayerLevel.Easy : VirtualPlayerLevel.Expert;
    }

    private async initSinglePlayer(): Promise<boolean> {
        const singlePlayerConfig: SinglePlayerConfig = {
            gameType: GameType.SinglePlayer,
            gameMode: this.data.gameMode,
            virtualPlayerLevel: this.virtualPlayerLevel,
            playTimeMs: this.formConfig.playTime.totalMilliseconds,
            playerName: this.formConfig.firstPlayerName,
            virtualPlayerName: this.formConfig.secondPlayerName,
            isRandomBonus: this.formConfig.isRandomBonus,
            dictionary: this.dictionary,
        };

        const answer = await this.gameService.startSinglePlayer(singlePlayerConfig);

        if (answer !== undefined) {
            this.nameValidator.errors.push(answer.payload);
            return false;
        }

        await this.router.navigate(['game']);
        return true;
    }

    private async initMultiplayer(): Promise<boolean> {
        const multiplayerConfig: MultiplayerCreateConfig = {
            gameType: GameType.Multiplayer,
            gameMode: this.data.gameMode,
            playTimeMs: this.formConfig.playTime.totalMilliseconds,
            playerName: this.formConfig.firstPlayerName,
            isRandomBonus: this.formConfig.isRandomBonus,
            dictionary: this.dictionary,
        };

        const answer = await this.roomService.create(multiplayerConfig);

        if (answer !== undefined) {
            this.nameValidator.errors.push(answer.payload);
            return false;
        }

        await this.router.navigate(['waiting-room']);
        return true;
    }

    private forceSecondsToZero(): void {
        if (this.minutes === TURN_LENGTH_MINUTES[5]) {
            this.seconds = 0;
        }
    }

    private forceSecondsToThirty(): void {
        if (this.minutes === TURN_LENGTH_MINUTES[0]) {
            this.seconds = 30;
        }
    }

    private confirmInitialization(): boolean {
        this.nameValidator.validate();

        if (!this.nameValidator.isValid) {
            return false;
        }

        this.formConfig.playTime = TimeSpan.fromMinutesSeconds(this.minutes, this.seconds);
        this.formConfig.firstPlayerName = this.nameValidator.name;

        return true;
    }
}
