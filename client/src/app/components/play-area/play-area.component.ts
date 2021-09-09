import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Vec2 } from '@app/classes/vec2';
import { Constants } from '@app/constants/global.constants';
import { GridService } from '@app/services/grid.service';

// TODO : Déplacer ça dans un fichier séparé accessible par tous
export enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2,
    Back = 3,
    Forward = 4,
}

@Component({
    selector: 'app-play-area',
    templateUrl: './play-area.component.html',
    styleUrls: ['./play-area.component.scss'],
})
export class PlayAreaComponent implements AfterViewInit {
    @ViewChild('gridCanvas', { static: false }) private gridCanvas!: ElementRef<HTMLCanvasElement>;

    mousePosition: Vec2 = { x: 0, y: 0 };
    gridPosition: Vec2 = { x: -1, y: -1 };
    buttonPressed = '';
    private canvasSize = Constants.Grid.CANVAS_SIZE;
    private gridSize = Constants.Grid.GRID_SIZE;

    constructor(private readonly gridService: GridService) {}

    @HostListener('keydown', ['$event'])
    buttonDetect(event: KeyboardEvent) {
        this.buttonPressed = event.key;

        if (this.gridPosition.x >= 0 || this.gridPosition.y >= 0) {
            this.gridService.drawLetter(event.key, { x: this.gridPosition.x, y: this.gridPosition.y });
        }
    }

    ngAfterViewInit(): void {
        this.gridService.gridContext = this.gridCanvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;

        const canvas = this.gridCanvas.nativeElement;
        const scaleFactor = window.devicePixelRatio;

        canvas.style.width = canvas.style.width || canvas.width + 'px';
        canvas.style.height = canvas.style.height || canvas.height + 'px';

        canvas.width = Math.ceil(canvas.width * scaleFactor);
        canvas.height = Math.ceil(canvas.height * scaleFactor);
        const context = canvas.getContext('2d');
        context?.scale(scaleFactor, scaleFactor);

        this.gridService.drawGrid();
        this.gridCanvas.nativeElement.focus();
    }

    get width(): number {
        return this.canvasSize.x;
    }

    get height(): number {
        return this.canvasSize.y;
    }

    // TODO : déplacer ceci dans un service de gestion de la souris!
    mouseHitDetect(event: MouseEvent) {
        if (event.button === MouseButton.Left) {
            const position: Vec2 = { x: event.offsetX, y: event.offsetY };

            this.mousePosition = position;
            this.refreshGridPositon(position);
        }
    }

    private refreshGridPositon(position: Vec2) {
        this.gridPosition = { x: this.computeGridPosition(position.x), y: this.computeGridPosition(position.y) };
    }

    private computeGridPosition(position: number): number {
        return Math.floor((position / this.width) * this.gridSize);
    }
}
