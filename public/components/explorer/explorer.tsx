/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback, ReactElement } from 'react';
import { batch, useDispatch, useSelector } from 'react-redux';
import { isEmpty, cloneDeep, isEqual, has, reduce } from 'lodash';
import { FormattedMessage } from '@osd/i18n/react';
import {
  EuiText,
  EuiButtonIcon,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiContextMenuItem,
  EuiButton,
  EuiPageContentHeaderSection,
  EuiPopover,
  EuiContextMenuPanel,
  EuiButtonToggle,
} from '@elastic/eui';
import dateMath from '@elastic/datemath';
import classNames from 'classnames';
import { Search } from '../common/search/search';
import { CountDistribution } from './visualizations/count_distribution';
import { DataGrid } from './data_grid';
import { Sidebar } from './sidebar';
import { NoResults } from './no_results';
import { HitsCounter } from './hits_counter/hits_counter';
import { TimechartHeader } from './timechart_header';
import { ExplorerVisualizations } from './visualizations';
import { IField, IQueryTab } from '../../../common/types/explorer';
import {
  TAB_CHART_TITLE,
  TAB_EVENT_TITLE,
  RAW_QUERY,
  SELECTED_DATE_RANGE,
  SELECTED_FIELDS,
  SELECTED_TIMESTAMP,
  AVAILABLE_FIELDS,
  TIME_INTERVAL_OPTIONS,
  HAS_SAVED_TIMESTAMP,
  SAVED_QUERY,
  SAVED_VISUALIZATION,
  SAVED_OBJECT_ID,
  SAVED_OBJECT_TYPE,
  NEW_TAB,
  TAB_CREATED_TYPE,
  EVENT_ANALYTICS_DOCUMENTATION_URL,
} from '../../../common/constants/explorer';
import { PPL_STATS_REGEX, PPL_NEWLINE_REGEX } from '../../../common/constants/shared';
import { getIndexPatternFromRawQuery, insertDateRangeToQuery } from '../../../common/utils';
import { useFetchEvents, useFetchVisualizations } from './hooks';
import { changeQuery, changeDateRange, selectQueries } from './slices/query_slice';
import { selectQueryResult } from './slices/query_result_slice';
import { selectFields, updateFields, sortFields } from './slices/field_slice';
import { updateTabName } from './slices/query_tab_slice';
import { selectCountDistribution } from './slices/count_distribution_slice';
import { selectExplorerVisualization } from './slices/visualization_slice';
import { IExplorerProps } from '../../../common/types/explorer';
import { threadId } from 'worker_threads';

const TAB_EVENT_ID = 'main-content-events';
const TAB_CHART_ID = 'main-content-vis';
const TYPE_TAB_MAPPING = {
  [SAVED_QUERY]: TAB_EVENT_ID,
  [SAVED_VISUALIZATION]: TAB_CHART_ID
};

export const Explorer = ({
  pplService,
  dslService,
  tabId,
  savedObjects,
  timestampUtils,
  setToast,
  history,
  notifications,
  savedObjectId,
  curSelectedTabId
}: IExplorerProps) => {
  const dispatch = useDispatch();
  const requestParams = { tabId, };
  const {
    isEventsLoading,
    getLiveTail,
    getEvents,
    getAvailableFields
  } = useFetchEvents({
    pplService,
    requestParams,
  });
  const {
    isVisLoading,
    getVisualizations,
    getCountVisualizations
  } = useFetchVisualizations({
    pplService,
    requestParams,
  });

  const query = useSelector(selectQueries)[tabId];
  const explorerData = useSelector(selectQueryResult)[tabId];
  const explorerFields = useSelector(selectFields)[tabId];
  const countDistribution = useSelector(selectCountDistribution)[tabId];
  const explorerVisualizations = useSelector(selectExplorerVisualization)[tabId];
  
  const [selectedContentTabId, setSelectedContentTab] = useState(TAB_EVENT_ID);
  const [selectedCustomPanelOptions, setSelectedCustomPanelOptions] = useState([]);
  const [selectedPanelName, setSelectedPanelName] = useState('');
  const [curVisId, setCurVisId] = useState('bar');
  const [prevIndex, setPrevIndex] = useState('');
  const [isPanelTextFieldInvalid, setIsPanelTextFieldInvalid ] = useState(false);
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [timeIntervalOptions, setTimeIntervalOptions] = useState(TIME_INTERVAL_OPTIONS);
  const [isOverridingTimestamp, setIsOverridingTimestamp] = useState(false);
  const [tempQuery, setTempQuery] = useState(query[RAW_QUERY]);
  const [isLiveTailPopoverOpen, setIsLiveTailPopoverOpen] = useState(false);
  const [isLiveTailOn, setIsLiveTailOn] = useState(false);
  const [liveTailTabId, setLiveTailTabId] = useState(TAB_EVENT_ID);
  const [liveTailName, setLiveTailName] = useState('');
  const [liveTailToggle, setLiveTailToggle] = useState(false);

  
  const queryRef = useRef();
  const selectedPanelNameRef = useRef('');
  const explorerFieldsRef = useRef();
  const isLiveTailOnRef = useRef(true);
  const liveTailTabIdRef = useRef('');
  const liveTailNameRef = useRef('');
  queryRef.current = query;
  selectedPanelNameRef.current = selectedPanelName;
  explorerFieldsRef.current = explorerFields;
  isLiveTailOnRef.current = isLiveTailOn;
  liveTailTabIdRef.current = liveTailTabId;
  liveTailNameRef.current = liveTailName;

  let minInterval = 'y';
  const findAutoInterval = (startTime: string, endTime: string) => {
    if (startTime?.length === 0 || endTime?.length === 0 || startTime === endTime) return 'd';
    const momentStart = dateMath.parse(startTime)!;
    const momentEnd = dateMath.parse(endTime)!;
    const diffSeconds = momentEnd.unix() - momentStart.unix();
    // console.log("moment Start: ",momentStart);
    // console.log("moment end: ",momentEnd);
    // console.log("diff seconds: ",diffSeconds);

    // less than 1 second
    if (diffSeconds <= 1) minInterval = 'ms';
    // less than 2 minutes
    else if (diffSeconds <= 60 * 2) minInterval = 's';
    // less than 2 hours
    else if (diffSeconds <= 3600 * 2) minInterval = 'm';
    // less than 2 days
    else if (diffSeconds <= 86400 * 2) minInterval = 'h';
    // less than 1 month
    else if (diffSeconds <= 86400 * 31) minInterval = 'd';
    // less than 3 months
    else if (diffSeconds <= 86400 * 93) minInterval = 'w';
    // less than 1 year
    else if (diffSeconds <= 86400 * 366) minInterval = 'M';

    setTimeIntervalOptions([
      { text: 'Auto', value: 'auto_' + minInterval },
      ...TIME_INTERVAL_OPTIONS,
    ]);
  };

  console.log("explorer data variable contents: ", explorerData);

  const composeFinalQuery = (curQuery: any, startTime: string, endTime: string, timeField: string) => {
    if (isEmpty(curQuery![RAW_QUERY])) return '';
    return insertDateRangeToQuery({
      rawQuery: curQuery![RAW_QUERY],
      startTime: startTime,
      endTime: endTime,
      timeField,
    });
  };

  const formatError = (name: string, message: string, details: string) => {
    return { 
      name: name, 
      message: message, 
      body: { 
        attributes: { 
          error: { 
            caused_by: { 
              type: '', 
              reason: details
            }
          }
        }
      }
    }
  }

  const getSavedDataById = async (objectId: string) => {
    // load saved query/visualization if object id exists
    await savedObjects.fetchSavedObjects({
      objectId,
    })
    .then((res) => {
      const savedData = res['observabilityObjectList'][0];
      const isSavedQuery = has(savedData, SAVED_QUERY);
      const savedType = isSavedQuery ? SAVED_QUERY : SAVED_VISUALIZATION;
      const objectData = isSavedQuery ? savedData.savedQuery : savedData.savedVisualization;
      batch(async () => {
        await dispatch(changeQuery({
          tabId,
          query: {
            [RAW_QUERY]: objectData?.query || '',
            [SELECTED_TIMESTAMP]: objectData?.selected_timestamp?.name || 'timestamp',
            [SAVED_OBJECT_ID]: objectId,
            [SAVED_OBJECT_TYPE]: savedType,
            [SELECTED_DATE_RANGE]: objectData?.selected_date_range?.start &&
            objectData?.selected_date_range?.end ? 
            [objectData.selected_date_range.start, objectData.selected_date_range.end] : 
            ['now-15m', 'now'],
          }
        }));
        await dispatch(updateFields({
          tabId,
          data: {
            [SELECTED_FIELDS]: [...objectData?.selected_fields?.tokens]
          }
        }));
        await dispatch(updateTabName({
          tabId,
          tabName: objectData['name']
        }));
      });

      // populate name field in save panel for default name
      setSelectedPanelName(objectData?.name || '');
      setCurVisId(objectData?.type || 'bar');
      setTempQuery((staleTempQuery: string) => {
        return objectData?.query || staleTempQuery
      })
      const tabToBeFocused = isSavedQuery ? TYPE_TAB_MAPPING[SAVED_QUERY] : TYPE_TAB_MAPPING[SAVED_VISUALIZATION]
      setSelectedContentTab(tabToBeFocused);

      fetchData();

    })
    .catch((error) => {
      notifications.toasts.addError(error, {
        title: `Cannot get saved data for object id: ${objectId}`
      });
    });
  };

  const handleLiveTailSearch = useCallback(async (startTime: string, endTime: string) => {
    await updateQueryInStore(tempQuery);
    fetchLiveData(startTime, endTime);
  }, [tempQuery]);

  const determineTimeStamp = async (curQuery: any, curIndex: string) => {
    let curTimestamp = '';
    let hasSavedTimestamp = false;

    // determines timestamp for search
    if (isEmpty(curQuery![SELECTED_TIMESTAMP]) || !isEqual(curIndex, prevIndex)) {
      const savedTimestamps = await savedObjects.fetchSavedObjects({
        objectId: curIndex
      }).catch((error: any) => {
        if (error?.body?.statusCode === 403) {
          showPermissionErrorToast();
        }
        console.log(`Unable to get saved timestamp for this index: ${error.message}`);
      });
      if (
          savedTimestamps?.observabilityObjectList && 
          savedTimestamps?.observabilityObjectList[0]?.timestamp?.name
        ) {
        // from saved objects
        hasSavedTimestamp = true;
        curTimestamp = savedTimestamps.observabilityObjectList[0].timestamp.name;
      } else {
        // from index mappings
        hasSavedTimestamp = false;
        const timestamps = await timestampUtils.getTimestamp(curIndex);
        curTimestamp = timestamps!.default_timestamp;
      }
    }
    return {
      curTimestamp: curTimestamp, 
      hasSavedTimestamp: hasSavedTimestamp
    };
  }

  const fetchData = async () => {
    const curQuery = queryRef.current;
    const rawQueryStr = curQuery![RAW_QUERY];
    const curIndex = getIndexPatternFromRawQuery(rawQueryStr);
    if (isEmpty(rawQueryStr)) return;
    if (isEmpty(curIndex)) {
      setToast('Query does not include vaild index.', 'danger');
      return;
    }

    let { curTimestamp, hasSavedTimestamp } = await determineTimeStamp(curQuery, curIndex);

    if (isEmpty(curTimestamp)) {
      setToast('Index does not contain a valid time field.', 'danger');
      return;
    }

    // compose final query
    const finalQuery = composeFinalQuery(curQuery, curQuery![SELECTED_DATE_RANGE][0], curQuery![SELECTED_DATE_RANGE][1], curTimestamp || curQuery![SELECTED_TIMESTAMP]);
    
    await dispatch(changeQuery({
      tabId,
      query: {
        finalQuery,
        [SELECTED_TIMESTAMP]: curTimestamp || curQuery![SELECTED_TIMESTAMP],
        [HAS_SAVED_TIMESTAMP]: hasSavedTimestamp
      }
    }));

    // search
    if (rawQueryStr.match(PPL_STATS_REGEX)) {
      getVisualizations();
      getAvailableFields(`search source=${curIndex}`);
    } else {
      findAutoInterval(curQuery![SELECTED_DATE_RANGE][0], curQuery![SELECTED_DATE_RANGE][1])
      getEvents(undefined, (error) => {
        const formattedError = formatError(error.name, error.message, error.body.message);
        notifications.toasts.addError(formattedError, {
          title: 'Error fetching events'
        });
      });
      getCountVisualizations(minInterval);
    }

    // for comparing usage if for the same tab, user changed index from one to another
    setPrevIndex(curTimestamp || curQuery![SELECTED_TIMESTAMP]);
    if (!queryRef.current!.isLoaded) {
      dispatch(changeQuery({
        tabId,
        query: {
          isLoaded: true
        }
      }));
    }
  };

  const fetchLiveData = async (startTime: string, endTime: string) => {
    const curQuery = queryRef.current;
    const rawQueryStr = curQuery![RAW_QUERY];
    const curIndex = getIndexPatternFromRawQuery(rawQueryStr);
    if (isEmpty(rawQueryStr)) { 
      return;
    }

    if (isEmpty(curIndex)) {
      setToast('Query does not include vaild index.', 'danger');
      return;
    }
    
    let { curTimestamp, hasSavedTimestamp } = await determineTimeStamp(curQuery, curIndex);


    if (isEmpty(curTimestamp)) {
      setToast('Index does not contain a valid time field.', 'danger');
      return;
    }

    // compose final query
    const finalQuery = composeFinalQuery(curQuery, startTime, endTime, curTimestamp || curQuery![SELECTED_TIMESTAMP]);

    console.log("final Query in explorer: ",finalQuery);
    
    await dispatch(changeQuery({
      tabId,
      query: {
        finalQuery,
        [SELECTED_TIMESTAMP]: curTimestamp || curQuery![SELECTED_TIMESTAMP],
        [HAS_SAVED_TIMESTAMP]: hasSavedTimestamp,
      }
    }));

      findAutoInterval(startTime, endTime)
      getLiveTail(undefined, (error) => {
        const formattedError = formatError(error.name, error.message, error.body.message);
        notifications.toasts.addError(formattedError, {
          title: 'Error fetching events'
        });
      });
      getCountVisualizations(minInterval);
  }

  const updateTabData = async (objectId: string) => {
    await getSavedDataById(objectId);
    await fetchData();
  };

  useEffect(
    () => {
      if (queryRef.current!.isLoaded) return;
      let objectId;
      if (queryRef.current![TAB_CREATED_TYPE] === NEW_TAB) {
        objectId = queryRef.current!.savedObjectId || '';
      } else {
        objectId = queryRef.current!.savedObjectId || savedObjectId;
      }
      if (objectId) {
        updateTabData(objectId);
      } else {
        fetchData();
      }
    },
    []
  );

  const handleAddField = (field: IField) => toggleFields(field, AVAILABLE_FIELDS, SELECTED_FIELDS);

  const handleRemoveField = (field: IField) => toggleFields(field, SELECTED_FIELDS, AVAILABLE_FIELDS);

  const handleTimePickerChange = async (timeRange: Array<string>) => {
    await dispatch(changeDateRange({
      tabId: requestParams.tabId,
      data: {
        [RAW_QUERY]: queryRef.current![RAW_QUERY],
        [SELECTED_DATE_RANGE]: timeRange
      }
    }));
  }

  const showPermissionErrorToast = () => {
    setToast(
      'Please ask your administrator to enable Event Analytics for you.',
      'danger',
      <EuiLink href={EVENT_ANALYTICS_DOCUMENTATION_URL} target="_blank">
        Documentation
      </EuiLink>
    );
  };

  const handleTimeRangePickerRefresh = () => {
    handleQuerySearch();
  };

  /**
   * Toggle fields between selected and unselected sets
   * @param field field to be toggled
   * @param FieldSetToRemove set where this field to be removed from
   * @param FieldSetToAdd set where this field to be added
  */
  const toggleFields = (
    field: IField,
    FieldSetToRemove: string,
    FieldSetToAdd: string
  ) => {

    const nextFields = cloneDeep(explorerFields);
    const thisFieldSet = nextFields[FieldSetToRemove];
    const nextFieldSet = thisFieldSet.filter((fd: IField) => fd.name !== field.name);
    nextFields[FieldSetToRemove] = nextFieldSet;
    nextFields[FieldSetToAdd].push(field);
    batch(() => {
      dispatch(updateFields({ 
        tabId,
        data: {
          ...nextFields
        }
      }));
      dispatch(sortFields({
        tabId,
        data: [FieldSetToAdd]
      }));
    });
  };

  const sidebarClassName = classNames({
    closed: isSidebarClosed,
  });

  const mainSectionClassName = classNames({
    'col-md-10': !isSidebarClosed,
    'col-md-12': isSidebarClosed,
  });

  const handleOverrideTimestamp = async (timestamp: IField) => {
    const curQuery = queryRef.current;
    const rawQueryStr = curQuery![RAW_QUERY];
    const curIndex = getIndexPatternFromRawQuery(rawQueryStr);
    const requests = {
      index: curIndex,
      name: timestamp.name,
      type: timestamp.type,
      dsl_type: 'date'
    };
    if (isEmpty(rawQueryStr) || isEmpty(curIndex)) { 
      setToast('Cannot override timestamp because there was no valid index found.', 'danger');
      return;
    }

    setIsOverridingTimestamp(true);
    
    let saveTimestampRes;
    if (curQuery![HAS_SAVED_TIMESTAMP]) {
      saveTimestampRes = await savedObjects.updateTimestamp({
        ...requests
      })
      .then((res: any) => {
        setToast(`Timestamp has been overridden successfully.`, 'success');
        return res;
      })
      .catch((error: any) => {
        notifications.toasts.addError(error, {
          title: 'Cannot override timestamp'
        });
      })
      .finally(() => {
        setIsOverridingTimestamp(false);
      });
    } else {
      saveTimestampRes = await savedObjects.createSavedTimestamp({
        ...requests
      })
      .then((res: any) => {
        setToast(`Timestamp has been overridden successfully.`, 'success');
        return res;
      })
      .catch((error: any) => { 
        notifications.toasts.addError(error, {
          title: 'Cannot override timestamp'
        });
      })
      .finally(() => {
        setIsOverridingTimestamp(false);
      });
    }

    if (!has(saveTimestampRes, 'objectId')) return;

    await dispatch(changeQuery({
      tabId,
      query: {
        [SELECTED_TIMESTAMP]: ''
      }
    }));

    handleQuerySearch();
  };

  const getMainContent = () => {

    return (
      <main className="container-fluid">
        <div className="row">
          <div
              className={`col-md-2 dscSidebar__container dscCollapsibleSidebar ${sidebarClassName}`}
              id="discover-sidebar"
              data-test-subj="eventExplorer__sidebar"
            >
              {!isSidebarClosed && (
                <div className="dscFieldChooser">
                  <Sidebar
                    explorerFields={ explorerFields }
                    explorerData={ explorerData }
                    selectedTimestamp={ query[SELECTED_TIMESTAMP] }
                    handleOverrideTimestamp={ handleOverrideTimestamp }
                    handleAddField={ (field: IField) => handleAddField(field) }
                    handleRemoveField={ (field: IField) => handleRemoveField(field) }
                    isFieldToggleButtonDisabled={isEmpty(explorerData.jsonData) || !isEmpty(queryRef.current![RAW_QUERY].match(PPL_STATS_REGEX))}
                  />
                </div>
              )}
              <EuiButtonIcon
                iconType={ isSidebarClosed ? 'menuRight' : 'menuLeft' }
                iconSize="m"
                size="s"
                onClick={ () => {
                  setIsSidebarClosed(staleState => {
                    return !staleState;
                  });
                } }
                data-test-subj="collapseSideBarButton"
                aria-controls="discover-sidebar"
                aria-expanded={ isSidebarClosed ? 'false' : 'true' }
                aria-label="Toggle sidebar"
                className="dscCollapsibleSidebar__collapseButton"
              />
          </div>
          <div className={`dscWrapper ${mainSectionClassName}`}>
          { (explorerData && !isEmpty(explorerData.jsonData)) ? (
            <div className="dscWrapper__content">
              <div className="dscResults">
                { 
                  countDistribution?.data && (
                    <>
                      <EuiFlexGroup
                        justifyContent="center"
                        alignItems="center"
                      >
                        <EuiFlexItem
                          grow={false}
                        >
                          <HitsCounter 
                            hits={ reduce(countDistribution['data']['count()'], (sum, n) => {
                              return sum + n;
                            }, 0)}
                            showResetButton={false}
                            onResetQuery={ () => {} }
                          />
                        </EuiFlexItem>
                        <EuiFlexItem
                          grow={false}
                        >
                          <TimechartHeader
                            dateFormat={ "MMM D, YYYY @ HH:mm:ss.SSS" }
                            options={ timeIntervalOptions }
                            onChangeInterval={(intrv) => {
                              getCountVisualizations(intrv);
                            }}
                            stateInterval="auto"
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <CountDistribution
                        countDistribution={ countDistribution }
                      />
                    </>
                  )
                }
                
                <section
                  className="dscTable dscTableFixedScroll"
                  aria-labelledby="documentsAriaLabel"
                >
                  <h2 className="euiScreenReaderOnly" id="documentsAriaLabel">
                    <FormattedMessage
                      id="discover.documentsAriaLabel"
                      defaultMessage="Documents"
                    />
                  </h2>
                  <div className="dscDiscover">
                    <DataGrid
                      rows={ explorerData['jsonData'] }
                      rowsAll={ explorerData['jsonDataAll'] }
                      explorerFields={ explorerFields }
                    />
                    <a tabIndex={0} id="discoverBottomMarker">
                      &#8203;
                    </a>
                  </div>
                </section>
              </div>
            </div>
          ) : <NoResults />}
          </div>
        </div>
      </main>
    );
  };

  function getMainContentTab ({
    tabId,
    tabTitle,
    getContent
  }: {
    tabId: string,
    tabTitle: string,
    getContent: () => JSX.Element
  }) {
    return {
      id: tabId,
      name: (<>
              <EuiText
                size="s"
                textAlign="left"
                color="default"
              >
                <span className="tab-title">{ tabTitle }</span>
              </EuiText>
            </>),
      content: (
        <>
          { getContent() }
        </>)
    };
  };

  const getExplorerVis = () => {
    return (
      <ExplorerVisualizations
        curVisId={ curVisId }
        setCurVisId={ setCurVisId }
        explorerFields={ explorerFields }
        explorerVis={ explorerVisualizations }
        explorerData={ explorerData }
        handleAddField={ handleAddField }
        handleRemoveField={ handleRemoveField }
      />
    );
  };

  const getMainContentTabs = () => {
    return [
        getMainContentTab(
          {
            tabId: TAB_EVENT_ID,
            tabTitle: TAB_EVENT_TITLE,
            getContent: () => getMainContent()
          }
        ),
        getMainContentTab(
          {
            tabId: TAB_CHART_ID,
            tabTitle: TAB_CHART_TITLE,
            getContent: () => getExplorerVis()
          }
        )
    ];
  };

  const memorizedMainContentTabs = useMemo(() => {
    return getMainContentTabs();
  },
    [
      curVisId,
      isPanelTextFieldInvalid,
      explorerData,
      explorerFields,
      isSidebarClosed,
      countDistribution,
      explorerVisualizations,
      selectedContentTabId,
      isOverridingTimestamp
    ]
  );

  const handleContentTabClick = (selectedTab: IQueryTab) => setSelectedContentTab(selectedTab.id);
  
  const updateQueryInStore = async (query: string) => {
    await dispatch(changeQuery({
      tabId,
      query: {
        [RAW_QUERY]: query.replaceAll(PPL_NEWLINE_REGEX, ''),
      },
    }));
  };

  const handleQuerySearch = useCallback(async () => {
    await updateQueryInStore(tempQuery);
    fetchData();
  }, [tempQuery]);

  const handleQueryChange = async (query: string) => {
    setTempQuery(query);
  }

  const handleSavingObject = async () => {
    const currQuery = queryRef.current;
    const currFields = explorerFieldsRef.current;
    if (isEmpty(currQuery![RAW_QUERY])) { 
      setToast('No query to save.', 'danger');
      return; 
    };
    if (isEmpty(selectedPanelNameRef.current)) {
      setIsPanelTextFieldInvalid(true);
      setToast('Name field cannot be empty.', 'danger');
      return;
    }
    setIsPanelTextFieldInvalid(false);
    const params = {
      query: currQuery![RAW_QUERY],
      fields: currFields![SELECTED_FIELDS],
      dateRange: currQuery![SELECTED_DATE_RANGE],
      name: selectedPanelNameRef.current,
      timestamp: currQuery![SELECTED_TIMESTAMP]
    };
    if (isEqual(selectedContentTabId, TAB_EVENT_ID)) {
      const isTabMatchingSavedType = isEqual(currQuery![SAVED_OBJECT_TYPE], SAVED_QUERY);
      if (!isEmpty(currQuery![SAVED_OBJECT_ID]) && isTabMatchingSavedType) {
        params['objectId'] = currQuery![SAVED_OBJECT_ID];
        await savedObjects.updateSavedQueryById(params)
        .then((res: any) => {
          setToast(`Query '${selectedPanelNameRef.current}' has been successfully updated.`, 'success');
          dispatch(updateTabName({
            tabId,
            tabName: selectedPanelNameRef.current
          }));
          return res;
        })
        .catch((error: any) => {
          notifications.toasts.addError(error, {
            title: `Cannot update query '${selectedPanelNameRef.current}'`
          });
        });
      } else {
        // create new saved query
        savedObjects.createSavedQuery(params)
        .then((res: any) => {
          history.replace(`/event_analytics/explorer/${res['objectId']}`);
          setToast(`New query '${selectedPanelNameRef.current}' has been successfully saved.`, 'success');
          batch(() => {
            dispatch(changeQuery({
              tabId,
              query: {
                [SAVED_OBJECT_ID]: res['objectId'],
                [SAVED_OBJECT_TYPE]: SAVED_QUERY
              }
            }));
            dispatch(updateTabName({
              tabId,
              tabName: selectedPanelNameRef.current
            }));
          });
          history.replace(`/event_analytics/explorer/${res['objectId']}`);
          return res;
        })
        .catch((error: any) => { 
          if (error?.body?.statusCode === 403) {
            showPermissionErrorToast();
          } else {
            notifications.toasts.addError(error ,{
              title: `Cannot save query '${selectedPanelNameRef.current}'`
            });
          }
        });
      }
      // to-dos - update selected custom panel
      if (!isEmpty(selectedCustomPanelOptions)) {
        // update custom panel - query
      }
    } else if (isEqual(selectedContentTabId, TAB_CHART_ID)) {
      if (isEmpty(currQuery![RAW_QUERY]) || isEmpty(explorerVisualizations)) {
        setToast(`There is no query or(and) visualization to save`, 'danger');
        return;
      }
      let savingVisRes;
      const isTabMatchingSavedType = isEqual(currQuery![SAVED_OBJECT_TYPE], SAVED_VISUALIZATION);
      if (!isEmpty(currQuery![SAVED_OBJECT_ID]) && isTabMatchingSavedType) {
        params['objectId'] = currQuery![SAVED_OBJECT_ID];
        params['type'] = curVisId;
        savingVisRes = await savedObjects.updateSavedVisualizationById(params)
        .then((res: any) => {
          setToast(`Visualization '${selectedPanelNameRef.current}' has been successfully updated.`, 'success');
          dispatch(updateTabName({
            tabId,
            tabName: selectedPanelNameRef.current
          }));
          return res;
        })
        .catch((error: any) => {
          notifications.toasts.addError(error, {
            title: `Cannot update Visualization '${selectedPanelNameRef.current}'`
          });
        });
      } else {
        // create new saved visualization
        savingVisRes = await savedObjects.createSavedVisualization({
          query: currQuery![RAW_QUERY],
          fields: currFields![SELECTED_FIELDS],
          dateRange: currQuery![SELECTED_DATE_RANGE],
          type: curVisId,
          name: selectedPanelNameRef.current,
          timestamp: currQuery![SELECTED_TIMESTAMP]
        })
        .then((res: any) => {
          batch(() => {
            dispatch(changeQuery({
              tabId,
              query: {
                [SAVED_OBJECT_ID]: res['objectId'],
                [SAVED_OBJECT_TYPE]: SAVED_VISUALIZATION
              }
            }));
            dispatch(updateTabName({
              tabId,
              tabName: selectedPanelNameRef.current
            }));
          });
          history.replace(`/event_analytics/explorer/${res['objectId']}`);
          setToast(`New visualization '${selectedPanelNameRef.current}' has been successfully saved.`, 'success');
          return res;
        })
        .catch((error: any) => {
          notifications.toasts.addError(error, {
            title: `Cannot save Visualization '${selectedPanelNameRef.current}'`
          });
        });
      }
      if (!has(savingVisRes, 'objectId')) return;
      // update custom panel - visualization
      if (!isEmpty(selectedCustomPanelOptions)) {
        savedObjects.bulkUpdateCustomPanel({
          selectedCustomPanels: selectedCustomPanelOptions,
          savedVisualizationId: savingVisRes.objectId
        })
        .then((res: any) => {
          setToast(`Visualization '${selectedPanelNameRef.current}' has been successfully saved to operation panels.`, 'success');
        })
        .catch((error: any) => {
          notifications.toasts.addError(error, {
            title: `Cannot add Visualization '${selectedPanelNameRef.current}' to operation panels`
          });
        });
      }
    }
  };

  const onToggleChange = (e: { target: { checked: boolean | ((prevState: boolean) => boolean); }; }) => {
    setLiveTailToggle(e.target.checked);
    setIsLiveTailPopoverOpen(!isLiveTailPopoverOpen);
  };

  const wrappedPopoverButton = useMemo(() => {
    return (
      <EuiButtonToggle
        label={liveTailNameRef.current}
        iconType="arrowDown"
        isIconOnly={isLiveTailOn ? false : true}
        iconSide="right"
        onClick={() => setIsLiveTailPopoverOpen(!isLiveTailPopoverOpen)}
        onChange={onToggleChange}
        data-test-subj="eventLiveTail"
      />
    );
  }, [isLiveTailPopoverOpen, liveTailToggle, onToggleChange, isLiveTailOn]);

  const sleep = (milliseconds: number | undefined) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  const liveTailLoop = async (name: string, startTime: string, endTime: string, delayTime: number) => {
    setLiveTailName(name)
    setLiveTailTabId(curSelectedTabId.current);
    setIsLiveTailOn(true);
    setToast("Live tail On",'success');
    setIsLiveTailPopoverOpen(false);
    await sleep(2000);
    while (isLiveTailOnRef.current === true){
      handleLiveTailSearch(startTime, endTime);
        if (liveTailTabIdRef.current !== curSelectedTabId.current) {
          setIsLiveTailOn(!isLiveTailOnRef.current);
          isLiveTailOnRef.current = false;
          setLiveTailName("")
        }
        await sleep(delayTime);
    }  
  }

  const popoverItems: ReactElement[] = [
    <EuiContextMenuItem
      key="10s"
      onClick={ async () => {
        liveTailLoop("10s", 'now-10s', 'now', 10000);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      10s
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="30s"
      onClick={ async () => {
        liveTailLoop("30s", 'now-30s', 'now', 30000);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      30s
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="1m"
      onClick={ async () => {
        liveTailLoop("1m", 'now-1m', 'now', 60000);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      1m
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="5m"
      onClick={ async () => {
        liveTailLoop("5m", 'now-5m', 'now', 60000*5); 
      }}
      data-test-subj="eventLiveTail__delay"
    >
      5m
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="15m"
      onClick={ async () => {
        liveTailLoop("15m", 'now-15m', 'now', 60000*15);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      15m
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="30m"
      onClick={ async () => {
        liveTailLoop("30m", 'now-30m', 'now', 60000*30);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      30m
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="1h"
      onClick={ async () => {
        liveTailLoop("1h", 'now-1h', 'now', 60000*60);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      1h
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="2h"
      onClick={ async () => {
        liveTailLoop("2h", 'now-2h', 'now', 60000*120);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      2h
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="1day"
      onClick={ async () => {
        liveTailLoop("1d", 'now-1d', 'now', 60000*60*24);
      }}
      data-test-subj="eventLiveTail__delay"
    >
      1d
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="off"
      onClick={ () => {
        setLiveTailName("")
        setIsLiveTailOn(false);
        setToast("Live tail Off",'success');
        setIsLiveTailPopoverOpen(false);
      }}
      data-test-subj="eventLiveTail__off"
    >
      Off
    </EuiContextMenuItem>,
    ];

  const dateRange = isEmpty(query['selectedDateRange']) ? ['now-15m', 'now'] :
   [query['selectedDateRange'][0], query['selectedDateRange'][1]];
  
   return (
    <div className="dscAppContainer">
      <Search
        key="search-component"
        query={query[RAW_QUERY]}
        tempQuery={tempQuery}
        handleQueryChange={handleQueryChange}
        handleQuerySearch={handleQuerySearch}
        dslService = {dslService}
        startTime={dateRange[0]}
        endTime={dateRange[1]}
        handleTimePickerChange={(timeRange: Array<string>) => handleTimePickerChange(timeRange)}
        selectedPanelName={selectedPanelNameRef.current}
        selectedCustomPanelOptions={selectedCustomPanelOptions}
        setSelectedPanelName={setSelectedPanelName}
        setSelectedCustomPanelOptions={setSelectedCustomPanelOptions}
        handleSavingObject={handleSavingObject}
        isPanelTextFieldInvalid={isPanelTextFieldInvalid}
        savedObjects={savedObjects}
        showSavePanelOptionsList={isEqual(selectedContentTabId, TAB_CHART_ID)}
        handleTimeRangePickerRefresh={handleTimeRangePickerRefresh}
        liveTailButton={wrappedPopoverButton}
        isLiveTailPopoverOpen={isLiveTailPopoverOpen}
        closeLiveTailPopover={() => setIsLiveTailPopoverOpen(false)}
        popoverItems={popoverItems}
      />
      <EuiTabbedContent
        className="mainContentTabs"
        initialSelectedTab={memorizedMainContentTabs[0]}
        selectedTab={memorizedMainContentTabs.find(tab => tab.id === selectedContentTabId)}
        onTabClick={(selectedTab: EuiTabbedContentTab) => handleContentTabClick(selectedTab)}
        tabs={memorizedMainContentTabs}
      />
    </div>
  );
};