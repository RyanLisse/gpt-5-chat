import equal from 'fast-deep-equal';
import { memo } from 'react';
import type { UIArtifact } from './artifact';
import { Messages, type MessagesProps } from './messages';

export interface ArtifactMessagesProps extends MessagesProps {
  artifactStatus: UIArtifact['status'];
}

function PureArtifactMessages({
  artifactStatus,
  ...rest
}: ArtifactMessagesProps) {
  return <Messages {...rest} />;
}

function areEqual(
  prevProps: ArtifactMessagesProps,
  nextProps: ArtifactMessagesProps,
) {
  // Special case: both streaming should not re-render
  if (
    prevProps.artifactStatus === 'streaming' &&
    nextProps.artifactStatus === 'streaming'
  ) {
    return true;
  }

  // Compare all relevant props using functional approach
  const propsToCompare: (keyof ArtifactMessagesProps)[] = [
    'artifactStatus',
    'isReadonly',
    'sendMessage',
    'regenerate',
  ];

  const allPropsEqual = propsToCompare.every(
    (prop) => prevProps[prop] === nextProps[prop],
  );

  return allPropsEqual && equal(prevProps.votes, nextProps.votes);
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);
