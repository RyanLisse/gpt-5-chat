import type { UseChatHelpers } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import equal from 'fast-deep-equal';
import { AnimatePresence } from 'motion/react';
import { memo, useEffect, useState } from 'react';
import { CloneChatButton } from '@/components/clone-chat-button';
import { useArtifact } from '@/hooks/use-artifact';
import { useArtifactDocument } from '@/hooks/use-artifact-document';
import type { ChatMessage } from '@/lib/ai/types';
import type { ArtifactKind } from '@/lib/artifacts/artifact-kind';
import { codeArtifact } from '@/lib/artifacts/code/client';
import { sheetArtifact } from '@/lib/artifacts/sheet/client';
import { textArtifact } from '@/lib/artifacts/text/client';
import type { Vote } from '@/lib/db/schema';
import { chatStore } from '@/lib/stores/chat-store';
import { useTRPC } from '@/trpc/react';
import { ArtifactActions } from './artifact-actions';
import { ArtifactCloseButton } from './artifact-close-button';
import { ArtifactLayout } from './artifact-layout';
import { ArtifactMessages } from './artifact-messages';
import { MultimodalInputLazy as MultimodalInput } from './lazy/multimodal-input-lazy';
import { Toolbar } from './toolbar';
import { ScrollArea } from './ui/scroll-area';
import { VersionFooter } from './version-footer';

export const artifactDefinitions = [textArtifact, codeArtifact, sheetArtifact];

// Custom hook for artifact state management
function useArtifactState(
  artifact: UIArtifact,
  setArtifact: any,
  isReadonly: boolean,
) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  const documentHook = useArtifactDocument(artifact, setArtifact, isReadonly);

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (type === 'toggle') {
      setMode((currentMode) => (currentMode === 'edit' ? 'diff' : 'edit'));
    } else if (type === 'latest') {
      documentHook.handleVersionChange(type);
      setMode('edit');
    } else {
      documentHook.handleVersionChange(type);
    }
  };

  return {
    ...documentHook,
    mode,
    setMode,
    isToolbarVisible,
    setIsToolbarVisible,
    artifactDefinition,
    handleVersionChange,
    queryClient,
    trpc,
  };
}

// Custom hook for artifact initialization
function useArtifactInitialization(
  artifact: UIArtifact,
  artifactDefinition: any,
  setMetadata: any,
  trpc: any,
  queryClient: any,
  isAuthenticated: boolean,
) {
  useEffect(() => {
    if (
      artifact.documentId !== 'init' &&
      artifact.status !== 'streaming' &&
      artifactDefinition.initialize
    ) {
      artifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
        trpc,
        queryClient,
        isAuthenticated,
      });
    }
  }, [
    artifact.documentId,
    artifactDefinition,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
    artifact.status,
  ]);
}

// Chat panel component
const ArtifactChatPanel = memo(function ArtifactChatPanel({
  chatId,
  artifact,
  isReadonly,
  regenerate,
  sendMessage,
  votes,
  status,
  stop,
}: {
  chatId: string;
  artifact: UIArtifact;
  isReadonly: boolean;
  regenerate: any;
  sendMessage: any;
  votes: Vote[] | undefined;
  status: any;
  stop: any;
}) {
  return (
    <div className="@container flex h-full flex-col items-center justify-between">
      <ArtifactMessages
        artifactStatus={artifact.status}
        isReadonly={isReadonly}
        isVisible={true}
        regenerate={regenerate}
        sendMessage={sendMessage}
        votes={votes}
      />

      {isReadonly ? (
        <CloneChatButton chatId={chatId} />
      ) : (
        <MultimodalInput
          chatId={chatId}
          className=""
          isEditMode={isReadonly}
          parentMessageId={chatStore.getState().getLastMessageId()}
          sendMessage={sendMessage}
          status={status}
          stop={stop}
        />
      )}
    </div>
  );
});

// Artifact header component
const ArtifactHeader = memo(function ArtifactHeader({
  artifact,
  document,
  isContentDirty,
  currentVersionIndex,
  handleVersionChange,
  isCurrentVersion,
  isReadonly,
  metadata,
  mode,
  setMetadata,
}: {
  artifact: UIArtifact;
  document: any;
  isContentDirty: boolean;
  currentVersionIndex: number;
  handleVersionChange: any;
  isCurrentVersion: boolean;
  isReadonly: boolean;
  metadata: any;
  mode: 'edit' | 'diff';
  setMetadata: any;
}) {
  return (
    <div className="flex flex-row items-start justify-between bg-background/80 p-2">
      <div className="flex flex-row items-start gap-4">
        <ArtifactCloseButton />

        <div className="flex flex-col">
          <div className="font-medium">{artifact.title}</div>

          {(() => {
            if (isContentDirty) {
              return (
                <div className="text-muted-foreground text-sm">
                  Saving changes...
                </div>
              );
            }

            if (document) {
              return (
                <div className="text-muted-foreground text-sm">
                  {`Updated ${formatDistance(
                    new Date(document.createdAt),
                    new Date(),
                    {
                      addSuffix: true,
                    },
                  )}`}
                </div>
              );
            }

            return (
              <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
            );
          })()}
        </div>
      </div>

      <ArtifactActions
        artifact={artifact}
        currentVersionIndex={currentVersionIndex}
        handleVersionChange={handleVersionChange}
        isCurrentVersion={isCurrentVersion}
        isReadonly={isReadonly}
        metadata={metadata}
        mode={mode}
        setMetadata={setMetadata}
      />
    </div>
  );
});

// Main content area component
const ArtifactMainContent = memo(function ArtifactMainContent({
  artifact,
  artifactDefinition,
  isCurrentVersion,
  getDocumentContentById,
  currentVersionIndex,
  isDocumentsFetching,
  isReadonly,
  metadata,
  mode,
  saveContent,
  setMetadata,
  isToolbarVisible,
  setIsToolbarVisible,
  sendMessage,
  status,
  stop,
  documents,
  handleVersionChange,
}: {
  artifact: UIArtifact;
  artifactDefinition: any;
  isCurrentVersion: boolean;
  getDocumentContentById: any;
  currentVersionIndex: number;
  isDocumentsFetching: boolean;
  isReadonly: boolean;
  metadata: any;
  mode: 'edit' | 'diff';
  saveContent: any;
  setMetadata: any;
  isToolbarVisible: boolean;
  setIsToolbarVisible: any;
  sendMessage: any;
  status: any;
  stop: any;
  documents: any;
  handleVersionChange: any;
}) {
  return (
    <>
      <ScrollArea className="!max-w-full h-full">
        <div className="flex flex-col items-center bg-background/80">
          <artifactDefinition.content
            content={
              isCurrentVersion
                ? artifact.content
                : getDocumentContentById(currentVersionIndex)
            }
            currentVersionIndex={currentVersionIndex}
            getDocumentContentById={getDocumentContentById}
            isCurrentVersion={isCurrentVersion}
            isInline={false}
            isLoading={isDocumentsFetching && !artifact.content}
            isReadonly={isReadonly}
            metadata={metadata}
            mode={mode}
            onSaveContent={saveContent}
            setMetadata={setMetadata}
            status={artifact.status}
            suggestions={[]}
            title={artifact.title}
          />

          <AnimatePresence>
            {isCurrentVersion && !isReadonly && (
              <Toolbar
                artifactKind={artifact.kind}
                isToolbarVisible={isToolbarVisible}
                sendMessage={sendMessage}
                setIsToolbarVisible={setIsToolbarVisible}
                status={status}
                stop={stop}
              />
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <AnimatePresence>
        {!(isCurrentVersion || isReadonly) && (
          <VersionFooter
            currentVersionIndex={currentVersionIndex}
            documents={documents}
            handleVersionChange={handleVersionChange}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export type UIArtifact = {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  messageId: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

type PureArtifactProps = {
  chatId: string;
  messages: ChatMessage[];
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  status: UseChatHelpers<ChatMessage>['status'];
  stop: UseChatHelpers<ChatMessage>['stop'];
  isReadonly: boolean;
  isAuthenticated: boolean;
};

// Utility function to create chat panel
function createChatPanel(artifact: UIArtifact, props: PureArtifactProps) {
  return (
    <ArtifactChatPanel
      artifact={artifact}
      chatId={props.chatId}
      isReadonly={props.isReadonly}
      regenerate={props.regenerate}
      sendMessage={props.sendMessage}
      status={props.status}
      stop={props.stop}
      votes={props.votes}
    />
  );
}

// Utility function to create main content
function createMainContent(
  artifact: UIArtifact,
  artifactState: any,
  metadata: any,
  setMetadata: any,
  props: PureArtifactProps,
) {
  return (
    <>
      <ArtifactHeader
        artifact={artifact}
        currentVersionIndex={artifactState.currentVersionIndex}
        document={artifactState.document}
        handleVersionChange={artifactState.handleVersionChange}
        isContentDirty={artifactState.isContentDirty}
        isCurrentVersion={artifactState.isCurrentVersion}
        isReadonly={props.isReadonly}
        metadata={metadata}
        mode={artifactState.mode}
        setMetadata={setMetadata}
      />
      <ArtifactMainContent
        artifact={artifact}
        artifactDefinition={artifactState.artifactDefinition}
        currentVersionIndex={artifactState.currentVersionIndex}
        documents={artifactState.documents}
        getDocumentContentById={artifactState.getDocumentContentById}
        handleVersionChange={artifactState.handleVersionChange}
        isCurrentVersion={artifactState.isCurrentVersion}
        isDocumentsFetching={artifactState.isDocumentsFetching}
        isReadonly={props.isReadonly}
        isToolbarVisible={artifactState.isToolbarVisible}
        metadata={metadata}
        mode={artifactState.mode}
        saveContent={artifactState.saveContent}
        sendMessage={props.sendMessage}
        setIsToolbarVisible={artifactState.setIsToolbarVisible}
        setMetadata={setMetadata}
        status={props.status}
        stop={props.stop}
      />
    </>
  );
}

function PureArtifact(props: PureArtifactProps) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const artifactState = useArtifactState(
    artifact,
    setArtifact,
    props.isReadonly,
  );

  useArtifactInitialization(
    artifact,
    artifactState.artifactDefinition,
    setMetadata,
    artifactState.trpc,
    artifactState.queryClient,
    props.isAuthenticated,
  );

  return (
    <ArtifactLayout
      artifact={artifact}
      chatPanel={createChatPanel(artifact, props)}
      isCurrentVersion={artifactState.isCurrentVersion}
      mainContent={createMainContent(
        artifact,
        artifactState,
        metadata,
        setMetadata,
        props,
      )}
    />
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }
  if (prevProps.regenerate !== nextProps.regenerate) {
    return false;
  }
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.stop !== nextProps.stop) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (!equal(prevProps.messages, nextProps.messages)) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.isAuthenticated !== nextProps.isAuthenticated) {
    return false;
  }

  return true;
});
