# Service Map Data Format

This document describes the updated service map data format for ingesting service connection data into the AWSAPMDashboardsPlugin.

## New Data Format

The service map now uses the following format to represent service connections:

```json
{
  "hashCode": "XXXXX",
  "timestamp": 1731994815000,
  "eventType": "ServiceConnections",
  "service": {
    "AttributeMaps": [
      { "service.version": "1.2.3" },
      { "deployment.environment": "production" }
    ],
    "GroupByAttributes": {
      "appName": "Petclinic",
      "BusinessUnit": "Payment"
    },
    "keyAttributes": {
      "environment": "eks:demo/default",
      "name": "pet-clinic-frontend-java",
      "Type": "Service"
    }
  },
  "dependencyService": {
    "AttributeMaps": [
      { "service.version": "1.2.3" }
    ],
    "keyAttributes": {
      "environment": "eks:demo/default",
      "name": "pet-clinic-backend-java",
      "Type": "Service"
    }
  }
}
```

## Field Descriptions

### Top-level Fields

- **hashCode** (string, required): A unique identifier for de-duping at query time to minimize results
- **timestamp** (number, required): Unix timestamp in milliseconds when the connection was observed
- **eventType** (string, required): Always "ServiceConnections" for service map data

### Service Object

The `service` object represents the source service in the connection.

#### AttributeMaps (array of objects)
Array of key-value pairs containing additional service metadata. Each object contains a single key-value pair.

Common attributes include:
- `service.version`: Service version number
- `deployment.environment`: Deployment environment
- `telemetry.sdk.name`: Telemetry SDK name (e.g., "opentelemetry")
- `telemetry.sdk.language`: Programming language (e.g., "java", "python", "nodejs")
- `telemetry.sdk.version`: SDK version
- `host.name`: Host machine name
- `k8s.namespace.name`: Kubernetes namespace
- `k8s.pod.name`: Kubernetes pod name
- `k8s.deployment.name`: Kubernetes deployment name
- `http.method`: HTTP method for the connection
- `http.status_code`: HTTP status code
- `db.system`: Database system type

#### GroupByAttributes (object)
Used for grouping and filtering services in the UI.

- **appName** (string): Application name (e.g., "Petclinic", "PaymentApp")
- **BusinessUnit** (string): Business unit or team name (e.g., "Payment", "Frontend", "Backend")

#### keyAttributes (object, required)
Core identifying attributes for the service.

- **environment** (string, required): Deployment environment identifier
  - Format: `{platform}:{cluster}/{namespace}`
  - Examples: `eks:demo/default`, `ec2:default`, `lambda:default`
- **name** (string, required): Service name
- **Type** (string, required): Service type (e.g., "Service", "Database", "Cache")

### DependencyService Object

The `dependencyService` object represents the target service in the connection. It has a similar structure to the service object but only contains:

- **AttributeMaps** (array of objects): Metadata about the dependency
- **keyAttributes** (object, required): Core identifying attributes
  - **environment** (string, required)
  - **name** (string, required)
  - **Type** (string, required)

Note: `dependencyService` does not include `GroupByAttributes` since grouping is only applied at the source service level.

## Generating Sample Data

### Using the Generator Script

Run the generator to create sample service connection data:

```bash
node plugins/AWSAPMDashboardsPlugin/server/sample_data/generateServiceMapRawData.js > output.ndjson
```

The script generates 32 service connection records across:
- 8 different services (frontend, backend, database, payment, notification, auth, user, inventory)
- 4 environments (eks:demo, eks:production, eks:staging, docker:local)
- 8 connection patterns representing typical microservice architecture

### Output Format

The script outputs NDJSON (newline-delimited JSON), with one JSON object per line. This format is ideal for:
- Bulk indexing into OpenSearch
- Line-by-line processing
- Streaming data ingestion

## Integration with OpenSearch

### Index Structure

Service connection data should be indexed with appropriate mappings:

```json
{
  "mappings": {
    "properties": {
      "hashCode": { "type": "keyword" },
      "timestamp": { "type": "long" },
      "eventType": { "type": "keyword" },
      "service": {
        "properties": {
          "AttributeMaps": { "type": "object" },
          "GroupByAttributes": {
            "properties": {
              "appName": { "type": "keyword" },
              "BusinessUnit": { "type": "keyword" }
            }
          },
          "keyAttributes": {
            "properties": {
              "environment": { "type": "keyword" },
              "name": { "type": "keyword" },
              "Type": { "type": "keyword" }
            }
          }
        }
      },
      "dependencyService": {
        "properties": {
          "AttributeMaps": { "type": "object" },
          "keyAttributes": {
            "properties": {
              "environment": { "type": "keyword" },
              "name": { "type": "keyword" },
              "Type": { "type": "keyword" }
            }
          }
        }
      }
    }
  }
}
```

### Query Examples

#### Query for Specific Service Connections

```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "service.keyAttributes.name": "pet-clinic-frontend-java" }},
        { "term": { "service.keyAttributes.environment": "eks:demo/default" }}
      ]
    }
  }
}
```

#### Group by Application

```json
{
  "aggs": {
    "by_app": {
      "terms": {
        "field": "service.GroupByAttributes.appName"
      }
    }
  }
}
```

#### De-duplication Query

Use the `hashCode` field to remove duplicate connections:

```json
{
  "aggs": {
    "unique_connections": {
      "terms": {
        "field": "hashCode",
        "size": 10000
      }
    }
  }
}
```

## Migration from Previous Format

### Old Format Fields → New Format Mapping

| Old Field | New Field |
|-----------|-----------|
| `serviceName` | `service.keyAttributes.name` |
| `kind` | Not used (deprecated) |
| `destination.domain` | `dependencyService.keyAttributes.name` |
| `destination.resource` | Mapped to `dependencyService.AttributeMaps` |
| `target.domain` | `dependencyService.keyAttributes.name` |
| `target.resource` | Mapped to `dependencyService.AttributeMaps` |
| `hashId` | `hashCode` |
| `traceGroupName` | Mapped to `service.AttributeMaps` or removed |

### Benefits of New Format

1. **Better Grouping Support**: `GroupByAttributes` enables flexible grouping by application and business unit
2. **Richer Metadata**: `AttributeMaps` provides extensible key-value storage for any service metadata
3. **Consistent Structure**: Both service and dependency use similar structure for easier processing
4. **Built-in De-duplication**: `hashCode` field enables efficient duplicate detection
5. **Type Safety**: Explicit `Type` field for services distinguishes between Service, Database, Cache, etc.

## Data Validation

### Required Fields Checklist

- [ ] `hashCode` is present and non-empty
- [ ] `timestamp` is a valid Unix timestamp in milliseconds
- [ ] `eventType` equals "ServiceConnections"
- [ ] `service.keyAttributes.environment` is present
- [ ] `service.keyAttributes.name` is present
- [ ] `service.keyAttributes.Type` is present
- [ ] `dependencyService.keyAttributes.environment` is present
- [ ] `dependencyService.keyAttributes.name` is present
- [ ] `dependencyService.keyAttributes.Type` is present

### Optional but Recommended

- [ ] `service.AttributeMaps` contains at least one metadata entry
- [ ] `service.GroupByAttributes.appName` is provided for grouping
- [ ] `service.GroupByAttributes.BusinessUnit` is provided for filtering
- [ ] `dependencyService.AttributeMaps` contains relevant metadata

## OpenSearch Bulk Insert Format

For direct ingestion into OpenSearch, use the bulk insert format compatible with `buildGetServiceMapQuery` in `ppl_query_builder.ts`.

### Required Fields for Query Compatibility

The following fields are **REQUIRED** for the PPL queries to work correctly:

1. **@timestamp** (string, ISO 8601 format): Primary timestamp field used by all PPL queries
   - Format: `YYYY-MM-DDTHH:mm:ss.SSSZ` (ISO 8601 with 'T' and 'Z')
   - Example: `"2024-11-19T07:00:15.000Z"`
   - **IMPORTANT:** Must use ISO 8601 for OpenSearch date field indexing
   - The PPL query builder (in `ppl_query_builder.ts`) automatically converts to space-separated format for WHERE clauses
   - Used by: All PPL queries with time range filters

2. **timestamp** (number, Unix seconds): Secondary timestamp in Unix epoch seconds
   - Example: `1731994815`
   - Backup for time-based operations

3. **serviceName** (string): Source service identifier
   - Used by: `buildGetServiceMapQuery`, `buildListServicesQuery`, filtering operations
   - Maps to: `service.keyAttributes.name` in nested format

4. **remoteService** (string): Target/dependency service identifier
   - Used by: `buildGetServiceMapQuery` for edges
   - Maps to: `dependencyService.keyAttributes.name` in nested format
   - **Must be non-null** for service map queries

5. **localOperation** (string): Operation name on source service
   - Example: `"GET /"`, `"POST /api/payments"`
   - Used by: Operation-level queries

6. **remoteOperation** (string): Operation name on target service
   - Example: `"GET /api/owners"`, `"SELECT"`

7. **PlatformType** (string): Platform where service is deployed
   - Values: `"AWS::EKS"`, `"AWS::EC2"`, `"AWS::Lambda"`, `"Generic"`, etc.
   - Used by: Platform filtering in queries

8. **EnvironmentType** (string): Environment identifier
   - Format: `{platform}:{cluster}/{namespace}`
   - Examples: `"eks:demo/default"`, `"ec2:default"`
   - Maps to: `service.keyAttributes.environment` in nested format

### Additional Metadata Fields

These fields provide rich context but are not strictly required for queries:

- **hashCode**: De-duplication identifier
- **eventType**: Always `"ServiceConnections"`
- **appName**: Application name for grouping (from `GroupByAttributes.appName`)
- **BusinessUnit**: Business unit for filtering (from `GroupByAttributes.BusinessUnit`)
- **serviceType**: Type of source service (`"Service"`, `"Database"`, etc.)
- **dependencyType**: Type of dependency service
- Flattened attribute fields: `service.version`, `telemetry.sdk.language`, `db.system`, etc.

### Bulk Insert Example

```
POST _bulk
{ "index" : { "_index" : "service_map_index" } }
{"hashCode": "ABC123DEF", "timestamp": 1731994815, "@timestamp": "2024-11-19T07:00:15.000Z", "eventType": "ServiceConnections", "serviceName": "pet-clinic-frontend-java", "remoteService": "pet-clinic-backend-java", "localOperation": "GET /", "remoteOperation": "GET /api/owners", "PlatformType": "AWS::EKS", "EnvironmentType": "eks:demo/default", "service.version": "1.2.3", "telemetry.sdk.language": "java", "appName": "Petclinic", "BusinessUnit": "Frontend", "serviceType": "Service", "dependencyType": "Service"}
```

**Note:** The @timestamp field uses ISO 8601 format (`"2024-11-19T07:00:15.000Z"`) for proper OpenSearch date field indexing. The PPL query builder automatically converts this to space-separated format when generating WHERE clauses.

### Generating Bulk Insert Data

Run the generator to create bulk insert format:

```bash
node plugins/AWSAPMDashboardsPlugin/server/sample_data/generateServiceMapBulkInsert.js [index_name] > output.txt
```

Default index name is `service_map_index` if not specified.

## Sample Files

- **serviceMapRawData.json**: Contains 5 example service connections in nested array format
- **generateServiceMapRawData.js**: Node.js script to generate nested format data programmatically
- **serviceMapBulkInsert.txt**: OpenSearch bulk insert format with 10 example records
- **generateServiceMapBulkInsert.js**: Node.js script to generate bulk insert format

## Additional Resources

- See `getServiceMap.json` for the current API response format
- Review TypeScript types in `public/types/services.d.ts` for complete type definitions
- Check `server/apmService/utils/response_processor.ts` for data transformation logic
