/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PPLQueryParams {
  queryIndex: string;
  startTime?: string | number;
  endTime?: string | number;
  maxResults?: number;
  keyAttributes?: Record<string, string>;
  dataSource?: string;
}

export class PPLQueryBuilder {
  /**
   * Converts a timestamp to PPL format (ISO 8601): 'yyyy-MM-ddTHH:mm:ss.SSS+00:00'
   * Handles Unix timestamps (seconds or milliseconds) and ISO strings
   * Matches the timestamp format used in the new schema
   */
  private static formatTimestampForPPL(timestamp: string | number): string {
    let date: Date;

    if (typeof timestamp === 'number') {
      // Unix timestamp - determine if seconds or milliseconds
      if (timestamp > 10000000000) {
        // Milliseconds
        date = new Date(timestamp);
      } else {
        // Seconds
        date = new Date(timestamp * 1000);
      }
    } else {
      // String - could be ISO or already formatted
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    // Format as ISO 8601 with milliseconds and +00:00 timezone: 'yyyy-MM-ddTHH:mm:ss.SSS+00:00'
    // This matches the timestamp format in the schema: "2025-11-25T04:38:00.000+00:00"
    const isoString = date.toISOString();
    // Convert from "2025-11-25T04:38:00.000Z" to "2025-11-25T04:38:00.000+00:00"
    return isoString.replace('Z', '+00:00');
  }

  /**
   * Converts a timestamp to epoch seconds
   * Handles Unix timestamps (seconds or milliseconds) and ISO strings
   */
  private static convertToEpochSeconds(timestamp: string | number): number {
    if (typeof timestamp === 'number') {
      // Unix timestamp - determine if seconds or milliseconds
      if (timestamp > 10000000000) {
        // Milliseconds - convert to seconds
        return Math.floor(timestamp / 1000);
      } else {
        // Already in seconds
        return timestamp;
      }
    }

    // String - parse to Date and get epoch time in seconds
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${timestamp}`);
    }

    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Builds a time filter clause for PPL queries using ISO 8601 format
   *
   * This helper generates a WHERE clause that filters by the timestamp field (string format).
   * The timestamp field typically stores timestamps in ISO 8601 format (e.g., "2025-11-19T20:18:20.000Z").
   *
   * @param startTime - Start time as Unix timestamp (seconds/milliseconds) or ISO string
   * @param endTime - End time as Unix timestamp (seconds/milliseconds) or ISO string
   * @returns PPL WHERE clause filtering by timestamp, or empty string if either time is missing
   *
   * @example
   * Input: startTime=1763611100, endTime=1763612700
   * Output: ' | where timestamp >= "2025-11-19T20:18:20.000Z" and timestamp <= "2025-11-19T20:45:00.000Z"'
   *
   * Use this when:
   * - Your data stores timestamps in timestamp field as ISO 8601 strings
   * - You need string-based timestamp comparisons
   */
  private static buildTimeFilterClauseISO(
    startTime?: string | number,
    endTime?: string | number
  ): string {
    if (startTime && endTime) {
      const formattedStart = this.formatTimestampForPPL(startTime);
      const formattedEnd = this.formatTimestampForPPL(endTime);
      return ` | where timestamp >= "${formattedStart}" and timestamp <= "${formattedEnd}"`;
    }
    return '';
  }

  /**
   * Builds a time filter clause for PPL queries using epoch seconds
   *
   * This helper generates a WHERE clause that filters by the timestamp field (numeric format).
   * The timestamp field stores Unix timestamps in seconds (e.g., 1763611100).
   *
   * @param startTime - Start time as Unix timestamp (seconds/milliseconds) or ISO string
   * @param endTime - End time as Unix timestamp (seconds/milliseconds) or ISO string
   * @returns PPL WHERE clause filtering by timestamp, or empty string if either time is missing
   *
   * @example
   * Input: startTime=1763611100, endTime=1763612700
   * Output: ' | where timestamp >= 1763611100 and timestamp <= 1763612700'
   *
   * @example
   * Input: startTime="2025-11-19T20:18:20.000Z", endTime="2025-11-19T20:45:00.000Z"
   * Output: ' | where timestamp >= 1763611100 and timestamp <= 1763612700'
   *
   * Use this when:
   * - Your data stores timestamps in timestamp field as Unix epoch seconds (numeric)
   * - You need numeric timestamp comparisons (more efficient than string comparisons)
   * - This is the default for APM service queries
   */
  private static buildTimeFilterClauseEpoch(
    startTime?: string | number,
    endTime?: string | number
  ): string {
    if (startTime && endTime) {
      const startEpoch = this.convertToEpochSeconds(startTime);
      const endEpoch = this.convertToEpochSeconds(endTime);
      return ` | where timestamp >= ${startEpoch} and timestamp <= ${endEpoch}`;
    }
    return '';
  }

  static buildGetServiceQuery(params: PPLQueryParams): string {
    const { queryIndex, startTime, endTime, keyAttributes } = params;
    let query = `source=${queryIndex}`;
    query += this.buildTimeFilterClauseEpoch(startTime, endTime);

    query += ` | dedup hashCode`;
    query += ` | where eventType = 'ServiceOperationDetail'`;

    // Filter by service keyAttributes if provided
    if (keyAttributes?.Environment) {
      query += ` | where service.keyAttributes.environment = '${keyAttributes.Environment}'`;
    }
    if (keyAttributes?.Name) {
      query += ` | where service.keyAttributes.name = '${keyAttributes.Name}'`;
    }

    query += ` | fields service.keyAttributes, service.groupByAttributes`;

    return query;
  }

  static buildListServiceOperationsQuery(params: PPLQueryParams): string {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    let query = `source=${queryIndex}`;
    query += this.buildTimeFilterClauseEpoch(startTime, endTime);

    query += ` | dedup hashCode`;
    query += ` | where eventType = 'ServiceOperationDetail'`;

    // Filter by service keyAttributes if provided
    if (keyAttributes?.Environment) {
      query += ` | where service.keyAttributes.environment = '${keyAttributes.Environment}'`;
    }
    if (keyAttributes?.Name) {
      query += ` | where service.keyAttributes.name = '${keyAttributes.Name}'`;
    }
    // Note: Type field doesn't exist in service.keyAttributes in the data, only in transformed output

    query += ` | fields service.keyAttributes, operation.name, operation.remoteService.keyAttributes, operation.remoteOperationName`;

    return query;
  }

  static buildListServiceDependenciesQuery(params: PPLQueryParams): string {
    const { queryIndex, startTime, endTime, keyAttributes } = params;

    let query = `source=${queryIndex}`;
    query += this.buildTimeFilterClauseEpoch(startTime, endTime);

    query += ` | dedup hashCode`;
    query += ` | where eventType = 'ServiceOperationDetail'`;

    // Filter by service keyAttributes if provided
    if (keyAttributes?.Environment) {
      query += ` | where service.keyAttributes.environment = '${keyAttributes.Environment}'`;
    }
    if (keyAttributes?.Name) {
      query += ` | where service.keyAttributes.name = '${keyAttributes.Name}'`;
    }
    // Note: Type field doesn't exist in service.keyAttributes in the data, only in transformed output

    query += ` | fields service.keyAttributes, operation.remoteService.keyAttributes, operation.remoteOperationName`;

    return query;
  }

  static buildGetServiceMapQuery(params: PPLQueryParams): string {
    const { queryIndex, startTime, endTime } = params;

    let query = `source=${queryIndex}`;
    query += this.buildTimeFilterClauseEpoch(startTime, endTime);
    query += ` | dedup hashCode`;
    query += ` | where eventType = 'ServiceConnection'`;
    query += ` | fields service.keyAttributes, remoteService.keyAttributes, service.groupByAttributes, remoteService.groupByAttributes`;
    return query;
  }

  static buildListServicesQuery(params: PPLQueryParams): string {
    const { queryIndex, startTime, endTime } = params;

    let query = `source=${queryIndex}`;
    query += this.buildTimeFilterClauseEpoch(startTime, endTime);
    query += ` | dedup hashCode`;
    query += ` | where eventType = 'ServiceOperationDetail'`;
    query += ` | stats count() by service.keyAttributes.name, service.keyAttributes.environment, service.groupByAttributes`;
    return query;
  }

  static validateQueryIndex(queryIndex: string): boolean {
    // Basic validation for query index name
    if (!queryIndex || queryIndex.trim().length === 0) {
      return false;
    }

    // Check for valid index name pattern (basic validation)
    const indexPattern = /^[a-z0-9_.*-]+$/;
    return indexPattern.test(queryIndex);
  }

  static sanitizeTimeRange(startTime?: string, endTime?: string): { start?: string; end?: string } {
    // Basic time validation and sanitization
    const result: { start?: string; end?: string } = {};

    if (startTime) {
      try {
        const start = new Date(startTime);
        if (!isNaN(start.getTime())) {
          result.start = start.toISOString();
        }
      } catch (e) {
        // Invalid date, skip
      }
    }

    if (endTime) {
      try {
        const end = new Date(endTime);
        if (!isNaN(end.getTime())) {
          result.end = end.toISOString();
        }
      } catch (e) {
        // Invalid date, skip
      }
    }

    return result;
  }
}
