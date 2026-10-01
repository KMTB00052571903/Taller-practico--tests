import { NotFoundException } from '@nestjs/common'; // Para validar el error 404 si el findOne() no encuentra el envío
import { Test } from '@nestjs/testing';              // Para armar el módulo ficticio y arrancar el entorno de pruebas
import { getRepositoryToken } from '@nestjs/typeorm'; // Para engañar a Nest y conectar el repositorio falso (mock) de TypeORM
import { ShipmentEntity } from './entities/shipment.entity'; // Para que el test reconozca la estructura del objeto Envío
import { ShipmentRulesService } from './shipment-rules.service'; // Para mockear las reglas de negocio y que no interfieran en el test
import { ShipmentStatus } from './shipment-status.enum'; // Para revisar que el envío cambie bien entre CREATED y DISPATCHED
import { ShipmentsService } from './shipments.service'; // El servicio de verdad, el que vamos a llenar de pruebas para ver si sirve

