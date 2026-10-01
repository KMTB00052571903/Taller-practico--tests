import { NotFoundException } from '@nestjs/common'; // Para validar el error 404 si el findOne() no encuentra el envío
import { Test } from '@nestjs/testing';              // Para armar el módulo ficticio y arrancar el entorno de pruebas
import { getRepositoryToken } from '@nestjs/typeorm'; // Para engañar a Nest y conectar el repositorio falso (mock) de TypeORM
import { ShipmentEntity } from './entities/shipment.entity'; // Para que el test reconozca la estructura del objeto Envío
import { ShipmentRulesService } from './shipment-rules.service'; // Para mockear las reglas de negocio y que no interfieran en el test
import { ShipmentStatus } from './shipment-status.enum'; // Para revisar que el envío cambie bien entre CREATED y DISPATCHED
import { ShipmentsService } from './shipments.service'; // El servicio de verdad, el que vamos a llenar de pruebas para ver si sirve

describe('ShipmentsService', () => {
    let service: ShipmentsService;

    const repositoryMock = {
        find: jest.fn(),          // función falsa para findAll()
        findOneBy: jest.fn(),     // función falsa para findOneBy()
        create: jest.fn(),        // función falsa para create()
        save: jest.fn(),          // función falsa para save()
    };

    const shipmentRulesServiceMock = {
        ensureCanBeDispatched: jest.fn(),  // función falsa para las reglas
    };

    beforeEach(async () => {
        jest.clearAllMocks(); // Limpiar los mocks antes de cada test para que no se mezclen los resultados

        const moduleRef = await Test.createTestingModule({
            providers: [
                ShipmentsService,
                { provide: getRepositoryToken(ShipmentEntity), useValue: repositoryMock },
                { provide: ShipmentRulesService, useValue: shipmentRulesServiceMock },
            ],
        }).compile();

        service = moduleRef.get<ShipmentsService>(ShipmentsService);
    });

    it('is defined', () => {
        expect(service).toBeDefined(); // Comprueba que Nest pudo construir el servicio
    });

    it('returns all shipments', async () => {
        // Arrange: preparamos dos envíos falsos
        const shipments = [
            { id: 1, trackingCode: 'SHIP-001', destination: 'New Orleans', status: ShipmentStatus.CREATED },
            { id: 2, trackingCode: 'SHIP-002', destination: 'Los Angeles', status: ShipmentStatus.CREATED },
        ] as ShipmentEntity[];

        // Le decimos al mock: cuando llamen a find, devuelva estos envíos
        repositoryMock.find.mockResolvedValue(shipments);

        // Act: Aquí se ejecuta el método real del servicio
        const result = await service.findAll();

        // Assert: comprobamos que devolvió los envíos y que llamó al repository 1 vez
        expect(result).toEqual(shipments);
        expect(repositoryMock.find).toHaveBeenCalledTimes(1);
    });

    it('returns a shipment when the id exists', async () => {
        // Arrange: un envío falso que el repository va a devolver
        const shipment = {
            id: 7,
            trackingCode: 'SHIP-007',
            destination: 'Cali',
            status: ShipmentStatus.CREATED,
        } as ShipmentEntity;

        // Le decimos al mock: cuando llamen a findOneBy, devuelve este envío
        repositoryMock.findOneBy.mockResolvedValue(shipment);

        // Act: ejecutamos el método real del servicio
        const result = await service.findOne(7);

        // Assert: comprobamos que devolvió el envío correcto
        expect(result).toEqual(shipment);

        // Y que llamó al repository con { id: 7 } (así lo hace el código real)
        expect(repositoryMock.findOneBy).toHaveBeenCalledWith({ id: 7 });
    });

    it('throws NotFoundException when the id does not exist', async () => {
        // Arrange: simulamos que el repository NO encuentra el envío (devuelve null)
        repositoryMock.findOneBy.mockResolvedValue(null);

        // Act and Assert: esperamos que service.findOne(999) falle con NotFoundException
        // NOTA: quien lanza la excepción es ShipmentsService, NO el mock
        await expect(service.findOne(999)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('creates and saves a shipment', async () => {
        // Arrange: los datos que le vamos a pasar a create()
        const data = {
            trackingCode: 'SHIP-100',
            destination: 'Cali',
        };

        // El envío que "crearía" el repository (con status CREATED)
        const shipment = {
            id: 100,
            trackingCode: 'SHIP-100',
            destination: 'Cali',
            status: ShipmentStatus.CREATED,
        } as ShipmentEntity;

        // create() es SÍNCRONO en el servicio real, por eso usamos mockReturnValue
        repositoryMock.create.mockReturnValue(shipment);

        // save() SÍ devuelve una Promise, por eso usamos mockResolvedValue
        repositoryMock.save.mockResolvedValue(shipment);

        // Act
        const result = await service.create(data);

        // Assert: comprobamos que create() fue llamado con los datos + status CREATED
        expect(repositoryMock.create).toHaveBeenCalledWith({
            ...data,
            status: ShipmentStatus.CREATED,
        });

        // Que save() fue llamado con ese envío
        expect(repositoryMock.save).toHaveBeenCalledWith(shipment);

        // Y que el resultado es el envío guardado
        expect(result).toEqual(shipment);
    });

    it('dispatchesand saves a valid shipment', async () => {
        // Arrange: un envío en estado CREATED (que sí se puede despachar)
        const shipment = {
            id: 10,
            trackingCode: 'SHIP-010',
            destination: 'Palmira',
            status: ShipmentStatus.CREATED,
        } as ShipmentEntity;

        // El envío que devolvería save() después de despacharlo (ya con status DISPATCHED)
        const savedShipment = {
            ...shipment,
            status: ShipmentStatus.DISPATCHED,
        } as ShipmentEntity;

        // findOneBy devuelve el envío, y save devuelve el envío ya despachado
        repositoryMock.findOneBy.mockResolvedValue(shipment);
        repositoryMock.save.mockResolvedValue(savedShipment);

        // Act
        const result = await service.dispatch(10);

        // Assert 1: comprobamos que el servicio llamó a las reglas con ese envío
        expect(
            shipmentRulesServiceMock.ensureCanBeDispatched,
        ).toHaveBeenCalledWith(shipment);

        // Assert 2: comprobamos que save() fue llamado con un objeto que tiene id 10 y status DISPATCHED
        // (usamos objectContaining porque el objeto real puede tener más propiedades)
        expect(repositoryMock.save).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 10,
                status: ShipmentStatus.DISPATCHED,
            }),
        );

        // Assert 3: el resultado final es el envío despachado
        expect(result).toEqual(savedShipment);
    });
});


/* Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        3.161 s, estimated 4 s
Ran all test suites matching /shipments.service.spec.ts/i.
*/


