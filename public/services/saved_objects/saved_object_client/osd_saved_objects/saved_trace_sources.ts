/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsFindOptions } from '../../../../../../../src/core/public';
import {
  SAVED_OBJECT_VERSION,
  TRACE_SOURCE_SAVED_OBJECT,
  TraceSourceSavedObjectAttributes,
} from '../../../../../common/types/observability_saved_object_attributes';
import { TraceSource } from '../../../../../common/types/trace_analytics';
import { getOSDSavedObjectsClient } from '../../../../../common/utils';
import {
  SavedObjectsDeleteBulkParams,
  SavedObjectsDeleteParams,
  SavedObjectsDeleteResponse,
  SavedObjectsGetParams,
  SavedObjectsGetResponse,
} from '../types';
import { OSDSavedObjectClient } from './osd_saved_object_client';
import { OSDSavedObjectCreateResponse, OSDSavedObjectUpdateResponse } from './types';

type CreateParams = TraceSource;
type UpdateParams = TraceSource & { objectId: string };

export class OSDSavedTraceSourceClient extends OSDSavedObjectClient {
  private static instance: OSDSavedTraceSourceClient;

  protected prependTypeToId(objectId: string) {
    return `${TRACE_SOURCE_SAVED_OBJECT}:${objectId}`;
  }

  async create(
    params: CreateParams
  ): Promise<OSDSavedObjectCreateResponse<TraceSourceSavedObjectAttributes>> {
    console.log('params :', params);
    const response = await this.client.create<TraceSourceSavedObjectAttributes>(
      TRACE_SOURCE_SAVED_OBJECT,
      {
        title: params.name,
        description: params.description,
        version: SAVED_OBJECT_VERSION,
        createdTimeMs: new Date().getTime(),
        traceSource: {
          ...params,
        },
      }
    );

    return {
      objectId: this.prependTypeToId(response.id),
      object: response,
    };
  }

  async update(
    params: UpdateParams
  ): Promise<OSDSavedObjectUpdateResponse<TraceSourceSavedObjectAttributes>> {
    const response = await this.client.update<Partial<TraceSourceSavedObjectAttributes>>(
      TRACE_SOURCE_SAVED_OBJECT,
      OSDSavedObjectClient.extractTypeAndUUID(params.objectId).uuid,
      {
        title: params.name,
        description: params.description,
        version: SAVED_OBJECT_VERSION,
        traceSource: {
          ...params,
        },
      }
    );

    return {
      objectId: this.prependTypeToId(response.id),
      object: response,
    };
  }

  updateBulk(_params: unknown): Promise<Array<Promise<unknown>>> {
    throw new Error('Method not implemented.');
  }

  async get(params: SavedObjectsGetParams): Promise<SavedObjectsGetResponse> {
    const response = await this.client.get<TraceSourceSavedObjectAttributes>(
      TRACE_SOURCE_SAVED_OBJECT,
      OSDSavedTraceSourceClient.extractTypeAndUUID(params.objectId).uuid
    );
    return {
      observabilityObjectList: [
        {
          objectId: this.prependTypeToId(response.id),
          createdTimeMs: response.attributes.createdTimeMs,
          lastUpdatedTimeMs: OSDSavedTraceSourceClient.convertToLastUpdatedMs(response.updated_at),
          traceSource: response.attributes.traceSource,
        },
      ],
    };
  }

  async getBulk(params: Partial<SavedObjectsFindOptions> = {}): Promise<SavedObjectsGetResponse> {
    const observabilityObjectList = await this.client
      .find<TraceSourceSavedObjectAttributes>({
        ...params,
        type: TRACE_SOURCE_SAVED_OBJECT,
      })
      .then((findRes) =>
        findRes.savedObjects.map((o) => ({
          objectId: this.prependTypeToId(o.id),
          createdTimeMs: o.attributes.createdTimeMs,
          lastUpdatedTimeMs: OSDSavedTraceSourceClient.convertToLastUpdatedMs(o.updated_at),
          traceSource: o.attributes.traceSource,
        }))
      );
    return { totalHits: observabilityObjectList.length, observabilityObjectList };
  }

  async delete(params: SavedObjectsDeleteParams): Promise<SavedObjectsDeleteResponse> {
    const uuid = OSDSavedObjectClient.extractTypeAndUUID(params.objectId).uuid;
    return this.client
      .delete(TRACE_SOURCE_SAVED_OBJECT, uuid)
      .then(() => ({ deleteResponseList: { [params.objectId]: 'OK' } }))
      .catch((res) => ({ deleteResponseList: { [params.objectId]: res } }));
  }

  async deleteBulk(params: SavedObjectsDeleteBulkParams): Promise<SavedObjectsDeleteResponse> {
    const deleteResponseList: SavedObjectsDeleteResponse['deleteResponseList'] = {};
    await Promise.allSettled(params.objectIdList.map((objectId) => this.delete({ objectId }))).then(
      (res) => {
        res.forEach((r, i) => {
          deleteResponseList[params.objectIdList[i]] =
            r.status === 'fulfilled'
              ? r.value.deleteResponseList[params.objectIdList[i]]
              : r.reason;
        });
      }
    );
    return { deleteResponseList };
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new this(getOSDSavedObjectsClient());
    }
    return this.instance;
  }
}
