import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardComponent } from './board.component';
import { Injectable, NO_ERRORS_SCHEMA } from '@angular/core';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { GridService } from '@app/services/grid/grid.service';
import { AppMaterialModule } from '@app/modules/material.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/compiler';
import { Constants } from '@app/constants/global.constants';
import { cleanStyles } from '@app/classes/helpers/cleanup.helper';

@Injectable({
    providedIn: 'root',
})
class GridServiceStub {
    letterFontFace = { font: '', size: 0 };

    isDrawGridCalled = false;
    isDrawSquareCalled = false;

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawGrid(canvas: CanvasRenderingContext2D): void {
        this.isDrawGridCalled = true;
    }

    // eslint-disable-next-line no-unused-vars -- Its a stub, implemented to do nothing
    drawSquares(canvas: CanvasRenderingContext2D): void {
        this.isDrawSquareCalled = true;
    }
}

describe('BoardComponent', () => {
    let component: BoardComponent;
    let fixture: ComponentFixture<BoardComponent>;
    let gridServiceStub: GridServiceStub;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [PlayAreaComponent, MatCard, MatIcon],
            providers: [{ provide: GridService, useClass: GridServiceStub }],
            imports: [AppMaterialModule],
            schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(BoardComponent);
        gridServiceStub = TestBed.inject(GridService) as unknown as GridServiceStub;
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return correct width', () => {
        expect(component.width).toEqual(Constants.GRID.CANVAS_SIZE.x);
    });

    it('should return correct height', () => {
        expect(component.height).toEqual(Constants.GRID.CANVAS_SIZE.y);
    });

    it('should update font size if size provided', () => {
        const NEW_SIZE = 17;

        component.updateFontSize(NEW_SIZE);

        expect(gridServiceStub.letterFontFace.size).toEqual(NEW_SIZE);
        expect(gridServiceStub.isDrawSquareCalled).toBeTrue();
        expect(gridServiceStub.isDrawGridCalled).toBeTrue();
    });

    afterAll(() => cleanStyles());
});