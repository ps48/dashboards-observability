/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTimeInSeconds, parseTimeRange } from './time_utils';

describe('time_utils', () => {
  describe('getTimeInSeconds', () => {
    it('should convert Date to Unix timestamp in seconds', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const result = getTimeInSeconds(date);
      expect(result).toBe(1735689600);
    });

    it('should handle current time', () => {
      const now = new Date();
      const result = getTimeInSeconds(now);
      const expected = Math.floor(now.getTime() / 1000);
      expect(result).toBe(expected);
    });

    it('should truncate milliseconds', () => {
      const date = new Date('2025-01-01T00:00:00.999Z');
      const result = getTimeInSeconds(date);
      expect(result).toBe(1735689600); // Should truncate .999
    });
  });

  describe('parseTimeRange', () => {
    it('should parse absolute time strings', () => {
      const timeRange = {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-01T01:00:00Z',
      };
      const result = parseTimeRange(timeRange);

      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.startTime.toISOString()).toBe('2025-01-01T00:00:00.000Z');
      expect(result.endTime.toISOString()).toBe('2025-01-01T01:00:00.000Z');
    });

    it('should parse relative time strings like "now-15m"', () => {
      const timeRange = {
        from: 'now-15m',
        to: 'now',
      };
      const result = parseTimeRange(timeRange);

      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);

      // Should be approximately 15 minutes difference (with some tolerance)
      const diffInMinutes = (result.endTime.getTime() - result.startTime.getTime()) / (1000 * 60);
      expect(diffInMinutes).toBeCloseTo(15, 0);
    });

    it('should parse "now" as current time', () => {
      const timeRange = {
        from: 'now-1h',
        to: 'now',
      };
      const beforeParse = Date.now();
      const result = parseTimeRange(timeRange);
      const afterParse = Date.now();

      // End time should be close to current time
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(beforeParse);
      expect(result.endTime.getTime()).toBeLessThanOrEqual(afterParse);
    });

    it('should handle "now-1d" (days)', () => {
      const timeRange = {
        from: 'now-1d',
        to: 'now',
      };
      const result = parseTimeRange(timeRange);

      const diffInHours =
        (result.endTime.getTime() - result.startTime.getTime()) / (1000 * 60 * 60);
      expect(diffInHours).toBeCloseTo(24, 0);
    });

    it('should default to current time if parsing fails', () => {
      const timeRange = {
        from: 'invalid-time',
        to: 'invalid-time',
      };
      const result = parseTimeRange(timeRange);

      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      // Should not throw error, should return valid dates
    });
  });
});
