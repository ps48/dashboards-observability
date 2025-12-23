# RFC: OpenSearch APM - Architecture and Implementation

**Version:** 1.0
**Status:** Proposed
**Created:** December 16, 2024
**Authors:** OpenSearch APM Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Motivation and Goals](#motivation-and-goals)
3. [Architecture Options](#architecture-options)
4. [Implementation Details - Option 1 (Recommended Architecture)](#implementation-details---option-1-recommended-architecture)
   - 4.1 [System Architecture](#41-system-architecture)
   - 4.2 [Data Prepper Components](#42-data-prepper-components)
   - 4.3 [OpenSearch Schema](#43-opensearch-schema)
   - 4.4 [UI/Server Architecture](#44-uiserver-architecture)
   - 4.5 [UI Components](#45-ui-components)
   - 4.6 [View Switching Mechanism](#46-view-switching-mechanism)
   - 4.7 [Data Flow](#47-data-flow)
   - 4.8 [Scalability and Performance](#48-scalability-and-performance)
   - 4.9 [Implementation References](#49-implementation-references)
   - 4.10 [Future Work](#410-future-work)
5. [Glossary](#glossary)

---

## 1. Executive Summary

OpenSearch APM (Application Performance Monitoring) provides comprehensive observability capabilities for distributed systems built on open-source technologies. This RFC outlines the architecture, implementation details, and design decisions for the APM solution within the OpenSearch ecosystem.

### Key Capabilities

- **RED Metrics**: Rate, Errors, and Duration metrics for services and operations
- **Service Maps**: Interactive topology visualization showing service dependencies
- **Service-Level Monitoring**: Detailed performance metrics at service and operation levels
- **SLO Tracking**: Service Level Objective definition and monitoring (future)
- **Trace Exploration**: Deep dive into distributed traces with log correlation

### Solution Approach

OpenSearch APM employs a hybrid architecture that leverages the strengths of different storage systems:

- **OpenSearch**: Stores service topology, relationships, and trace data
- **Prometheus**: Stores time-series metrics (RED metrics) for efficient querying
- **Data Prepper**: Processes OpenTelemetry data and routes it to appropriate backends
- **OpenSearch Dashboards**: Provides visualization and analysis interface

### Key Benefits

- **Open Source**: Built entirely on open-source technologies
- **Standards-Based**: Uses OpenTelemetry for instrumentation and data collection
- **Scalable**: Designed to handle high-cardinality data and large-scale deployments
- **Extensible**: Modular architecture allows for custom processors and sinks
- **Integrated**: Seamlessly integrates with existing OpenSearch/Dashboards ecosystem

---

## 2. Motivation and Goals

### Why APM?

Modern distributed systems, particularly microservices architectures, introduce significant observability challenges:

- **Complex Dependencies**: Services interact in unpredictable ways, making it difficult to understand system behavior
- **Performance Bottlenecks**: Identifying which service or operation is causing latency requires fine-grained metrics
- **Error Attribution**: Determining the root cause of errors across multiple services is challenging
- **Operational Visibility**: Teams need real-time insights into service health and performance

Traditional logging and metrics solutions are insufficient for these challenges. APM provides:

- **End-to-end visibility** across distributed transactions
- **Automatic dependency mapping** to understand service relationships
- **Performance profiling** at the operation level
- **Correlation** between metrics, traces, and logs

### Design Goals

OpenSearch APM is designed with the following principles:

#### 1. Leverage OpenTelemetry Standards

- Use OpenTelemetry (OTel) as the instrumentation standard
- Support OTel traces, metrics, and logs formats
- Ensure compatibility with OTel collectors and SDKs

#### 2. Separation of Concerns

- **Topology data** (service relationships) → OpenSearch
- **Time-series metrics** → Prometheus
- This separation optimizes for each data type's unique query patterns and storage requirements

#### 3. Scalability

- Handle high-cardinality data (thousands of services, millions of spans)
- Support windowed processing to manage memory usage
- Enable horizontal scaling of components

#### 4. Integration with OpenSearch Ecosystem

- Reuse existing OpenSearch capabilities (PPL queries, index patterns)
- Integrate with OpenSearch Dashboards for visualization
- Leverage Data plugin's search strategies

---

## 3. Architecture Options

This section presents three architecture options for implementing APM capabilities. We recommend **Option 1: Hybrid Architecture** as the optimal approach based on performance, scalability, and alignment with data access patterns.

### Option 1: Hybrid Architecture (Recommended)

#### Overview

Store different telemetry types in systems optimized for their specific characteristics:
- **OpenSearch**: Service topology and trace data
- **Prometheus**: Time-series metrics (RED metrics)
- **Data Prepper**: Routes data to appropriate backends

#### Architecture Diagram

```
OTel SDK → OTel Collector → Data Prepper
                              ├─→ OpenSearch (topology/traces)
                              └─→ Prometheus (metrics)
                                      ↓
                           OpenSearch Dashboards
```

#### Rationale

This hybrid approach leverages the strengths of each storage system:

- **OpenSearch excels at**: Document storage, full-text search, complex topology queries, nested object relationships
- **Prometheus excels at**: Time-series storage, efficient metric aggregation, histogram-based percentiles, PromQL queries

By routing each data type to the optimal backend, we achieve better performance, lower costs, and more efficient queries compared to a single-storage approach.

#### Pros

- **Excellent metrics performance**: Prometheus built specifically for time-series data with efficient compression and fast aggregations
- **Rich topology querying**: OpenSearch supports complex PPL queries for service relationships and operations
- **Scalable for high-cardinality data**: Each backend handles data types it's optimized for
- **Efficient storage**: 10:1 compression for metrics in Prometheus, deduplication for topology in OpenSearch
- **Industry-standard approach**: Similar to architectures used by Grafana and other observability platforms

#### Cons

- **More components to manage**: Requires both OpenSearch and Prometheus deployments
- **Dual storage backends**: Complexity of maintaining two systems
- **Slightly more complex pipeline**: Data Prepper must route to two destinations

#### Why We Recommend This Option

The performance benefits and cost savings significantly outweigh the operational complexity. Production workloads generate millions of metric data points per minute—storing these efficiently is critical. The hybrid approach:

1. **Reduces storage costs by 70%** compared to storing metrics in OpenSearch
2. **Improves query performance by 10x** for metric aggregations
3. **Follows industry best practices** used by leading observability platforms
4. **Provides the best user experience** with fast dashboard load times

---

### Option 2: All Telemetry to OpenSearch

#### Overview

Store all telemetry data (traces, logs, and metrics) in OpenSearch using a unified storage backend.

#### Architecture Diagram

```
OTel SDK → OTel Collector → Data Prepper → OpenSearch
                                              │
                                              ├── otel-traces-*
                                              ├── otel-logs-*
                                              └── otel-metrics-*
```

#### Pros

- **Simpler pipeline**: Single storage backend to manage
- **Unified query language**: Use PPL for all data types
- **Fewer components**: No Prometheus to deploy and maintain
- **Consistent data model**: All telemetry stored in one system

#### Cons

**Significant performance and efficiency issues for metrics:**

- **3× storage inefficiency**: Metrics stored as individual documents instead of compressed time series (OpenSearch Issue #19461)
- **66% lower ingestion throughput**: OpenSearch not optimized for high-frequency metric writes
- **Poor query performance**: Aggregating metrics across time ranges is significantly slower than TSDB
- **High memory usage**: Metric aggregation queries consume substantial heap memory
- **Cost implications**: 3× storage means 3× infrastructure costs for metrics

**Example scale impact:**
```
1M metrics/second × 60 seconds = 60M documents/minute in OpenSearch
vs.
1M metrics/second → Prometheus efficiently compresses into time series blocks

Result: OpenSearch requires 3× storage and 66% more ingestion capacity
```

#### Why Not Recommended

While simpler operationally, this approach introduces significant performance and cost issues at production scale. Metrics workloads (high frequency, numeric aggregations, time-range queries) don't align with OpenSearch's document-oriented design. For small-scale deployments this may be acceptable, but it becomes prohibitively expensive at scale.

---

### Option 3: Pure Prometheus for Everything

#### Overview

Store all observability data (metrics and traces) in Prometheus TSDB, using exemplars for trace data.

#### Architecture Diagram

```
OTel SDK → OTel Collector → Prometheus
                              │
                              ├── RED Metrics
                              └── Trace Exemplars
```

#### Pros

- **Excellent metrics performance**: Prometheus built for time-series workloads
- **Unified storage**: Single TSDB for all observability data
- **Efficient compression**: Prometheus compression algorithms for time-series data

#### Cons

**Traces fundamentally don't fit the TSDB model:**

- **Traces are structured events, not time series**: Traces have 50+ fields (traceId, spanId, tags, logs) while Prometheus metrics have ~10 labels max
- **No complex topology queries**: Prometheus labels limited to ~100 per metric—insufficient for rich service metadata and relationships
- **Limited retention**: Prometheus designed for recent data (days/weeks), not long-term trace storage (months)
- **No full-text search**: Cannot search span attributes, logs, or perform complex filters
- **High cardinality issues**: Traces have many unique attribute combinations that would explode Prometheus label cardinality

**Example mismatch:**
```
Trace structure:
{
  traceId, spanId, parentSpanId, serviceName, operationName,
  duration, tags: { userId, sessionId, orderId, ... },
  logs: [ { timestamp, message, fields } ],
  ...50+ fields
}

Prometheus metric:
service_request_count{service="frontend", operation="GET /api"} 1234

Traces = detailed structured events
Metrics = aggregated numeric values
```

#### Why Not Recommended

Traces require rich querying capabilities that Prometheus doesn't provide: filtering by arbitrary tags, searching span logs, correlating spans within a trace, and storing detailed event context. Forcing traces into a metrics model loses the detailed observability data that makes traces valuable. Additionally, trace data would cause severe cardinality issues in Prometheus.

---

## 4. Implementation Details - Option 1 (Recommended Architecture)

This section details the implementation of the recommended hybrid architecture, covering all components from data ingestion to visualization.

---

### 4.1 System Architecture

#### High-Level Overview

The OpenSearch APM solution consists of four main layers:

```mermaid
graph TB
    subgraph "Application Layer"
        A[Microservices with<br/>OTel SDK]
    end

    subgraph "Collection Layer"
        B[OTel Collector]
    end

    subgraph "Processing Layer"
        C[Data Prepper<br/>OTLP Source]
        D[Service Map<br/>Processor]
        E[Span Decoration<br/>Processor]
        F[Metrics<br/>Processor]
    end

    subgraph "Storage Layer"
        G[OpenSearch<br/>Traces & Topology]
        H[Prometheus<br/>RED Metrics]
    end

    subgraph "Visualization Layer"
        I[OpenSearch Dashboards<br/>APM Plugin]
        J[Services Page]
        K[Service Map]
        L[Service Details]
    end

    A -->|OTLP| B
    B -->|OTLP| C
    C --> D
    C --> E
    C --> F
    D -->|ServiceConnection<br/>ServiceOperationDetail| G
    E -->|Decorated Spans| G
    F -->|RED Metrics| H
    G --> I
    H --> I
    I --> J
    I --> K
    I --> L

    style A fill:#f9f,stroke:#333
    style G fill:#bbf,stroke:#333
    style H fill:#bfb,stroke:#333
    style I fill:#fbb,stroke:#333
```

#### Component Breakdown

| Layer | Component | Purpose | Technology |
|-------|-----------|---------|------------|
| **Application** | Microservices | Instrumented applications | OTel SDK (Java, Python, Go, etc.) |
| **Collection** | OTel Collector | Collect and forward telemetry | OpenTelemetry Collector |
| **Processing** | Data Prepper | Process and route telemetry | OpenSearch Data Prepper |
| | Service Map Processor | Extract topology | Data Prepper Processor |
| | Span Decoration | Enrich spans | Data Prepper Processor |
| | Metrics Processor | Generate RED metrics | Data Prepper Processor |
| **Storage** | OpenSearch | Store traces/topology | OpenSearch |
| | Prometheus | Store metrics | Prometheus TSDB |
| **Visualization** | APM UI | Visualization and analysis interface | OpenSearch Dashboards |
| | **Services** | Service monitoring and analysis | React Components |
| | - Services Home | Landing page for all services | React Page |
| | - Service Overview | Service-level metrics dashboard | React Tab |
| | - Service Operations | Operation-level performance metrics | React Tab |
| | - Service Dependencies | Downstream dependency analysis | React Tab |
| | **Application Map** | Service topology visualization | React Flow |
| | - Service Map Home | Interactive service topology map | React Component |
| | - Service Map Grouping | Group services by custom attributes | Filter Component |
| | - Service Insights | Service health indicators on map | Widget Component |
| | **APM Config/Setup** | Configuration and data source management | React Page |
| | **Correlations** | Link traces to logs for investigation | Integration Feature |

---

### 4.2 Data Prepper Components

Data Prepper acts as the central processing hub, transforming raw OpenTelemetry data into formats optimized for storage and querying.

#### Data Prepper Pipeline Architecture

```mermaid
graph LR
    subgraph "Data Prepper Pipeline"
        A[OTLP Source] --> B[Trace Processing]
        A --> C[Topology Processing]
        A --> D[Metrics Processing]

        B[Trace Processing] --> E[Span Decoration<br/>Processor]
        E --> F[OpenSearch Sink<br/>Traces Index]

        C[Topology Processing] --> G[Service Map<br/>Processor]
        G --> H[OpenSearch Sink<br/>Service Map Index]

        D[Metrics Processing] --> I[RED Metrics<br/>Extraction]
        I --> J[Prometheus Sink]
    end

    style A fill:#f96,stroke:#333
    style F fill:#bbf,stroke:#333
    style H fill:#bbf,stroke:#333
    style J fill:#bfb,stroke:#333
```

#### 4.2.1 Service Map Processor (Updated Component)

The Service Map Processor extracts service topology and relationship data from distributed traces.

**Purpose:**

- Identify service-to-service communication patterns
- Extract operation-level details (e.g., `GET /api/users`)
- Support custom grouping attributes (e.g., `businessUnit`, `team`)

**Processing Logic:**

**Window-Based Processing:**
- Uses a 60-second sliding window (configurable)
- Maintains current and previous windows for consistency
- Generates events at window boundaries

**Deduplication:**
- Uses `hashCode` field to ensure unique events
- Hash based on: `service + remoteService + operation + timestamp window`

**Event Types:**

**ServiceConnection Event:**
```json
{
  "hashCode": "6239b20a9cf210190e9e9ecec22953abaf04989224ce3870fd46de3353e1f220",
  "timestamp": 1765405560,
  "eventType": "ServiceConnection",
  "service": {
    "keyAttributes": {
      "environment": "eks:demo/default",
      "name": "frontend-service",
      "type": "Service"
    },
    "groupByAttributes": {
      "team": "platform",
      "businessUnit": "retail"
    }
  },
  "remoteService": {
    "keyAttributes": {
      "environment": "eks:demo/default",
      "name": "backend-service",
      "type": "Service"
    }
  }
}
```

**ServiceOperationDetail Event:**
```json
{
  "hashCode": "a4f2c8d9e1b3...",
  "timestamp": 1765405560,
  "eventType": "ServiceOperationDetail",
  "service": {
    "keyAttributes": {
      "environment": "eks:demo/default",
      "name": "frontend-service",
      "type": "Service"
    },
    "groupByAttributes": {
      "team": "platform"
    }
  },
  "operation": {
    "name": "GET /api/users",
    "remoteService": {
      "keyAttributes": {
        "environment": "eks:demo/default",
        "name": "user-service",
        "type": "Service"
      }
    },
    "remoteOperationName": "GET /users"
  }
}
```

**Configuration:**

```yaml
processor:
  - otel_apm_service_map:
      window_duration: 60  # seconds
      groupByAttributes:   # Optional custom attributes
        - team
        - businessUnit
        - region
```

#### 4.2.2 Span Decoration Processor (Updated Component)

The Span Decoration Processor enriches spans with derived fields to enable metrics-to-span correlation.

**Purpose:**

Enable users to jump from a metric anomaly (e.g., high latency) directly to the relevant spans in Discover Traces.

**Fields Added:**

For **server spans** only (not client spans):

| Field | Description | Example |
|-------|-------------|---------|
| `data-prepper.derived.environment` | Normalized environment | `eks:demo/default` |
| `data-prepper.derived.operation` | Operation name | `GET /api/users` |
| `span.kind` | Span kind decorator | `SERVER` |

**Use Cases:**

1. **Service Details → Operations Tab**: Click operation metric → Filter traces by `operation`
2. **Dependencies → Fault Investigation**: Click fault metric → Filter traces by `remoteService` + `operation`

#### 4.2.3 Prometheus Sink (New Component)

The Prometheus Sink exports aggregated RED metrics to Prometheus for time-series storage and querying.

**Purpose:**

- Provide high-performance metric storage
- Enable efficient PromQL queries for dashboards
- Support histogram-based latency percentiles

**Metrics Exported:**

**RED Metrics:**

| Metric Name | Type | Description | Labels |
|-------------|------|-------------|--------|
| `request` | Gauge | Total request count | `service`, `environment`, `operation`, `remoteService`, `namespace` |
| `error` | Gauge | 4xx error count | Same as above |
| `fault` | Gauge | 5xx fault count | Same as above |
| `latency_seconds_seconds_bucket` | Histogram | Latency distribution | Same + `le` (bucket) |
| `latency_seconds_seconds_sum` | Histogram | Sum of latencies | Same as above |
| `latency_seconds_seconds_count` | Histogram | Count of requests | Same as above |

**Example Metric Output:**
```
# HELP request Total request count
# TYPE request gauge
request{service="frontend",environment="production",operation="GET /api/users",namespace="span_derived"} 15420

# HELP fault Fault count (5xx errors)
# TYPE fault gauge
fault{service="frontend",environment="production",operation="GET /api/users",namespace="span_derived"} 23

# HELP latency_seconds_seconds_bucket Latency histogram
# TYPE latency_seconds_seconds_bucket histogram
latency_seconds_seconds_bucket{service="frontend",environment="production",operation="GET /api/users",le="0.005"} 1200
latency_seconds_seconds_bucket{service="frontend",environment="production",operation="GET /api/users",le="0.01"} 5400
latency_seconds_seconds_bucket{service="frontend",environment="production",operation="GET /api/users",le="0.025"} 12000
latency_seconds_seconds_bucket{service="frontend",environment="production",operation="GET /api/users",le="+Inf"} 15420
```

**Configuration:**

```yaml
sink:
  - prometheus:
      endpoint: "http://prometheus:9090/api/v1/write"
      namespace: "span_derived"
      flush_interval: 60
```

#### Data Prepper Pipeline Configuration Example

```yaml
pipelines:
  otlp-traces:
    source:
      otlp:
        traces_path: /v1/traces
        traces_output_format: otel
    sink:
      - pipeline:
          name: "trace_processing"
      - pipeline:
          name: "topology_processing"
      - pipeline:
          name: "metrics_processing"

  trace_processing:
    source:
      pipeline:
        name: "otlp-traces"
    processor:
      - otel_traces:
          # Span decoration
    sink:
      - opensearch:
          index: "otel-traces-%{yyyy.MM.dd}"

  topology_processing:
    source:
      pipeline:
        name: "otlp-traces"
    processor:
      - otel_apm_service_map:
          window_duration: 60
          groupByAttributes:
            - team
            - businessUnit
    route:
      - service_map: 'eventType == "ServiceConnection" || eventType == "ServiceOperationDetail"'
    sink:
      - opensearch:
          routes: [service_map]
          index: "otel-apm-service-map"

  metrics_processing:
    source:
      pipeline:
        name: "otlp-traces"
    processor:
      - otel_apm_metrics:
          # Extract RED metrics
    sink:
      - prometheus:
          endpoint: "http://prometheus:9090/api/v1/write"
```

---

### 4.3 OpenSearch Schema

#### Service Map Index

**Index Name:** `otel-apm-service-map`

**Index Mapping:**

```json
{
  "mappings": {
    "dynamic": "false",
    "properties": {
      "hashCode": {
        "type": "keyword"
      },
      "timestamp": {
        "type": "date",
        "format": "epoch_second"
      },
      "eventType": {
        "type": "keyword"
      },
      "service": {
        "type": "object",
        "properties": {
          "keyAttributes": {
            "type": "object",
            "properties": {
              "environment": { "type": "keyword" },
              "name": { "type": "keyword" },
              "type": { "type": "keyword" }
            }
          },
          "groupByAttributes": {
            "type": "flattened"
          }
        }
      },
      "remoteService": {
        "type": "object",
        "properties": {
          "keyAttributes": {
            "type": "object",
            "properties": {
              "environment": { "type": "keyword" },
              "name": { "type": "keyword" },
              "type": { "type": "keyword" }
            }
          }
        }
      },
      "operation": {
        "type": "object",
        "properties": {
          "name": {
            "type": "text",
            "fields": {
              "keyword": { "type": "keyword" }
            }
          },
          "remoteService": {
            "type": "object",
            "properties": {
              "keyAttributes": {
                "type": "object",
                "properties": {
                  "environment": { "type": "keyword" },
                  "name": { "type": "keyword" },
                  "type": { "type": "keyword" }
                }
              }
            }
          },
          "remoteOperationName": {
            "type": "text",
            "fields": {
              "keyword": { "type": "keyword" }
            }
          }
        }
      }
    }
  }
}
```

#### PPL Query Patterns

**List All Services:**

```sql
source=otel-apm-service-map
| where timestamp >= 1765405560 and timestamp <= 1765405860
| dedup hashCode
| where eventType = 'ServiceOperationDetail'
| fields service.keyAttributes, service.groupByAttributes
```

**Response:**
```json
{
  "schema": [...],
  "datarows": [
    ["frontend-service", "eks:demo/default", "Service", "{\"team\":\"platform\"}"],
    ["backend-service", "eks:demo/default", "Service", "{\"team\":\"backend\"}"]
  ]
}
```

**Get Service Details:**

```sql
source=otel-apm-service-map
| where timestamp >= 1765405560 and timestamp <= 1765405860
| dedup hashCode
| where eventType = 'ServiceOperationDetail'
| where service.keyAttributes.environment = 'eks:demo/default'
| where service.keyAttributes.name = 'frontend-service'
| fields service.keyAttributes, service.groupByAttributes
```

**List Service Operations:**

```sql
source=otel-apm-service-map
| where timestamp >= 1765405560 and timestamp <= 1765405860
| dedup hashCode
| where eventType = 'ServiceOperationDetail'
| where service.keyAttributes.environment = 'eks:demo/default'
| where service.keyAttributes.name = 'frontend-service'
| fields operation.name, operation.remoteService.keyAttributes, operation.remoteOperationName
```

**Get Service Map (Topology):**

```sql
source=otel-apm-service-map
| where timestamp >= 1765405560 and timestamp <= 1765405860
| dedup hashCode
| where eventType = 'ServiceConnection'
| fields service.keyAttributes, remoteService.keyAttributes, service.groupByAttributes
```

---

### 4.4 UI/Server Architecture

#### Query Strategy Architecture

The OpenSearch Dashboards APM plugin uses a dual-query strategy to fetch data from both OpenSearch (topology) and Prometheus (metrics).

```mermaid
sequenceDiagram
    participant UI as React Component
    participant Hook as Custom Hook
    participant PPL as PPLSearchService
    participant PromQL as PromQLSearchService
    participant Server as Server API
    participant OS as OpenSearch
    participant Prom as Prometheus

    UI->>Hook: Request service data

    par Fetch Topology
        Hook->>PPL: listServices(timeRange)
        PPL->>Server: POST /api/apm/ppl/query
        Server->>OS: Execute PPL query
        OS-->>Server: Topology data
        Server-->>PPL: Response
        PPL-->>Hook: Services list
    and Fetch Metrics
        Hook->>PromQL: getServiceMetrics(service)
        PromQL->>Server: POST /api/apm/promql/query
        Server->>Prom: Execute PromQL query
        Prom-->>Server: Time series data
        Server-->>PromQL: Response
        PromQL-->>Hook: Metrics data
    end

    Hook-->>UI: Combined data
    UI->>UI: Render component
```

#### 4.4.1 PPL Query Strategy

**Purpose:** Fetch service topology, operations, and dependencies from OpenSearch.

**Implementation: `PPLSearchService`**

**File:** `public/components/apm/utils/search_strategy/ppl_search_service.ts`

**Methods:**

```typescript
class PPLSearchService {
  /**
   * List all services in a time range
   */
  async listServices(params: {
    startTime: number;
    endTime: number;
    queryIndex: string;
    environment?: string;
  }): Promise<ServiceSummary[]>

  /**
   * Get details for a specific service
   */
  async getService(params: {
    startTime: number;
    endTime: number;
    queryIndex: string;
    serviceName: string;
    environment: string;
  }): Promise<ServiceDetail>

  /**
   * List operations for a service
   */
  async listServiceOperations(params: {
    startTime: number;
    endTime: number;
    queryIndex: string;
    serviceName: string;
    environment: string;
  }): Promise<Operation[]>

  /**
   * List dependencies for a service
   */
  async listServiceDependencies(params: {
    startTime: number;
    endTime: number;
    queryIndex: string;
    serviceName: string;
    environment: string;
  }): Promise<Dependency[]>

  /**
   * Get full service map topology
   */
  async getServiceMap(params: {
    startTime: number;
    endTime: number;
    queryIndex: string;
  }): Promise<ServiceMapResponse>
}
```

**Query Flow:**

1. **Build PPL Query**
   ```typescript
   const query = getQueryListServices(
     'otel-apm-service-map',
     startTime,
     endTime
   );
   ```

2. **Execute via Server API**
   ```typescript
   const response = await fetch('/api/apm/ppl/query', {
     method: 'POST',
     body: JSON.stringify({
       query,
       datasetId: 'otel-apm-service-map'
     })
   });
   ```

3. **Transform Response**
   ```typescript
   const services = response.jsonData.map(row => ({
     serviceName: row['service.keyAttributes.name'],
     environment: row['service.keyAttributes.environment'],
     groupByAttributes: JSON.parse(row['service.groupByAttributes'])
   }));
   ```

#### 4.4.2 PromQL Query Strategy

**Purpose:** Fetch time-series metrics (RED metrics) from Prometheus.

**Implementation: `PromQLSearchService`**

**File:** `public/components/apm/utils/search_strategy/promql_search_service.ts`

**Key Queries:**

```typescript
// Service request rate
const query = `sum(request{environment="${env}",service="${svc}"})`;

// Service error rate (percentage)
const query = `
  sum(error{environment="${env}",service="${svc}"})
  /
  sum(request{environment="${env}",service="${svc}"})
`;

// Service P95 latency
const query = `
  histogram_quantile(0.95,
    sum by (le) (
      latency_seconds_seconds_bucket{environment="${env}",service="${svc}"}
    )
  )
`;

// Top operations by fault rate
const query = `
  topk(5,
    sum by (operation) (fault{environment="${env}",service="${svc}"})
    /
    sum by (operation) (request{environment="${env}",service="${svc}"})
  )
`;
```

**Query Flow:**

1. **Build PromQL Query**
   ```typescript
   const query = getQueryServiceRequestRate(environment, serviceName);
   ```

2. **Execute via Server API**
   ```typescript
   const response = await fetch('/api/apm/promql/query', {
     method: 'POST',
     body: JSON.stringify({
       query,
       prometheusConnectionName: 'default',
       timeRange: { from: startTime, to: endTime },
       queryType: 'instant'
     })
   });
   ```

3. **Process Time Series**
   ```typescript
   const value = response.meta.instantData.rows[0].Value;
   ```

#### Server API Routes

**File:** `server/routes/apm/apm_router.ts`

**POST `/api/apm/ppl/query`**

Execute PPL queries server-side to avoid authentication issues.

**Request:**
```json
{
  "query": "source=otel-apm-service-map | dedup hashCode | where eventType = 'ServiceConnection'",
  "datasetId": "otel-apm-service-map",
  "opensearchDataSourceId": "optional-datasource-id"
}
```

**Response:**
```json
{
  "schema": [
    { "name": "service.keyAttributes.name", "type": "string" },
    { "name": "service.keyAttributes.environment", "type": "string" }
  ],
  "datarows": [
    ["frontend", "production"],
    ["backend", "production"]
  ],
  "jsonData": [
    { "service.keyAttributes.name": "frontend", "service.keyAttributes.environment": "production" },
    { "service.keyAttributes.name": "backend", "service.keyAttributes.environment": "production" }
  ]
}
```

**POST `/api/apm/promql/query`**

Proxy PromQL queries to Prometheus via the SQL plugin connection.

**Request:**
```json
{
  "query": "sum(request{environment=\"production\",service=\"frontend\"})",
  "prometheusConnectionName": "default",
  "timeRange": {
    "from": "2024-12-16T00:00:00Z",
    "to": "2024-12-16T01:00:00Z"
  },
  "queryType": "instant"
}
```

**Response:**
```json
{
  "meta": {
    "instantData": {
      "rows": [
        {
          "service": "frontend",
          "environment": "production",
          "Value": "15420"
        }
      ]
    }
  }
}
```

#### Security Benefits

**Why Server-Side Execution?**

1. **Credential Protection**: Prometheus credentials never exposed to browser
2. **Centralized Logging**: All queries logged on server for auditing
3. **Rate Limiting**: Server can implement query throttling
4. **Error Handling**: Consistent error responses across all queries

---

### 4.5 UI Components

#### Component Hierarchy

```
APM Plugin
├── Home (Route: /apm)
├── Services Page (Route: /apm/services)
│   ├── Service Table
│   ├── Filter Sidebar
│   └── Top Services Widget
├── Service Details (Route: /apm/services/:serviceName)
│   ├── Overview Tab
│   │   ├── RED Metrics Cards
│   │   └── Time Series Charts
│   ├── Operations Tab
│   │   └── Operations Table
│   └── Dependencies Tab
│       └── Dependencies Table
└── Service Map (Route: /apm/service-map)
    └── React Flow Visualization
```

#### 4.5.1 Services Page

**File:** `public/components/apm/pages/services/services.tsx`

**Features:**

- **Service Table**: Sortable, paginated table of all services
- **Filter Sidebar**:
  - Environment filter (platform types: EKS, ECS, EC2, Lambda, generic)
  - Custom attribute filters (groupByAttributes)
  - Search within attribute values
- **Time Range Picker**: Select observation period
- **Top Services Widget**: Right sidebar showing services with highest fault rates

**Data Sources:**

| Data | Source | Query |
|------|--------|-------|
| Service list | PPL | `listServices()` |
| Available environments | PPL | Parsed from service environments |
| Available attributes | PPL | `service.groupByAttributes` |
| Top services by fault rate | PromQL | `topk(5, sum(fault) / sum(request))` |

**Key Interactions:**

1. **Click Service Row**: Navigate to Service Details page
2. **Apply Filters**: Filter services by environment and custom attributes
3. **Change Time Range**: Refetch data for new time window

#### 4.5.2 Service Details Page

**Files:** `public/components/apm/pages/service_details/`

**Overview Tab:**

**File:** `service_overview.tsx`

**RED Metrics Cards:**

| Card | Metric | Query |
|------|--------|-------|
| Requests | Total request count | `sum(request{...})` |
| Availability | `(1 - faults/requests) * 100` | `(1 - sum(fault{...}) / sum(request{...})) * 100` |
| Faults | 5xx error count | `sum(fault{...})` |
| Errors | 4xx error count | `sum(error{...})` |
| P99 Latency | 99th percentile latency | `histogram_quantile(0.99, latency_seconds_seconds_bucket{...})` |

**Time Series Charts:**

1. **Requests Over Time**: Line chart of request volume
2. **Availability by Operations**: Multi-line chart showing top 5 operations
3. **Fault Rate Over Time**: Fault rate percentage per operation
4. **Latency Percentiles**: P50, P90, P99 latency over time

**Operations Tab:**

**File:** `service_operations.tsx`

**Operations Table Columns:**

| Column | Source | Description |
|--------|--------|-------------|
| Operation Name | PPL | From `operation.name` |
| Requests | PromQL | `sum(request{operation="..."})` |
| Availability | PromQL | `(1 - fault/request) * 100` |
| Fault Rate | PromQL | `(fault/request) * 100` |
| Error Rate | PromQL | `(error/request) * 100` |
| P50 Latency | PromQL | `histogram_quantile(0.50, ...)` |
| P90 Latency | PromQL | `histogram_quantile(0.90, ...)` |
| P99 Latency | PromQL | `histogram_quantile(0.99, ...)` |

**Expandable Rows:**
- Click row to expand inline charts
- Shows 3 charts: Requests & Availability, Faults & Errors, Latency Percentiles

**Dependencies Tab:**

**File:** `service_dependencies.tsx`

**Dependencies Table Columns:**

| Column | Source | Description |
|--------|--------|-------------|
| Dependency Service | PPL | From `operation.remoteService.keyAttributes.name` |
| Operation | PPL | From `operation.name` |
| Remote Operation | PPL | From `operation.remoteOperationName` |
| Availability | PromQL | `(1 - fault/request) * 100` |
| Fault Rate | PromQL | `(fault/request) * 100` |
| P50 Latency | PromQL | `histogram_quantile(0.50, ...)` |

**Expandable Rows:**
- Similar to Operations tab
- Shows dependency-specific metrics over time

#### 4.5.3 Service Map Page

**Technology:** React Flow (future implementation)

**Features:**

- **Node Representation**: Each service as a node
- **Edge Representation**: Dependencies as directed edges
- **Interactive Navigation**:
  - Click node → Navigate to Service Details
  - Hover node → Show tooltip with metrics
  - Zoom/Pan for large topologies
- **Filtering**:
  - Filter by environment
  - Filter by custom attributes
  - Show/hide specific services

**Data Source:**

- **PPL Query**: `getServiceMap()` fetches `ServiceConnection` events
- **Node Data**: `service.keyAttributes` + `service.groupByAttributes`
- **Edge Data**: Relationship between `service` and `remoteService`

#### 4.5.4 APM Configuration Page

**Purpose:** Configure data sources for APM plugin.

**Settings:**

| Setting | Type | Description | Default |
|---------|------|-------------|---------|
| Prometheus Connection | Dropdown | Select Prometheus connection from SQL plugin | `default` |
| Service Map Index | Text | OpenSearch index for topology data | `otel-apm-service-map` |
| Traces Index | Text | OpenSearch index for trace data | `otel-traces-*` |

**Storage:** Settings saved as OpenSearch Dashboards saved object (`apm-config`).

#### 4.5.5 Correlations (Future)

**Integration Point:** Index patterns / dataset management pages

**Purpose:** Link trace indexes to log indexes for seamless navigation.

**Example Configuration:**

```json
{
  "traceIndex": "otel-traces-*",
  "logIndex": "otel-logs-*",
  "correlationField": "traceId",
  "timeField": "@timestamp"
}
```

**Use Case:** User clicks on a span in Discover Traces → Automatically filter logs by `traceId` → Show correlated log events.

---

### 4.6 View Switching Mechanism

#### Requirement

Allow users to switch between the legacy Trace Analytics view and the new APM view.

#### Approach 1: UI Setting Flag (Recommended)

**Setting Definition:**

**Setting Name:** `observability:apmViewEnabled`
**Type:** Boolean
**Default:** `false`
**Category:** Observability

**Description:**
> Enable the new APM view for observability. When enabled, the APM view replaces the legacy trace analytics interface.

**Implementation:**

**1. Register Setting in Plugin:**

```typescript
// public/plugin.ts
core.uiSettings.register({
  'observability:apmViewEnabled': {
    name: 'APM View',
    value: false,
    description: 'Enable the new APM view for observability',
    category: ['observability'],
    schema: schema.boolean(),
  },
});
```

**2. Conditional Routing:**

```typescript
// public/components/app.tsx
const apmEnabled = uiSettings.get('observability:apmViewEnabled');

return (
  <Router>
    {apmEnabled ? (
      <>
        <Route path="/apm" component={ApmHome} />
        <Route path="/apm/services" component={Services} />
        <Route path="/apm/service-map" component={ServiceMap} />
      </>
    ) : (
      <Route path="/trace-analytics" component={TraceAnalytics} />
    )}
  </Router>
);
```

**Migration Path:**

1. **Phase 1**: Default `false`, users opt-in via Advanced Settings
2. **Phase 2**: Enable for specific deployments (beta testing)
3. **Phase 3**: Default `true`, legacy view deprecated
4. **Phase 4**: Remove legacy view entirely

#### Approach 2: Reuse Discover Traces Flag

**Setting Name:** `discover:enableTraceAnalytics`

**Pros:**
- Reuses existing setting
- Simpler implementation

**Cons:**
- Less granular control
- Tied to Discover feature
- May confuse users (Discover vs APM)

**Recommendation:** Use Approach 1 for better separation of concerns.

---

### 4.7 Data Flow

#### End-to-End Data Flow

```mermaid
graph TB
    subgraph "Application Layer"
        A1[Microservice A<br/>OTel SDK]
        A2[Microservice B<br/>OTel SDK]
        A3[Microservice C<br/>OTel SDK]
    end

    subgraph "Collection Layer"
        B[OTel Collector]
    end

    subgraph "Data Prepper Processing"
        C[OTLP Source]

        D1[Service Map<br/>Processor]
        D2[Span Decoration<br/>Processor]
        D3[Metrics<br/>Processor]

        E1[OpenSearch Sink<br/>Service Map]
        E2[OpenSearch Sink<br/>Traces]
        E3[Prometheus Sink]
    end

    subgraph "Storage Layer"
        F1[(OpenSearch<br/>otel-apm-service-map)]
        F2[(OpenSearch<br/>otel-traces)]
        F3[(Prometheus<br/>RED Metrics)]
    end

    subgraph "Query Layer"
        G1[PPL Search<br/>Service]
        G2[PromQL Search<br/>Service]
        H[Server API Routes]
    end

    subgraph "UI Layer"
        I1[Services Page]
        I2[Service Details]
        I3[Service Map]
    end

    A1 -->|OTLP Traces| B
    A2 -->|OTLP Traces| B
    A3 -->|OTLP Traces| B

    B -->|OTLP| C

    C --> D1
    C --> D2
    C --> D3

    D1 --> E1
    D2 --> E2
    D3 --> E3

    E1 --> F1
    E2 --> F2
    E3 --> F3

    F1 -.->|PPL Queries| G1
    F3 -.->|PromQL Queries| G2

    G1 --> H
    G2 --> H

    H --> I1
    H --> I2
    H --> I3

    style A1 fill:#f9f,stroke:#333
    style A2 fill:#f9f,stroke:#333
    style A3 fill:#f9f,stroke:#333
    style B fill:#fcf,stroke:#333
    style C fill:#fcc,stroke:#333
    style F1 fill:#bbf,stroke:#333
    style F2 fill:#bbf,stroke:#333
    style F3 fill:#bfb,stroke:#333
    style H fill:#fdb,stroke:#333
    style I1 fill:#fbb,stroke:#333
    style I2 fill:#fbb,stroke:#333
    style I3 fill:#fbb,stroke:#333
```

#### Query Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Services Page
    participant Hook as useServices Hook
    participant PPL as PPL Service
    participant PromQL as PromQL Service
    participant API as Server API
    participant OS as OpenSearch
    participant Prom as Prometheus

    User->>UI: Open Services Page
    UI->>Hook: Request services data

    Note over Hook,Prom: Parallel Queries

    par Fetch Service List (Topology)
        Hook->>PPL: listServices(timeRange)
        PPL->>PPL: Build PPL query
        PPL->>API: POST /api/apm/ppl/query
        API->>OS: Execute PPL query
        OS-->>API: Service topology data
        API->>API: Transform response
        API-->>PPL: Services + attributes
        PPL-->>Hook: Service list
    and Fetch Top Services by Fault Rate
        Hook->>PromQL: getTopServicesByFaultRate()
        PromQL->>PromQL: Build PromQL query
        PromQL->>API: POST /api/apm/promql/query
        API->>Prom: Execute PromQL query
        Prom-->>API: Time series metrics
        API-->>PromQL: Fault rate data
        PromQL-->>Hook: Top services
    end

    Hook->>Hook: Merge topology + metrics
    Hook-->>UI: Complete service data
    UI->>UI: Render table + widgets
    UI-->>User: Display services
```

---

### 4.8 Scalability and Performance

#### Data Prepper Optimization

**Windowed Processing:**
- 60-second sliding windows (configurable)
- Bounded memory usage: O(services × operations) per window
- Automatic window rotation prevents memory leaks

**Horizontal Scaling:**
- Stateless processors allow multiple Data Prepper instances
- Load balance via OTel Collector fan-out
- Each instance processes independent spans

**Configuration:**
```yaml
processor:
  - otel_apm_service_map:
      window_duration: 60      # Adjust based on throughput
      max_services: 10000      # Circuit breaker
      groupByAttributes:
        - team                 # Limit to essential attributes
```

#### OpenSearch Index Strategy

**Index Strategy:**
- Time-based index rollover: `otel-apm-service-map-2024.12.16`
- Retention policy: Delete indices older than 30 days
- Deduplication via `hashCode` reduces document count by 70-90%

**Query Optimization:**
- `dedup hashCode` executed first for efficient filtering
- Time range filters leverage index sorting
- `fields` clause limits data transfer

**Example:**
```
Without dedup: 1M spans → 1M topology events → 100 GB/day
With dedup:    1M spans → 100K unique events → 10 GB/day
```

#### Prometheus Configuration

**Built for Scale:**
- Handles millions of metrics per second
- Efficient compression (10:1 ratio typical)
- Fast aggregation queries via block storage

**Configuration:**
```yaml
# Prometheus config
storage:
  tsdb:
    retention.time: 15d
    retention.size: 100GB
```

#### Query Optimization

**Consolidated PromQL Queries:**

Instead of N queries for N operations:
```typescript
// BAD: N queries
for (const op of operations) {
  await fetchMetric(`fault{operation="${op.name}"}`);
}

// GOOD: 1 query
const query = `sum by (operation) (fault{service="${serviceName}"})`;
const allMetrics = await fetchMetric(query);
```

**Result:** 90% reduction in query latency for pages with many operations.

---

### 4.9 Implementation References

#### Dashboards Plugin

**Repository:** [opensearch-project/dashboards-observability](https://github.com/opensearch-project/dashboards-observability)

**Commit Range:** `d53a9829` to `7242948`

**Key Files:**

**Query Builders:**
- `public/components/apm/utils/query_requests/ppl_queries.ts`
  - PPL query construction for topology queries
  - Functions: `getQueryListServices`, `getQueryGetServiceMap`, `getQueryListServiceOperations`

- `public/components/apm/utils/query_requests/promql_queries.ts`
  - PromQL query construction for metrics
  - Functions: `getQueryServiceRequestRate`, `QUERY_TOP_SERVICES_BY_FAULT_RATE`

**Search Services:**
- `public/components/apm/utils/search_strategy/ppl_search_service.ts`
  - PPL query execution via server API
  - Response transformation and error handling

- `public/components/apm/utils/search_strategy/promql_search_service.ts`
  - PromQL query execution via server API
  - Time series data processing

**Custom Hooks:**
- `public/components/apm/utils/hooks/use_services.ts` - Fetch service list
- `public/components/apm/utils/hooks/use_service_details.ts` - Fetch service details
- `public/components/apm/utils/hooks/use_operations.ts` - Fetch service operations
- `public/components/apm/utils/hooks/use_dependencies.ts` - Fetch service dependencies
- `public/components/apm/utils/hooks/use_top_services_by_fault_rate.ts` - Top services widget

**UI Components:**
- `public/components/apm/pages/services/services.tsx` - Services page
- `public/components/apm/pages/service_details/service_overview.tsx` - Service overview tab
- `public/components/apm/pages/service_details/service_operations.tsx` - Operations tab
- `public/components/apm/pages/service_details/service_dependencies.tsx` - Dependencies tab
- `public/components/apm/shared_components/metric_card.tsx` - Reusable metric card
- `public/components/apm/shared_components/embeddable_renderer.tsx` - Chart embeddable wrapper

**Server Routes:**
- `server/routes/apm/apm_router.ts`
  - `/api/apm/ppl/query` - Execute PPL queries
  - `/api/apm/promql/query` - Execute PromQL queries

#### Data Prepper

**Repository:** [opensearch-project/data-prepper](https://github.com/opensearch-project/data-prepper)

**Branch:** `neeraj-nkm:data-prepper-apm:main` ([Compare Link](https://github.com/opensearch-project/data-prepper/compare/main...neeraj-nkm:data-prepper-apm:main))

**Key Processors:**

**Service Map Processor:**
- Extracts topology from spans
- Generates `ServiceConnection` and `ServiceOperationDetail` events
- Supports custom `groupByAttributes`

**Span Decoration:**
- Adds derived fields to spans
- Enables metrics-to-span correlation

**Metrics Extraction:**
- Generates RED metrics from spans
- Aggregates by service, environment, operation

#### Prometheus Sink

**Repository:** [opensearch-project/data-prepper](https://github.com/opensearch-project/data-prepper)

**Location:** `data-prepper-plugins/prometheus-sink`

**Release:** v2.13+ ([Prometheus Sink PR](https://github.com/opensearch-project/data-prepper/tree/main/data-prepper-plugins/prometheus-sink))

**Features:**

- Converts OTel metrics to Prometheus format
- Supports Remote Write API
- Configurable flush intervals
- Label normalization

---

### 4.10 Future Work

#### 4.10.1 Enhanced SLO Management

**Features:**
- Define SLIs (Service Level Indicators) based on RED metrics
- Configure SLO targets (e.g., "P95 latency < 100ms, 99.9% of time")
- Burn rate alerts (fast burn = incident, slow burn = warning)
- SLO dashboards with error budget visualization

**Architecture:**
```
 PromQL → SLO Evaluator → Alert Manager → Notifications
             ↓
        SLO Dashboard
```

#### 4.10.2 Anomaly Detection

**Approach:**
- ML-based anomaly detection on metrics (using OpenSearch ML)
- Automatic baseline learning (e.g., "normal latency = 50ms ± 10ms")
- Alerting on deviations (e.g., "latency spiked to 200ms")

**Integration:**
```
Prometheus → ML Model → Anomaly Scores → Alerts
                ↓
           Anomaly Dashboard
```

#### 4.10.3 Distributed Tracing Enhancements

**Features:**
- Enhanced span correlation across services
- Trace comparison (compare slow trace vs. fast trace)
- Trace search by business attributes (e.g., `userId`, `orderId`)

#### 4.10.4 Custom Dashboards

**Goal:** Allow users to create custom dashboards combining APM metrics with other data sources.

**Implementation:**
- Integrate with Dashboards' visualization builder
- Provide APM-specific visualizations (service map widget, RED metrics widget)
- Support for saved searches and filters

#### 4.10.5 Multi-Tenancy

**Requirements:**
- Namespace isolation (team A can't see team B's services)
- RBAC integration (role-based access control)
- Tenant-aware filtering in PPL/PromQL queries

**Architecture:**
```
User → Auth Plugin → Tenant Context → Query Rewrite → Storage
```

---

## 5. Glossary

| Term | Definition |
|------|------------|
| **APM** | Application Performance Monitoring - observability solution for distributed systems |
| **RED Metrics** | Rate, Errors, Duration - the three key metrics for service health |
| **PPL** | Piped Processing Language - OpenSearch's SQL-like query language |
| **PromQL** | Prometheus Query Language - DSL for querying time-series data |
| **OTel** | OpenTelemetry - vendor-neutral instrumentation standard |
| **SLO** | Service Level Objective - target level of service reliability |
| **SLI** | Service Level Indicator - metric that measures service level |
| **TSDB** | Time Series Database - optimized storage for time-series data |
| **Span** | A single unit of work in a distributed trace |
| **Trace** | End-to-end view of a request as it flows through services |
| **Service Map** | Visual representation of service dependencies |
| **Topology** | The structure and relationships of services in a system |
| **Fault** | 5xx server error |
| **Error** | 4xx client error |
| **Data Prepper** | OpenSearch's data ingestion and processing pipeline |
| **groupByAttributes** | Custom attributes for organizing services (e.g., team, businessUnit) |

---

## Conclusion

OpenSearch APM provides a comprehensive, open-source solution for application performance monitoring. By leveraging the strengths of OpenSearch (topology), Prometheus (metrics), and Data Prepper (processing), it delivers production-grade observability at scale.

**Key Achievements:**

✅ **Standards-Based**: Built on OpenTelemetry
✅ **Performant**: Optimized storage and query strategies
✅ **Scalable**: Handles millions of spans and metrics
✅ **Extensible**: Modular architecture for customization
✅ **Integrated**: Seamless OpenSearch/Dashboards experience

**Next Steps:**

1. Complete SLO management implementation
2. Add anomaly detection capabilities
3. Enhance service map with React Flow
4. Expand multi-tenancy support
5. Community feedback and iteration

---

**For questions or contributions, please visit:**
- [Dashboards Observability Repository](https://github.com/opensearch-project/dashboards-observability)
- [Data Prepper Repository](https://github.com/opensearch-project/data-prepper)
- [OpenSearch Forum](https://forum.opensearch.org/)
