/* eslint-disable dot-notation,
@typescript-eslint/no-unused-expressions,
@typescript-eslint/no-empty-function,
no-unused-expressions,
*/
import { AdminPersistence } from '@app/services/admin/admin-persistence';
import { DatabaseService } from '@app/services/database/database.service';
import { DictionaryMetadata, VirtualPlayerLevel, VirtualPlayerName } from '@common';
import { expect } from 'chai';
import { Collection, Db, FindCursor, InsertOneResult, ModifyResult, WithId } from 'mongodb';
import { assert, createSandbox, SinonSandbox, SinonStubbedInstance, stub } from 'sinon';

const virtualPlayernames: VirtualPlayerName[] = [
    { name: 'Éléanor', level: VirtualPlayerLevel.Easy, isReadonly: true },
    { name: 'Alfred', level: VirtualPlayerLevel.Easy, isReadonly: true },
    { name: 'Jeannine', level: VirtualPlayerLevel.Easy, isReadonly: true },
];
const virtualPlayernamesWithId = [
    { _id: 'Éléanor', level: VirtualPlayerLevel.Easy, isReadonly: true },
    { _id: 'Alfred', level: VirtualPlayerLevel.Easy, isReadonly: true },
    { _id: 'Jeannine', level: VirtualPlayerLevel.Easy, isReadonly: true },
];
describe('AdminPersistence', () => {
    let service: AdminPersistence;
    let dbServiceStub: SinonStubbedInstance<DatabaseService>;
    let sandbox: SinonSandbox;
    let collectionStub: SinonStubbedInstance<Collection>;
    let dbStub: SinonStubbedInstance<Db>;
    beforeEach(() => {
        sandbox = createSandbox();
        dbServiceStub = sandbox.createStubInstance(DatabaseService);
        dbStub = sandbox.createStubInstance(Db);
        stub(dbServiceStub, 'database').get(() => {
            return dbStub as unknown as Db;
        });
        collectionStub = sandbox.createStubInstance(Collection);
        collectionStub.insertOne.resolves({ acknowledged: true } as unknown as InsertOneResult);
        collectionStub.insertMany.resolves();
        collectionStub.drop.resolves();
        collectionStub.deleteOne.resolves();
        collectionStub.find.returns({
            toArray: () => {
                return virtualPlayernamesWithId;
            },
        } as unknown as FindCursor);
        collectionStub.findOneAndDelete.resolves({ value: true } as unknown as ModifyResult);
        collectionStub.countDocuments.resolves(1);
        dbStub.collection.returns(collectionStub as unknown as Collection);
        service = new AdminPersistence(dbServiceStub as unknown as DatabaseService);
    });
    afterEach(() => {
        sandbox.restore();
    });
    it('should be created', () => {
        expect(service).to.be.ok;
    });
    it('should init', async () => {
        collectionStub.countDocuments.resolves(0);
        await service.init();
        assert.calledOnce(collectionStub.insertMany);
    });
    it('should not create new data on init', async () => {
        collectionStub.countDocuments.resolves(1);
        await service.init();
        assert.notCalled(collectionStub.insertMany);
    });
    it('should reset', async () => {
        await service.reset();
        assert.calledOnce(collectionStub.drop);
    });
    it('should not reset', async () => {
        collectionStub.countDocuments.resolves(0);
        await service.reset();
        assert.notCalled(collectionStub.drop);
    });
    it('should delete playername', async () => {
        collectionStub.findOneAndDelete.resolves({ value: { nom: 'Monique', level: VirtualPlayerLevel.Easy } } as unknown as ModifyResult);
        expect(await service.deleteVirtualPlayer('Monique')).to.equal(VirtualPlayerLevel.Easy);
    });
    it('should not delete playername', async () => {
        collectionStub.findOneAndDelete.resolves({ value: null } as unknown as ModifyResult);
        expect(await service.deleteVirtualPlayer('Monique')).to.equal(null);
    });
    it('should get metadata by id from database', async () => {
        await service.addVirtualPlayer(VirtualPlayerLevel.Easy, 'Éléanor');
        await service.addVirtualPlayer(VirtualPlayerLevel.Easy, 'Alfred');
        expect(await service.getPlayerNames()).to.deep.equal(virtualPlayernames);
    });
    it('should not add duplicate playername', async () => {
        try {
            collectionStub.insertOne.resolves(new Error(''));
        } catch (err) {
            expect(await service.addVirtualPlayer(VirtualPlayerLevel.Easy, 'Alfred')).to.be.false;
        }
    });
    it('should rename', async () => {
        const player = {
            _id: 'Alfredo',
            level: VirtualPlayerLevel.Expert,
            isReadonly: false,
        };
        collectionStub.findOneAndDelete.resolves({ value: player } as unknown as ModifyResult);
        collectionStub.findOne.resolves(player as unknown as WithId<DictionaryMetadata>);
        expect(await service.renameVirtualPlayer('Alfred', 'Alfredo')).to.equal(VirtualPlayerLevel.Expert);
    });
    it('should rename but deleted player is null', async () => {
        const player = {
            _id: 'Alfredo',
            level: VirtualPlayerLevel.Expert,
            isReadonly: false,
        };
        collectionStub.findOneAndDelete.resolves({ value: null } as unknown as ModifyResult);
        collectionStub.findOne.resolves(player as unknown as WithId<DictionaryMetadata>);
        expect(await service.renameVirtualPlayer('Alfred', 'Alfredo')).to.equal(null);
    });
    it('should rename but return null', async () => {
        createSandbox().stub(service, 'addVirtualPlayer').resolves(false);
        const player = {
            _id: 'Alfredo',
            level: VirtualPlayerLevel.Expert,
            isReadonly: false,
        };
        collectionStub.findOneAndDelete.resolves({ value: player } as unknown as ModifyResult);
        collectionStub.findOne.resolves(player as unknown as WithId<DictionaryMetadata>);
        expect(await service.renameVirtualPlayer('Alfred', 'Alfredo')).to.equal(null);
    });
    it('should not rename playername', async () => {
        collectionStub.findOne.resolves(null);
        expect(await service.renameVirtualPlayer('Alfred', 'Alfredo')).to.be.null;
    });

    it('should not rename inexistant names', async () => {
        const player = {
            _id: 'Alfredo',
            level: VirtualPlayerLevel.Expert,
            isReadonly: false,
        };
        collectionStub.findOne.resolves(player as unknown as WithId<DictionaryMetadata>);
        collectionStub.insertOne.throws(new Error(''));
        try {
            await service.renameVirtualPlayer('Alfred', 'Alfredo');
        } catch (err) {
            expect(err).to.not.null;
        }
    });
});
