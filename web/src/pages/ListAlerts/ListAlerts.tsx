/**
 * Panther is a Cloud-Native SIEM for the Modern Security Team.
 * Copyright (C) 2020 Panther Labs Inc
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';
import { Alert, Box, Card } from 'pouncejs';
import { DEFAULT_LARGE_PAGE_SIZE } from 'Source/constants';
import { extractErrorMessage } from 'Helpers/utils';
import { ListAlertsInput, SortDirEnum, ListAlertsSortFieldsEnum } from 'Generated/schema';
import useInfiniteScroll from 'Hooks/useInfiniteScroll';
import useRequestParamsWithoutPagination from 'Hooks/useRequestParamsWithoutPagination';
import TablePlaceholder from 'Components/TablePlaceholder';
import ErrorBoundary from 'Components/ErrorBoundary';
import isEmpty from 'lodash-es/isEmpty';
import withSEO from 'Hoc/withSEO';
import { useListAlerts } from './graphql/listAlerts.generated';
import ListAlertsTable from './ListAlertsTable';
import ListAlertsActions from './ListAlertsActions';
import ListAlertsPageSkeleton from './Skeleton';
import ListAlertsPageEmptyDataFallback from './EmptyDataFallback';

const ListAlerts = () => {
  const { requestParams, updateRequestParams } = useRequestParamsWithoutPagination<
    ListAlertsInput
  >();

  const { loading, error, data, fetchMore } = useListAlerts({
    fetchPolicy: 'cache-and-network',
    variables: {
      input: {
        ...requestParams,
        pageSize: DEFAULT_LARGE_PAGE_SIZE,
      },
    },
  });

  const alertItems = data?.alerts.alertSummaries || [];
  const lastEvaluatedKey = data?.alerts.lastEvaluatedKey || null;
  const hasNextPage = !!data?.alerts?.lastEvaluatedKey;

  const { sentinelRef } = useInfiniteScroll<HTMLDivElement>({
    loading,
    threshold: 500,
    onLoadMore: () => {
      fetchMore({
        variables: {
          input: {
            ...requestParams,
            pageSize: DEFAULT_LARGE_PAGE_SIZE,
            exclusiveStartKey: lastEvaluatedKey,
          },
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          // FIXME: Centralize this behavior for alert pagination, when apollo fixes a bug which
          // causes wrong params to be passed to the merge function in type policies
          // https://github.com/apollographql/apollo-client/issues/5951
          return {
            alerts: {
              ...fetchMoreResult.alerts,
              alertSummaries: [
                ...previousResult.alerts.alertSummaries,
                ...fetchMoreResult.alerts.alertSummaries,
              ],
            },
          };
        },
      });
    },
  });

  if (loading && !data) {
    return <ListAlertsPageSkeleton />;
  }

  if (!alertItems.length && isEmpty(requestParams)) {
    return <ListAlertsPageEmptyDataFallback />;
  }

  const hasError = Boolean(error);

  return (
    <ErrorBoundary>
      {hasError && (
        <Box mb={6}>
          <Alert
            variant="error"
            title="Couldn't load your alerts"
            description={
              extractErrorMessage(error) ||
              'There was an error when performing your request, please contact support@runpanther.io'
            }
          />
        </Box>
      )}
      <ListAlertsActions showActions={hasError} />
      <Card mb={8}>
        <ListAlertsTable
          items={alertItems}
          onSort={updateRequestParams}
          sortBy={ListAlertsSortFieldsEnum.CreatedAt}
          sortDir={requestParams.sortDir || SortDirEnum.Descending}
        />
        {hasNextPage && (
          <Box p={8} ref={sentinelRef}>
            <TablePlaceholder rowCount={10} />
          </Box>
        )}
      </Card>
    </ErrorBoundary>
  );
};

export default withSEO({ title: 'Alerts' })(ListAlerts);
