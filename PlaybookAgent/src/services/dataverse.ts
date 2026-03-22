/**
 * Dataverse Service - Domain-friendly CRUD helpers wrapping generated services.
 * All Dataverse operations go through traced wrappers for debug visibility.
 */

import { SystemusersService } from '../generated/services/SystemusersService';
import { TeamsService } from '../generated/services/TeamsService';
import { BusinessunitsService } from '../generated/services/BusinessunitsService';
import type { Systemusers } from '../generated/models/SystemusersModel';
import type { Teams } from '../generated/models/TeamsModel';
import type { Businessunits } from '../generated/models/BusinessunitsModel';
import { tracedOperation, tracedVoidOperation } from './sdk';
import type { IGetAllOptions, IGetOptions } from './sdk';

// ─── Systemusers ─────────────────────────────────────────────────────────────

export const systemusers = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Systemusers[]>(
      'Systemusers.getAll',
      'dataverse',
      { options },
      () => SystemusersService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Systemusers>(
      'Systemusers.get',
      'dataverse',
      { id, options },
      () => SystemusersService.get(id, options)
    ),

  getMetadata: () =>
    tracedOperation(
      'Systemusers.getMetadata',
      'dataverse',
      {},
      () => SystemusersService.getMetadata()
    ),
};

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Teams[]>(
      'Teams.getAll',
      'dataverse',
      { options },
      () => TeamsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Teams>(
      'Teams.get',
      'dataverse',
      { id, options },
      () => TeamsService.get(id, options)
    ),

  getMetadata: () =>
    tracedOperation(
      'Teams.getMetadata',
      'dataverse',
      {},
      () => TeamsService.getMetadata()
    ),
};

// ─── Business Units ──────────────────────────────────────────────────────────

export const businessunits = {
  getAll: (options?: IGetAllOptions) =>
    tracedOperation<Businessunits[]>(
      'Businessunits.getAll',
      'dataverse',
      { options },
      () => BusinessunitsService.getAll(options)
    ),

  get: (id: string, options?: IGetOptions) =>
    tracedOperation<Businessunits>(
      'Businessunits.get',
      'dataverse',
      { id, options },
      () => BusinessunitsService.get(id, options)
    ),

  getMetadata: () =>
    tracedOperation(
      'Businessunits.getMetadata',
      'dataverse',
      {},
      () => BusinessunitsService.getMetadata()
    ),
};

// ─── Generic Delete (shared pattern) ─────────────────────────────────────────

export function deleteSystemuser(id: string) {
  return tracedVoidOperation(
    'Systemusers.delete',
    'dataverse',
    { id },
    () => SystemusersService.delete(id)
  );
}

export function deleteTeam(id: string) {
  return tracedVoidOperation(
    'Teams.delete',
    'dataverse',
    { id },
    () => TeamsService.delete(id)
  );
}
