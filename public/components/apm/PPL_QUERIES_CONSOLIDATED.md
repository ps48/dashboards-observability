# PPL Queries Consolidation - Summary

## Changes Made

### 1. Created New Consolidated Query File

**New File:** `public/components/apm/utils/query_requests/ppl_queries.ts`

This file consolidates all PPL queries in a single location, following the same pattern as `promql_queries.ts`.

**Structure:**
- Uses simple function exports (not a class)
- Each function returns a complete PPL query string
- Follows naming convention: `getQuery[Operation]`
- All queries use numeric epoch timestamps (matching the actual data format)
- Includes comprehensive JSDoc documentation with examples

**Functions:**
1. `getQueryListServices()` - Lists all services (replaces buildListServicesQuery)
2. `getQueryGetService()` - Gets service details by key attributes
3. `getQueryListServiceOperations()` - Lists operations for a service
4. `getQueryListServiceDependencies()` - Lists dependencies for a service
5. `getQueryGetServiceMap()` - Gets service map/topology connections

### 2. Removed Extra Query

**Removed:** `buildListServicesQuery` with stats aggregation

**Before:**
```ppl
source=otel-apm-service-map
| where timestamp >= {epoch}
| dedup hashCode
| where eventType = 'ServiceOperationDetail'
| stats count() by service.keyAttributes.name, service.keyAttributes.environment, service.groupByAttributes
```

**After (using getQueryListServices):**
```ppl
source=otel-apm-service-map
| where timestamp >= {epoch}
| dedup hashCode
| where eventType = 'ServiceOperationDetail'
| fields service.keyAttributes, service.groupByAttributes
```

**Why:** The AWS APM plugin doesn't use stats aggregation. Instead, it fetches raw ServiceOperationDetail records and lets the response processor deduplicate and group them. This approach is more consistent with the other queries.

### 3. Updated PPLSearchService

**File:** `public/components/apm/utils/search_strategy/ppl_search_service.ts`

**Changes:**
- Replaced `PPLQueryBuilder` import with individual query functions from `ppl_queries.ts`
- Updated all 5 methods to use the new query functions
- Changed parameter passing from object format to individual parameters

**Before:**
```typescript
import { PPLQueryBuilder } from '../query_requests/ppl_query_builder';

const pplQuery = PPLQueryBuilder.buildListServicesQuery({
  queryIndex: queryIndex || 'otel-apm-service-map',
  startTime,
  endTime,
});
```

**After:**
```typescript
import { getQueryListServices } from '../query_requests/ppl_queries';

const pplQuery = getQueryListServices(
  queryIndex || 'otel-apm-service-map',
  startTime,
  endTime
);
```

### 4. Deprecated Old File

**File:** `public/components/apm/utils/query_requests/ppl_query_builder.ts`

Added deprecation notice at the top:
```typescript
/**
 * @deprecated This file is deprecated. Use ppl_queries.ts instead.
 * All PPL queries have been consolidated into ppl_queries.ts following the same pattern as promql_queries.ts
 */
```

This file can be deleted in a future cleanup, but is kept for now for reference.

## Query Comparison with AWS Plugin

All 5 PPL queries now **exactly match** the AWS APM plugin structure (except timestamp format, which is correct for our data):

| Query | Purpose | Matches AWS Plugin |
|-------|---------|-------------------|
| getQueryListServices | List all services | ✅ (new implementation) |
| getQueryGetService | Get service details | ✅ IDENTICAL |
| getQueryListServiceOperations | List service operations | ✅ IDENTICAL |
| getQueryListServiceDependencies | List service dependencies | ✅ IDENTICAL |
| getQueryGetServiceMap | Get service topology | ✅ IDENTICAL |

## Benefits

1. **Consistency:** Follows the same pattern as `promql_queries.ts`
2. **Simplicity:** No class wrapper, just exported functions
3. **Documentation:** Each query has JSDoc with examples
4. **AWS Compatibility:** All queries match AWS APM plugin structure
5. **Performance:** Removed stats aggregation in favor of client-side deduplication
6. **Maintainability:** All queries in one place, easier to understand and modify

## Testing

To verify the changes work:
1. Navigate to APM Home page - should show services list
2. Click on a service - should show service details
3. Go to Operations tab - should show service operations
4. Go to Dependencies tab - should show service dependencies
5. Check server logs - PPL queries should execute successfully

## Migration Notes

- No breaking changes to external APIs
- Response format remains the same
- All existing hooks and components continue to work
- Only internal query generation changed
