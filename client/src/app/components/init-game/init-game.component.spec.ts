/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
/* eslint-disable no-unused-vars */
/* eslint-disable max-classes-per-file -- Multiple stub implementation needed */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Injectable, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NameValidator } from '@app/classes/form-validation/name-validator';
import { cleanStyles } from '@app/classes/helpers/cleanup.helper';
import { PlayerType } from '@app/classes/player/player-type';
import { AppMaterialModule } from '@app/modules/material.module';
import { GameService } from '@app/services/game/game.service';
import { RoomService } from '@app/services/room/room.service';
import { DictionaryMetadata, Failure, GameMode, GameType, VirtualPlayerLevel } from '@common';
import { InitGameComponent } from './init-game.component';
import { AdminService } from '@app/services/admin/admin.service';
import { PlayerNameService } from '@app/services/player-name/player-name.service';

@Injectable({
    providedIn: 'root',
})
class GameServiceStub {
    shouldFail: boolean = false;
    currentTurn: PlayerType = PlayerType.Local;

    async startSinglePlayer(): Promise<void | Failure<string>> {
        return Promise.resolve(this.shouldFail ? { isSuccess: false, payload: '' } : undefined);
    }

    async startMultiplayer(): Promise<void | Failure<string>> {
        return Promise.resolve(this.shouldFail ? { isSuccess: false, payload: '' } : undefined);
    }

    reset(): void {
        // Does Nothing
    }
}

@Injectable({
    providedIn: 'root',
})
class MatDialogStub {
    close() {
        // Does Nothing
    }
}

@Injectable({
    providedIn: 'root',
})
class NameValidatorStub {
    get isValid(): boolean {
        return true;
    }
}

const THIRTY_SECONDS = 30;
const FIVE_MINUTES = 5;
const FOUR_MINUTES = 4;

const METADATA: DictionaryMetadata = {
    _id: 'dictionary2.json',
    path: '2',
    title: '2',
    description: '',
    nbWords: 1,
};

describe('InitGameComponent', () => {
    let component: InitGameComponent;
    let fixture: ComponentFixture<InitGameComponent>;
    let roomServiceSpyObj: jasmine.SpyObj<RoomService>;
    let gameServiceStub: GameServiceStub;
    let playerNameService: PlayerNameService;
    let routerSpy: jasmine.SpyObj<Router>;

    let isRoomCreateFail = false;

    const dialogData = { gameType: GameType.SinglePlayer, gameMode: GameMode.Classic };

    const NAMES = ['Jean', 'Ren????????????????????', 'moulon', 'Jo', 'Josiannnnnnnnnnne', 'Jean123', 'A1', 'Alphonse', ''];

    beforeEach(async () => {
        roomServiceSpyObj = jasmine.createSpyObj('RoomService', ['create']);
        roomServiceSpyObj.create.and.callFake(async () =>
            isRoomCreateFail ? Promise.resolve({ isSuccess: false, payload: '' }) : Promise.resolve(),
        );
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);

        const adminService = jasmine.createSpyObj('AdminService', { retrieveDictionaries: Promise.resolve() }, { defaultDictionary: METADATA });

        await TestBed.configureTestingModule({
            declarations: [InitGameComponent],
            imports: [HttpClientTestingModule, AppMaterialModule, BrowserAnimationsModule, FormsModule],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
            providers: [
                { provide: RoomService, useValue: roomServiceSpyObj },
                { provide: Router, useValue: routerSpy },
                { provide: GameService, useClass: GameServiceStub },
                { provide: MatDialogRef, useClass: MatDialogStub },
                { provide: NameValidator, useClass: NameValidatorStub },
                { provide: AdminService, useValue: adminService },
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(InitGameComponent);
        component = fixture.componentInstance;
        component.dictionary = METADATA;
        component.data.gameType = GameType.SinglePlayer;
        fixture.detectChanges();
        component.dictionary = METADATA;
        gameServiceStub = TestBed.inject(GameService) as unknown as GameServiceStub;
        playerNameService = TestBed.inject(PlayerNameService);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should change bot name', () => {
        const FIRST_PLAYER_NAME = 'Alphonse';
        component.formConfig.firstPlayerName = NAMES[7];
        component.formConfig.secondPlayerName = NAMES[7];

        component.botNameChange(FIRST_PLAYER_NAME);
        expect(component.formConfig.secondPlayerName).not.toEqual(FIRST_PLAYER_NAME);
    });

    it('should get virtualPlayer level depending on its name', () => {
        component.formConfig.virtualPlayerLevelName = '??l??anore';
        expect(component.virtualPlayerLevel).toEqual(VirtualPlayerLevel.Expert);
    });

    it('should call forceSecondsToZero ', fakeAsync(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spy = spyOn<any>(component, 'forceSecondsToZero');
        component.manageTimeLimits();

        expect(spy).toHaveBeenCalled();
    }));

    it('should forceSecondsToZero ', fakeAsync(() => {
        component.minutes = FIVE_MINUTES;
        component.seconds = THIRTY_SECONDS;

        component.manageTimeLimits();

        expect(component.seconds).toEqual(0);
    }));

    it('should not forceSecondsToZero ', fakeAsync(() => {
        component.minutes = FOUR_MINUTES;
        component.seconds = THIRTY_SECONDS;

        component.manageTimeLimits();

        expect(component.seconds).not.toEqual(0);
    }));

    it('should force seconds to thirty', fakeAsync(() => {
        component.minutes = 0;
        component.seconds = 0;

        component.manageTimeLimits();

        expect(component.seconds).toEqual(THIRTY_SECONDS);
    }));

    it('should not force seconds to thirty', fakeAsync(() => {
        component.minutes = FOUR_MINUTES;
        component.seconds = 0;

        component.manageTimeLimits();

        expect(component.seconds).not.toEqual(THIRTY_SECONDS);
    }));

    it('should close dialog once init confirmed', async () => {
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);
        const spy = spyOn(component.dialogRef, 'close');
        await component.init();
        expect(spy).toHaveBeenCalled();
    });

    it('should init single player game if single player selected', async () => {
        const spy = spyOn<any>(component, 'initSinglePlayer');
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);
        spy.and.callThrough();
        await component.init();

        expect(spy).toHaveBeenCalled();
    });

    it('should not init single player game if single player not selected', async () => {
        const spy = spyOn<any>(playerNameService, 'retrievePlayerNames').and.returnValue(true);
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);

        gameServiceStub.shouldFail = true;
        await component.init();

        expect(spy).toHaveBeenCalled();
    });

    it('should init multiplayer game if single player config invalid', async () => {
        const spy = spyOn<any>(playerNameService, 'retrievePlayerNames').and.returnValue(true);
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);

        gameServiceStub.shouldFail = true;
        isRoomCreateFail = true;
        component.data.gameType = GameType.Multiplayer;
        await component.init();

        expect(spy).toHaveBeenCalled();
    });

    it('should init singlePlayer game if multiplayer config valid', async () => {
        const spy = spyOn<any>(playerNameService, 'retrievePlayerNames').and.returnValue(true);
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);

        gameServiceStub.shouldFail = false;
        isRoomCreateFail = false;
        component.data.gameType = GameType.Multiplayer;
        await component.init();

        expect(spy).not.toHaveBeenCalled();
    });

    it('should init multiplayer game if confirm initialization succeeds', async () => {
        dialogData.gameType = GameType.Multiplayer;
        const spy = spyOn(component.dialogRef, 'close');
        spyOn<any>(component, 'confirmInitialization').and.returnValue(true);
        gameServiceStub.shouldFail = false;
        isRoomCreateFail = false;
        await component.init();

        expect(spy).toHaveBeenCalled();
    });

    it('should confirm initialization if valid name', async () => {
        spyOnProperty(component.nameValidator, 'isValid').and.returnValue(true);
        const confirm = component['confirmInitialization']();
        expect(confirm).toBe(true);
    });

    it('should not confirm initialization if invalid name', async () => {
        spyOnProperty(component.nameValidator, 'isValid').and.returnValue(false);
        const confirm = component['confirmInitialization']();
        expect(confirm).toBe(false);
    });

    it('should call init but does not need to reroute', async () => {
        spyOn<any>(component, 'confirmInitialization').and.returnValue(false);
        const spy = spyOn(component['playerNameService'], 'retrievePlayerNames');

        await component.init();
        expect(spy).not.toHaveBeenCalled();
    });

    afterAll(() => cleanStyles());
});
