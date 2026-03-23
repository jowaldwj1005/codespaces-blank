/**
 * Dataverse Service - Domain-friendly CRUD helpers wrapping generated services.
 * All Dataverse operations go through traced wrappers for debug visibility.
 */

import { SystemusersService } from '../generated/services/SystemusersService';
import { TeamsService } from '../generated/services/TeamsService';
import { BusinessunitsService } from '../generated/services/BusinessunitsService';
import type { Systemusers, SystemusersBase } from '../generated/models/SystemusersModel';
import type { Teams, TeamsBase } from '../generated/models/TeamsModel';
import type { Businessunits } from '../generated/models/BusinessunitsModel';
import { tracedOperation, tracedVoidOperation, lookupBind } from './sdk';
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

  create: (record: Omit<SystemusersBase, 'address1_addressid'>) =>
    tracedOperation<Systemusers>(
      'Systemusers.create',
      'dataverse',
      { record },
      () => SystemusersService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<SystemusersBase, 'address1_addressid'>>) =>
    tracedOperation<Systemusers>(
      'Systemusers.update',
      'dataverse',
      { id, fields },
      () => SystemusersService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'Systemusers.delete',
      'dataverse',
      { id },
      () => SystemusersService.delete(id)
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

  create: (record: Omit<TeamsBase, 'teamid'>) =>
    tracedOperation<Teams>(
      'Teams.create',
      'dataverse',
      { record },
      () => TeamsService.create(record)
    ),

  update: (id: string, fields: Partial<Omit<TeamsBase, 'teamid'>>) =>
    tracedOperation<Teams>(
      'Teams.update',
      'dataverse',
      { id, fields },
      () => TeamsService.update(id, fields)
    ),

  delete: (id: string) =>
    tracedVoidOperation(
      'Teams.delete',
      'dataverse',
      { id },
      () => TeamsService.delete(id)
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

// ─── Convenience Helpers ─────────────────────────────────────────────────────

/**
 * Create a team with lookup bindings pre-built.
 * IMPORTANT: Dataverse OData API requires lowercase lookup property names
 * (e.g. businessunitid@odata.bind, NOT BusinessUnitId@odata.bind).
 * The PAC CLI TypeScript interface uses PascalCase, but the actual API rejects it.
 * We cast to bypass the typed interface and send the correct lowercase keys.
 */
export function createTeam(opts: {
  name: string;
  description?: string;
  businessUnitId: string;
  administratorId: string;
  teamType?: 0 | 1 | 2 | 3;
  membershipType?: 0 | 1 | 2 | 3;
}) {
  const record = {
    name: opts.name,
    description: opts.description,
    'businessunitid@odata.bind': lookupBind('businessunits', opts.businessUnitId),
    'administratorid@odata.bind': lookupBind('systemusers', opts.administratorId),
    teamtype: opts.teamType ?? 0,
    membershiptype: opts.membershipType ?? 0,
  };
  return teams.create(record as unknown as Omit<TeamsBase, 'teamid'>);
}
