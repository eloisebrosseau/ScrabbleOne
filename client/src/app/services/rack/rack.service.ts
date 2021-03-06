import { Injectable } from '@angular/core';
import { SocketClientService } from '@app/services/socket-client/socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class RackService {
    rack: string[];

    constructor(socketService: SocketClientService) {
        this.rack = [];
        socketService.on('rack', (rack: string[]) => this.refresh(rack));
    }

    swapLeft(position: number): number {
        if (position > 0) {
            return this.swap(position, -1);
        }
        const exchange = this.rack.splice(0, 1);
        return this.rack.push(exchange[0]) - 1;
    }

    swapRight(position: number): number {
        if (position < this.length - 1) {
            return this.swap(position, 1);
        }
        const exchange = this.rack.splice(0, this.length - 1);
        this.rack.push(...exchange);
        return 0;
    }

    indexOf(letter: string, fromIndex?: number): number {
        fromIndex = fromIndex ?? 0;
        let index = this.rack.indexOf(letter, this.mod(fromIndex));

        if (index === -1) {
            index = this.rack.indexOf(letter);
        }

        return index;
    }

    reset() {
        this.rack.length = 0;
    }

    mod(value: number): number {
        return ((value % this.length) + this.length) % this.length;
    }

    get length(): number {
        return this.rack.length;
    }

    private refresh(rack: string[]): void {
        rack = rack.slice();

        for (let i = 0; i < rack.length - this.rack.length; ) {
            this.rack.push('');
        }

        for (let i = 0; i < this.rack.length; i++) {
            const position = rack.indexOf(this.rack[i]);
            if (position !== -1) {
                rack.splice(position, 1);
                continue;
            }

            this.rack[i] = '';
        }

        for (const letter of rack) {
            this.rack[this.rack.indexOf('')] = letter;
        }

        let emptyIndex = this.rack.indexOf('');
        while (emptyIndex !== -1) {
            this.rack.splice(emptyIndex, 1);
            emptyIndex = this.rack.indexOf('');
        }
    }

    private swap(position: number, delta: number): number {
        if (this.length === 0) {
            return -1;
        }

        const newPosition = this.mod(position + delta);
        [this.rack[position], this.rack[newPosition]] = [this.rack[newPosition], this.rack[position]];
        return newPosition;
    }
}
