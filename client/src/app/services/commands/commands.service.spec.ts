/* eslint-disable dot-notation -- Need to access private properties and functions*/
/* eslint-disable @typescript-eslint/no-magic-numbers -- Not necessary in tests*/
/* eslint-disable max-classes-per-file -- Multiple mock needed for tests*/
/* eslint-disable @typescript-eslint/naming-convention  -- Need SCREAMING_SNAKE_CASE for static property in mock class */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { PlayerType } from '@app/classes/player/player-type';
import { CommandsService } from '@app/services/commands/commands.service';
import { GameService } from '@app/services/game/game.service';
import { PlayerService } from '@app/services/player/player.service';
import { ReserveService } from '@app/services/reserve/reserve.service';
import { Direction, MessageType, SystemMessages, Vec2 } from '@common';

describe('CommandsService', () => {
    let playerServiceSpy: jasmine.SpyObj<PlayerService>;
    let reserveServiceSpy: jasmine.SpyObj<ReserveService>;
    let service: CommandsService;

    beforeEach(() => {
        playerServiceSpy = jasmine.createSpyObj('PlayerService', ['completeTurn', 'exchangeLetters', 'placeLetters']);
        reserveServiceSpy = jasmine.createSpyObj('ReserveService', ['getLetterAndQuantity', 'reserve']);
        reserveServiceSpy['reserve'] = ['a'];

        playerServiceSpy = jasmine.createSpyObj('PlayerService', ['exchangeLetters', 'placeLetters', 'skipTurn']);

        TestBed.configureTestingModule({
            providers: [
                { provide: PlayerService, useValue: playerServiceSpy },
                { provide: GameService, useValue: jasmine.createSpyObj('GameService', [], [{ currentTurn: PlayerType.Local }]) },
                { provide: ReserveService, useValue: reserveServiceSpy },
            ],
        });
        service = TestBed.inject(CommandsService);
        service['messagingService'].isDebug = true;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('#parseInput should send a help message', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        service.parseInput('!aide');
        expect(spy).toHaveBeenCalledWith(SystemMessages.HelpTitle, SystemMessages.HelpMessage, MessageType.System);
    });

    it('#parseInput should toggle debugging mode', () => {
        service['messagingService'].isDebug = false;
        service.parseInput('!debug');
        expect(service['messagingService'].isDebug).toBeTrue();
        service.parseInput('!debug');
        expect(service['messagingService'].isDebug).toBeFalse();
    });

    it('#parseInput should send an error message when exchange letter command is invalid', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        service.parseInput('!??changer 12345678');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidLetters, MessageType.Error);
    });

    it('#parseInput should call exchange', () => {
        service['gameService'].currentTurn = PlayerType.Local;
        service.parseInput('!??changer abc');
        expect(playerServiceSpy.exchangeLetters).toHaveBeenCalled();
    });

    it('#parseInput should send an error message when place command is passed an invalid word', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        service.parseInput('!placer a9h w0rd');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidWord, MessageType.Error);
    });

    it('#parseInput should send an error message when place command is passed invalid options', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        service.parseInput('!placer a19h word');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidOptions, MessageType.Error);
    });

    it('#parseInput should call placeLetters when the input is valid', () => {
        const vecCoordinate: Vec2 = { x: 7, y: 7 };
        service['gameService'].currentTurn = PlayerType.Local;
        service.parseInput('!placer h8v word');
        expect(playerServiceSpy.placeLetters).toHaveBeenCalledWith('word', vecCoordinate, Direction.Down);
        service.parseInput('!placer h8h word');
        expect(playerServiceSpy.placeLetters).toHaveBeenCalledWith('word', vecCoordinate, Direction.Down);
    });

    it('#parseInput should send an error message if the user message is not in the right format', () => {
        const userMessage = 'A'.repeat(512 + 3);
        const spy = spyOn<any>(service['messagingService'], 'send');
        service.parseInput(userMessage);
        expect(spy).toHaveBeenCalledWith(SystemMessages.InvalidFormat, SystemMessages.InvalidUserMessage, MessageType.Error);
    });

    it('#parseInput send a message to the other user', () => {
        const input = 'This is a message.';
        const spy = spyOn<any>(service['messagingService'], 'send');
        service.parseInput(input);
        expect(spy).toHaveBeenCalledWith('', input, MessageType.Message);
    });

    it('#parseInput should send an error message if the command is not recognized', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        service.parseInput('!notavalidcommand');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidCommand, MessageType.Error);
        expect(service.parseInput('!notavalidcommand')).toBe(false);
    });

    it('parseInput should call skip turn', () => {
        service['gameService'].currentTurn = PlayerType.Local;
        service.parseInput('!passer');
        expect(playerServiceSpy.skipTurn).toHaveBeenCalled();
    });

    it("#parseInput should fail when it is not the user's turn", () => {
        const spy = spyOn<any>(service, 'skipTurn');
        service['gameService'].currentTurn = PlayerType.Virtual;
        service.parseInput('!passer');
        expect(spy).toHaveBeenCalled();
    });

    it('#parseInput should call displayReserve', () => {
        service.parseInput('!r??serve');
        expect(reserveServiceSpy.getLetterAndQuantity).toHaveBeenCalled();
    });

    it("should fail when it is not the user's turn", () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(false);
        expect(service['checkPlaceCommand']('h8h', 'test')).toBe(false);
    });

    it('should fail when place command sytax invalid', () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        const spy = spyOn<any>(service['messagingService'], 'send');
        service['checkPlaceCommand']('h8s5sh', 'test');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidOptions, MessageType.Error);
    });

    it('should fail if invalid word placed', () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        const spy = spyOn<any>(service['messagingService'], 'send');
        service['checkPlaceCommand']('h8h', '4');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidWord, MessageType.Error);
        expect(service['checkPlaceCommand']('h8h', '4')).toBe(false);
    });

    it('should not exchange letters if not users turn', () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(false);
        expect(service['exchangeLetters']('z')).toBe(false);
    });

    it('should not exchange letters if invalid letters provided', () => {
        const spy = spyOn<any>(service['messagingService'], 'send');
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        service['exchangeLetters']('4');
        expect(spy).toHaveBeenCalledWith('', SystemMessages.InvalidLetters, MessageType.Error);
        expect(service['exchangeLetters']('4')).toBe(false);
    });

    it('should not skip turn if not users turn', () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(false);
        expect(service['skipTurn']()).toBe(false);
    });

    it('should skip turn if users turn', () => {
        spyOn<any>(service, 'isUsersTurn').and.returnValue(true);
        expect(service['skipTurn']()).toBe(true);
    });

    it('should send error message if trying to skip when not turn', () => {
        service['gameService'].currentTurn = PlayerType.Virtual;
        expect(service['isUsersTurn']()).toBe(false);
    });

    it('should remove accents', () => {
        const accentedMessage = '??de ?? la cr??me br??l??e';
        const resultMessage = 'Ode a la creme brulee';
        expect(CommandsService['removeAccents'](accentedMessage)).toEqual(resultMessage);
    });
});
