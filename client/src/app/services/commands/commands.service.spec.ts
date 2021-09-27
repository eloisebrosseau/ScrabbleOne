import { TestBed } from '@angular/core/testing';
import { FakePlayerService } from '@app/services/player/mock-player.service.spec';
import { PlayerService } from '@app/services/player/player.service';
import { CommandsService } from '@app/services/commands/commands.service';
import { Message, MessageType } from '@app/classes/message';

describe('CommandsService', () => {
    let service: CommandsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: PlayerService, useClass: FakePlayerService }],
        });
        service = TestBed.inject(CommandsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('#parseInput should send a help message with the correct info', () => {
        const expectedMessage: Message = {
            title: "Capsule d'aide",
            body: "Vous avez appelé à l'aide",
            messageType: MessageType.Log,
            timestamp: Date.now(),
            userId: 1,
        };

        service.messagingService.onMessage().subscribe((message) => {
            expect(message).toEqual(expectedMessage);
        });
        service.parseInput('!aide');
    });

    it('#parseInput should toggle debugging mode', () => {
        service.parseInput('!debug');
        expect(service.messagingService.debuggingMode).toBeTrue();
        service.parseInput('!debug');
        expect(service.messagingService.debuggingMode).toBeFalse();
    });

    it('#parseInput should send an error message when exchange letter command is invalid', () => {
        service.messagingService.onMessage().subscribe((message) => {
            expect(message.messageType).toEqual(MessageType.Error);
        });
        service.parseInput('!echanger 2');
    });

    it('#parseInputsend an error message when place letter command is invalid', () => {
        service.messagingService.onMessage().subscribe((message) => {
            expect(message.messageType).toEqual(MessageType.Error);
        });
        service.parseInput('!placer z9h test');
    });

    it('#parseInputsend should send an error message if the user message is not in the right format', () => {
        // For test purposes
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const userMessage = 'A'.repeat(512 + 3);
        service.messagingService.onMessage().subscribe((message) => {
            expect(message.messageType).toEqual(MessageType.Error);
        });
        service.parseInput(userMessage);
    });

    it('#parseInputsend should send a message to the other user', () => {
        service.messagingService.onMessage().subscribe((message) => {
            expect(message.messageType).toEqual(MessageType.Message);
        });
        service.parseInput('This is a message.');
    });

    it('#parseInputsend should send an error message if the command is not recognized', () => {
        service.messagingService.onMessage().subscribe((message) => {
            expect(message.messageType).toEqual(MessageType.Error);
        });
        service.parseInput('!notavalidcommand');
    });

    it('#parseInputsend should call skip turn', () => {
        service.parseInput('!passer');
        expect(service.playerService.completeTurn).toHaveBeenCalled();
    });
});
