/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
/* eslint-disable max-classes-per-file */
import { NO_ERRORS_SCHEMA } from '@angular/compiler';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { cleanStyles } from '@app/classes/helpers/cleanup.helper';
import { TimeSpan } from '@app/classes/time/timespan';
import { Constants } from '@app/constants/global.constants';
import { AppMaterialModule } from '@app/modules/material.module';
import { CommandsService } from '@app/services/commands/commands.service';
import { MessagingService } from '@app/services/messaging/messaging.service';
import { Message, MessageType } from '@common';
import { CommunicationBoxComponent } from './communication-box.component';
import { SessionService } from '@app/services/session/session.service';
import { PlayerType } from '@app/classes/player/player-type';

describe('CommunicationBoxComponent', () => {
    let component: CommunicationBoxComponent;
    let fixture: ComponentFixture<CommunicationBoxComponent>;
    let dummyMessage: Message;
    let messagingServiceSpy: jasmine.SpyObj<MessagingService>;

    const sessionService = {
        gameConfig: {
            gameType: 'qwerty',
            playTime: TimeSpan.fromMinutesSeconds(1, 0),
            firstPlayerName: 'Alphonse',
            secondPlayerName: 'Lucienne',
        },
    };

    beforeEach(async () => {
        messagingServiceSpy = jasmine.createSpyObj('MessagingService', ['onMessage']);

        await TestBed.configureTestingModule({
            declarations: [CommunicationBoxComponent],
            providers: [
                { provide: MessagingService, useValue: messagingServiceSpy },
                { provide: SessionService, useValue: sessionService },
                { provide: CommandsService, useValue: jasmine.createSpyObj('CommandsService', { parseInput: true }) },
            ],
            imports: [AppMaterialModule, BrowserAnimationsModule, FormsModule],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CommunicationBoxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        dummyMessage = {
            title: 'Title',
            body: 'Body',
            messageType: MessageType.Error,
            userId: PlayerType.Virtual,
        };
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not send a message when the input is empty', () => {
        expect(component.send('')).toBeFalsy();
    });

    it('should return true when the input is not empty', () => {
        expect(component.send('Message.')).toBeTruthy();
    });

    it('should return the title of the message', () => {
        expect(component.getTitle(dummyMessage)).toBe(dummyMessage.title);
    });

    it('should return the correct title', () => {
        const firstPlayerName = 'Alberto';
        const secondPlayerName = 'Monique';
        component['sessionService']['gameConfig']['firstPlayerName'] = firstPlayerName;
        component['sessionService']['gameConfig']['secondPlayerName'] = secondPlayerName;
        expect(component.getTitle(dummyMessage)).toBe(dummyMessage.title);
        dummyMessage.messageType = MessageType.Game;
        dummyMessage.userId = PlayerType.Local;
        expect(component.getTitle(dummyMessage)).toEqual(firstPlayerName);
        dummyMessage.userId = PlayerType.Virtual;
        expect(component.getTitle(dummyMessage)).toEqual(secondPlayerName);
    });

    it("should not show the other user's system messages", () => {
        expect(component.shouldDisplay(dummyMessage)).toBeFalsy();
    });

    it('should differentiate error messages', () => {
        expect(component.isError(dummyMessage)).toBeTrue();
    });

    it('should return the correct CSS colors', () => {
        expect(component.getMessageColor(dummyMessage)).toBe(Constants.ERROR_COLOR);
        dummyMessage.messageType = MessageType.Message;
        expect(component.getMessageColor(dummyMessage)).toBe(Constants.OTHERS_COLOR);
        dummyMessage.userId = PlayerType.Local;
        expect(component.getMessageColor(dummyMessage)).toBe(Constants.MY_COLOR);
    });

    afterAll(() => cleanStyles());
});
