/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { coreRefs } from '../../../../framework/core_refs';

export const SamplePPLComponent = () => {
  const { data } = coreRefs;

  useEffect(() => {
    if (!data) {
      console.error('Data service is not available');
      return;
    }
    // Example PPL query to fetch data from a sample index
    const fetchData = async () => {
      try {
        // const newIndexPattern = await data.indexPatterns.get(
        //   'b93745c0-34ce-11f0-8fac-e5769fde6617'
        // );
        // console.log('Fetched index pattern:', newIndexPattern);
        // // const query = data.query.getOpenSearchQuery(newIndexPattern);
        // const request = {
        //   params: {
        //     index: newIndexPattern.title,
        //     body: {
        //       query: {
        //         language: 'PPL',
        //         query: 'source = shruti_spans_may16',
        //         dataset: {
        //           id: newIndexPattern.id!,
        //           title: newIndexPattern.title,
        //           type: 'INDEX_PATTERN',
        //           timeFieldName: newIndexPattern.timeFieldName,
        //           isRemoteDataset: false,
        //           dataSource: {
        //             id: newIndexPattern.dataSourceRef?.id,
        //             type: 'OpenSearch',
        //             title: newIndexPattern.title,
        //           },
        //           format: 'jdbc',
        //         },
        //       },
        //     },
        //     dataSourceId: newIndexPattern.dataSourceRef?.id,
        //   },
        // };
        // data.query.queryString.setQuery(request.params.body.query);

        const request = {
          params: {
            index: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b::otel-v1-apm-span-000003',
            body: {
              query: {
                query: 'source = otel-v1-apm-span-000003 | head 10',
                language: 'PPL',
                format: 'jdbc',
                dataset: {
                  dataSource: {
                    id: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b',
                    title: 'os-217',
                    type: 'DATA_SOURCE',
                  },
                  id: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b::otel-v1-apm-span-000003',
                  title: 'otel-v1-apm-span-000003',
                  type: 'INDEXES',
                  isRemoteDataset: false,
                },
              },
            },
          },
        };
        data.query.queryString.setQuery(request.params.body.query);
        const response = await data.search.search(request, {}).toPromise();

        //     {
        //       "query": {
        //         "query": "source = opensearch_dashboards_sample_data_ecommerce | where `order_date` >= '2025-05-29 22:06:58' and `order_date` <= '2025-05-29 22:21:58'",
        //         "language":"PPL",
        //         "dataset":{
        //           "id":"za3T0Y_1dd5f450-36ef-11f0-a5f4-27af95589be3_ff959d40-b880-11e8-a6d9-e546fe2bba5f",
        //           "title":"opensearch_dashboards_sample_data_ecommerce",
        //           "type":"INDEX_PATTERN","timeFieldName":"order_date",
        //           "isRemoteDataset":false,
        //           "dataSource":{
        //             "id":"1dd5f450-36ef-11f0-a5f4-27af95589be3",
        //             "title":"xinyuan-latest-model-test",
        //             "type":"OpenSearch"}
        //           },
        //           "format":"jdbc"
        //          }
        //         }
        // }

        // const languageConfig = data.query.queryString.getLanguageService().getLanguage('ppl');

        // const newIndexPattern = await data.indexPatterns.create(
        //   {
        //     id: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b::otel-v1-apm-span-000003',
        //     title: 'otel-v1-apm-span-000003',
        //     timeFieldName: '@timestamp'
        //   },
        //   true
        // );
        // const newSearchSource = await data.search.searchSource.create({ index: newIndexPattern });
        // newSearchSource.setField('size', 10);
        // newSearchSource.setField('query', {
        //   language: 'ppl',
        //   query: 'source = otel-v1-apm-span-000003',
        //   dataset: {
        //     dataSource: {
        //       id: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b',
        //       title: 'os-217',
        //       type: 'DATA_SOURCE',
        //     },
        //     id: 'cd240790-3c0c-11f0-88d8-6deaec46bf4b::otel-v1-apm-span-000003',
        //     title: 'otel-v1-apm-span-000003',
        //     type: 'INDEXES',
        //   },
        // });
        // newSearchSource.setField('index', newIndexPattern);
        // console.log('Search source initialized:', newSearchSource);
        // const searchResults = await newSearchSource.fetch();
        console.log('PPL Response:', response);
      } catch (error) {
        console.error('PPL Error:', error);
      }
    };
    fetchData();
  }, [data]);

  return <div>SamplePPLComponent</div>;
};
