/* eslint-disable @typescript-eslint/no-useless-constructor */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FakePlayerService } from '@app/services/player/mock-player.service.spec';
import { PlayerService } from '@app/services/player/player.service';

import { RackComponent } from './rack.component';

describe('RackComponent', () => {
    let component: RackComponent;
    let fixture: ComponentFixture<RackComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [RackComponent],
            providers: [{ provide: PlayerService, useClass: FakePlayerService }],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(RackComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
