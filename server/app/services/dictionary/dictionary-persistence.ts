import { Service } from 'typedi';
import { DatabaseService } from '@app/services/database/database.service';
import { DictionaryMetadata } from '@common';
import { Collection } from 'mongodb';

const COLLECTION_NAME = 'dictionary.metadata';
const DEFAULT_PATH = 'assets/dictionary.json';

@Service()
export class DictionaryPersistence {
    readonly defaultMetadata: DictionaryMetadata;
    private readonly metaDataCache: Map<string, DictionaryMetadata>;

    constructor(private readonly databaseService: DatabaseService) {
        this.defaultMetadata = {
            _id: 'dictionary.json',
            path: DEFAULT_PATH,
            description: 'Default Dictionary',
            title: 'Dictionnaire du serveur',
            nbWords: 402503,
        };

        this.metaDataCache = new Map<string, DictionaryMetadata>();
        this.metaDataCache.set(this.defaultMetadata._id, this.defaultMetadata);
    }

    async canAdd(id: string): Promise<boolean> {
        if (this.isDefault(id)) {
            return false;
        }

        return (await this.getMetadataById(id)) === null;
    }

    async add(dictionaryMetadata: DictionaryMetadata): Promise<boolean> {
        const result = await this.metaDataCollection.insertOne(dictionaryMetadata);

        if (result.acknowledged) {
            this.metaDataCache.set(dictionaryMetadata._id, dictionaryMetadata);
        }

        return result.acknowledged;
    }

    async remove(id: string): Promise<boolean> {
        const result = await this.metaDataCollection.deleteOne({ _id: id });
        this.metaDataCache.delete(id);

        return result.acknowledged;
    }

    async getMetadata(): Promise<DictionaryMetadata[]> {
        const metaData = await this.metaDataCollection.find().toArray();
        metaData.forEach((m) => this.metaDataCache.set(m._id, m));

        return Array.from(this.metaDataCache.values());
    }

    async getMetadataById(id: string): Promise<DictionaryMetadata | null> {
        const metadata = this.metaDataCache.get(id);

        if (metadata !== undefined) {
            return metadata;
        }

        return await this.metaDataCollection.findOne({ _id: id });
    }

    async reset(): Promise<void> {
        await this.databaseService.database.dropCollection(COLLECTION_NAME);
        this.metaDataCache.clear();
        this.metaDataCache.set(this.defaultMetadata._id, this.defaultMetadata);
    }

    private isDefault(id: string): boolean {
        return this.defaultMetadata._id === id;
    }

    private get metaDataCollection(): Collection<DictionaryMetadata> {
        return this.databaseService.database.collection<DictionaryMetadata>(COLLECTION_NAME);
    }
}
