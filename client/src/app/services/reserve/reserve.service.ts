import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SessionService } from '@app/services/session/session.service';
import { environmentExt } from '@environment-ext';

const localUrl = (call: string, id: string) => `${environmentExt.apiUrl}reserve/${call}/${id}`;

@Injectable({
    providedIn: 'root',
})
export class ReserveService {
    private reserve: string[];

    constructor(private readonly httpClient: HttpClient, private readonly sessionService: SessionService) {
        this.reset();
    }

    async refresh(): Promise<boolean> {
        const response = await this.httpClient.get(localUrl('retrieve', this.sessionService.id)).toPromise();

        try {
            this.reserve = response as string[];
        } catch (e) {
            return false;
        }

        return true;
    }

    reset(): void {
        this.reserve = [];
    }

    getLetterAndQuantity(letterToUpdate: string): string {
        const firstIndex = this.reserve.indexOf(letterToUpdate); // -1
        const lastIndex = this.reserve.lastIndexOf(letterToUpdate); // -1

        if (lastIndex && firstIndex === -1) {
            return `${letterToUpdate.toUpperCase()} : 0`;
        }

        const currentQuantity = lastIndex - firstIndex + 1;
        return `${letterToUpdate.toUpperCase()} : ${currentQuantity}`;
    }

    get length(): number {
        return this.reserve.length;
    }
}
