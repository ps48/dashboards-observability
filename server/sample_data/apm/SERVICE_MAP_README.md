# Service Map Data Format

This document describes the updated service map data format and how to generate sample data.

## New Data Format

The service map now uses the following format to represent service connections:

```json
{
  "hashCode": "XXXXX",
  "timestamp": 1763559002899,
  "eventType": "ServiceConnections",
  "service": {
    "AttributeMaps": [
      {"key": "service.version", "value": "1.2.3"},
      {"key": "deployment.environment", "value": "production"}
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
      {"key": "service.version", "value": "1.2.3"}
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

- **hashCode**: A unique identifier for de-duping at query time to minimize results
- **timestamp**: Unix timestamp (milliseconds) when the connection was observed
- **eventType**: Always "ServiceConnections" for service map data

### Service Object

- **AttributeMaps**: Array of key-value pairs containing additional service metadata
  - Examples: service version, SDK info, deployment details, K8s metadata, HTTP info, database system
- **GroupByAttributes**: Used for grouping and filtering services
  - **appName**: Application name (e.g., "Petclinic")
  - **BusinessUnit**: Business unit or team (e.g., "Payment", "Frontend")
- **keyAttributes**: Core identifying attributes
  - **environment**: Deployment environment (e.g., "eks:demo/default")
  - **name**: Service name
  - **Type**: Service type (e.g., "Service", "Database")

### DependencyService Object

Similar structure to service, but only contains:
- **AttributeMaps**: Metadata about the dependency
- **keyAttributes**: Core identifying attributes (no GroupByAttributes)

## Generating Sample Data

### Using the Generator Script

Run the generator to create sample service connection data:

```bash
node src/plugins/home/server/services/sample_data/data_sets/otel/generate_sample_service_map.js > sample_output.ndjson
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

## Field Mappings

The OpenSearch field mappings are defined in `services_field_mappings.ts`:

- `hashCode`: keyword (for efficient de-duping)
- `timestamp`: long (Unix timestamp)
- `eventType`: keyword
- Nested objects for service and dependencyService with appropriate mappings

## Example Use Cases

### Query for Specific Service Connections

```json
{
  "query": {
    "bool": {
      "must": [
        {"term": {"service.keyAttributes.name": "pet-clinic-frontend-java"}},
        {"term": {"service.keyAttributes.environment": "eks:demo/default"}}
      ]
    }
  }
}
```

### Group by Application

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

### De-duplication

Use the `hashCode` field to remove duplicate connections in the same time window:

```json
{
  "aggs": {
    "unique_connections": {
      "terms": {
        "field": "hashCode"
      }
    }
  }
}
```

## Migration Notes

The new format replaces the older schema which had fields like:
- `serviceName` → `service.keyAttributes.name`
- `kind` → No longer used
- `destination` → `dependencyService`
- `target` → `dependencyService`
- `hashId` → `hashCode`

The new format provides:
1. Better support for grouping and filtering
2. Richer metadata through AttributeMaps
3. Consistent structure between service and dependency
4. Built-in de-duplication support
