import { LocationStrategy } from '@angular/common';
import { Component, ElementRef, HostBinding, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatDrawer } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { EndGameWinner } from '@app/classes/end-game-winner';
import { PlayerType } from '@app/classes/player/player-type';
import { ConfirmQuitDialogComponent } from '@app/components/confirm-quit-dialog/confirm-quit-dialog.component';
import { EndGameComponent } from '@app/components/end-game/end-game.component';
import { OpponentQuitComponent } from '@app/components/opponent-quit/opponent-quit.component';
import { TutorialComponent } from '@app/components/tutorial/tutorial.component';
import { CommandsService } from '@app/services/commands/commands.service';
import { GameService } from '@app/services/game/game.service';
import { ReserveService } from '@app/services/reserve/reserve.service';
import { SessionService } from '@app/services/session/session.service';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';
import { GameMode } from '@common';
import { Subscription } from 'rxjs';

export enum Icon {
    Home = 'home',
    Message = 'question_answer',
    Skip = 'skip_next',
    Info = 'info',
}

interface ButtonConfig {
    color: string;
    icon: Icon;
    hover: string;
    action: () => void;
}

@Component({
    selector: 'app-game-page',
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
})
export class GamePageComponent implements OnDestroy {
    @ViewChild('drawer', { static: true }) drawer: MatDrawer;
    @HostBinding('class') cssClassName = '';
    playerType: PlayerType;
    buttonConfig: ButtonConfig[];
    iconList: string[];
    isOpen: boolean;

    private onTurnSubscription: Subscription;
    private gameEndingSubscription: Subscription;
    private opponentQuitSubscription: Subscription;
    constructor(
        readonly gameService: GameService,
        readonly sessionService: SessionService,
        readonly reserveService: ReserveService,
        readonly commandService: CommandsService,
        readonly socketClientService: SocketClientService,
        private readonly dialog: MatDialog,
        private readonly router: Router,
        location: LocationStrategy,
        elementRef: ElementRef,
    ) {
        this.isOpen = true;
        // Overrides back button behavior
        // Reference: https://stackoverflow.com/a/56354475
        history.pushState(null, '', window.location.href);
        location.onPopState(() => {
            if (elementRef.nativeElement.offsetParent != null) {
                this.confirmQuit();
                history.pushState(null, '', window.location.href);
            }
        });

        this.playerType = gameService.currentTurn;
        this.buttonConfig = [
            {
                color: 'accent',
                icon: Icon.Home,
                hover: 'Quitter la partie',
                action: () => this.confirmQuit(),
            },
            {
                color: 'primary',
                icon: Icon.Info,
                hover: 'Information sur le jeu',
                action: () => this.openTutorial(),
            },
            {
                color: 'accent',
                icon: Icon.Message,
                hover: 'Basculer le clavardage',
                action: () => this.toggleDrawer(),
            },
            {
                color: 'primary',
                icon: Icon.Skip,
                hover: 'Passer son tour',
                action: async () => this.commandService.parseInput('!passer'),
            },
        ];
        this.opponentQuitSubscription = gameService.onOpponentQuit.subscribe(() => this.opponentQuit());
        this.gameEndingSubscription = gameService.onGameEnding.subscribe((winner) => this.endGame(winner));
        this.onTurnSubscription = gameService.onTurn.subscribe((e) => (this.playerType = e));
    }

    ngOnDestroy(): void {
        this.gameEndingSubscription.unsubscribe();
        this.onTurnSubscription.unsubscribe();
        this.opponentQuitSubscription.unsubscribe();
    }

    private toggleDrawer(): void {
        this.drawer.toggle();
        this.isOpen = !this.isOpen;
    }

    private openTutorial() {
        this.dialog.open(TutorialComponent, {
            panelClass: 'init-game-dialog',
            autoFocus: false,
        });
    }

    private endGame(winner: EndGameWinner) {
        const dialogRef = this.dialog.open(EndGameComponent, { panelClass: 'end-game-dialog', data: { winner } });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.gameService.reset();
            }
        });
    }

    private opponentQuit() {
        this.dialog.open(OpponentQuitComponent);
    }

    private confirmQuit(): void {
        const dialogRef = this.dialog.open(ConfirmQuitDialogComponent);

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) {
                return;
            }
            this.gameService.reset();
            this.router.navigate(['home']);
        });
    }

    get gameMode(): typeof GameMode {
        return GameMode;
    }
}
