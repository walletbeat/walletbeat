import React from 'react';

/** Join a list of nodes with grammatical separators. */
export function JoinedList({
  data,
  key,
  separator = ', ',
  lastSeparator = ' and ',
}: {
  data: Array<{ key: string; value: React.ReactNode }>;
  key?: string;
  separator?: React.ReactNode;
  lastSeparator?: React.ReactNode;
}): React.JSX.Element {
  return (
    <React.Fragment key={key}>
      {data.map((datum, index) => (
        <React.Fragment key={datum.key}>
          {datum.value}
          {index === data.length - 2 ? lastSeparator : index !== data.length - 1 ? separator : ''}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
}
