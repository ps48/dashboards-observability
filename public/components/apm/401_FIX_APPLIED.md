# Fix for 401 Authentication Error

## Root Cause Analysis

The 401 error was caused by **mixing up `dataSourceId` with `queryIndex`**:

### The Problem:

In `use_service_data.ts`, we were passing:
```typescript
queryIndex: dataSourceId,  // ❌ WRONG! dataSourceId = 'default'
```

This caused the PPL query to be:
```
source=default | where ...
```

**Issue #1**: `default` is not a valid OpenSearch index name
**Issue #2**: Even if it was, we'd be querying the wrong index

### What These Parameters Mean:

- **`queryIndex`**: The **OpenSearch index name** to query (e.g., 'otel-apm-service-map')
- **`dataSourceId`**: The **MDS data source ID** for routing (e.g., 'my-cluster-id', or 'default' for local)

These are two different concepts that we were conflating!

## The Fix

### 1. Use Correct Index Name ✅

**File**: `public/components/apm/shared/hooks/use_service_data.ts`

**Before**:
```typescript
const params = useMemo(
  () => ({
    queryIndex: dataSourceId,  // ❌ Wrong - this is 'default'
    ...
  }),
  [dataSourceId, ...]
);
```

**After**:
```typescript
import { DEFAULT_TOPOLOGY_INDEX } from '../../../../../common/constants/apm_config';

const params = useMemo(
  () => ({
    queryIndex: DEFAULT_TOPOLOGY_INDEX,  // ✅ Correct - 'otel-apm-service-map'
    ...
  }),
  [timeRange.startTime, timeRange.endTime]  // dataSourceId removed from deps
);
```

### 2. Update PPL Search Service ✅

**File**: `public/components/apm/utils/search_strategy/ppl_search_service.ts`

**Changes**:
- All methods now use `queryIndex` correctly (not 'default')
- `buildSearchRequest()` simplified - doesn't set `dataSource.id`
- For local OpenSearch, backend uses `.asScoped(request)` with browser auth

**Before**:
```typescript
const searchRequest = this.buildSearchRequest(pplQuery, params.queryIndex || 'default');
// Creates: source=default (WRONG!)
```

**After**:
```typescript
const searchRequest = this.buildSearchRequest(pplQuery, queryIndex || 'otel-apm-service-map');
// Creates: source=otel-apm-service-map (CORRECT!)
```

### 3. Simplified Dataset Configuration ✅

**Before** (complex, confusing):
```typescript
dataset: {
  id: dataSourceId,  // Could be 'default'
  dataSource: {
    id: dataSourceId,  // For MDS routing
  },
}
```

**After** (simple, clear):
```typescript
dataset: {
  id: datasetId,  // 'otel-apm-service-map'
  title: datasetId,
  type: 'DEFAULT_INDEX_PATTERNS',
  timeFieldName: 'Time',
  // dataSource intentionally NOT set for local OpenSearch
}
```

## How It Works Now

### Request Flow:

1. **Frontend** (`use_service_data.ts`):
   ```typescript
   queryIndex: 'otel-apm-service-map'  // ✅ Actual index name
   ```

2. **PPL Search Service**:
   ```typescript
   const pplQuery = PPLQueryBuilder.buildListServicesQuery({
     queryIndex: 'otel-apm-service-map',  // Used in "source=" clause
     ...
   });
   // Creates: "source=otel-apm-service-map | where ..."
   ```

3. **Search Request**:
   ```typescript
   dataset: {
     id: 'otel-apm-service-map',
     // No dataSource.id, so backend uses default client
   }
   ```

4. **Backend** (PPL Facet):
   ```typescript
   const clientId = query.dataset?.dataSource?.id;  // undefined
   const client = clientId
     ? context.dataSource.opensearch.legacy.getClient(clientId).callAPI
     : this.defaultClient.asScoped(request).callAsCurrentUser;  // ✅ Uses this path
   ```

5. **Authentication**:
   - Browser sends HTTP request with cookies/auth headers
   - Backend receives request with auth
   - `.asScoped(request)` uses the authenticated request
   - Query executes successfully! ✅

## Expected Results

✅ PPL query now correctly queries 'otel-apm-service-map' index
✅ Authentication uses browser credentials via `.asScoped(request)`
✅ No more 401 errors
✅ Services page loads successfully

## Testing

After this fix, you should see:

1. ✅ No 401 errors in server logs
2. ✅ PPL query shows: `source=otel-apm-service-map` (not `source=default`)
3. ✅ Services list loads correctly
4. ✅ Property filter and time picker work

## Key Learnings

**Mistake**: Conflating `dataSourceId` (MDS routing) with `queryIndex` (index name)

**Lesson**: Always use correct parameter for the job:
- `queryIndex` → OpenSearch index name for the PPL query
- `dataSourceId` → MDS data source ID for routing (if using MDS)
- For local OpenSearch, only `queryIndex` is needed

**Pattern**: When NOT using MDS, don't set `dataset.dataSource.id`
- This allows backend to use `.asScoped(request)` properly
- Browser credentials are passed automatically
- Authentication works seamlessly

---

**Status**: ✅ FIXED - Ready for testing!
