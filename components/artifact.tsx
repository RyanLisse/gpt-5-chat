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
import { MultimodalInput } from './multimodal-input';
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

// Chat panel component
function ArtifactChatPanel({
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
}

// Artifact header component
function ArtifactHeader({
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
}

// Main content area component
function ArtifactMainContent({
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
}

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

function PureArtifact({
  chatId,
  sendMessage,
  regenerate,
  status,
  stop,
  messages: _messages,
  votes,
  isReadonly,
  isAuthenticated,
}: {
  chatId: string;
  messages: ChatMessage[];
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  status: UseChatHelpers<ChatMessage>['status'];
  stop: UseChatHelpers<ChatMessage>['stop'];
  isReadonly: boolean;
  isAuthenticated: boolean;
}) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();

  const artifactState = useArtifactState(artifact, setArtifact, isReadonly);
  const {
    documents,
    document,
    currentVersionIndex,
    isContentDirty,
    isDocumentsFetching,
    saveContent,
    getDocumentContentById,
    isCurrentVersion,
    mode,
    isToolbarVisible,
    setIsToolbarVisible,
    artifactDefinition,
    handleVersionChange,
    queryClient,
    trpc,
  } = artifactState;

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

  const chatPanel = (
    <ArtifactChatPanel
      artifact={artifact}
      chatId={chatId}
      isReadonly={isReadonly}
      regenerate={regenerate}
      sendMessage={sendMessage}
      status={status}
      stop={stop}
      votes={votes}
    />
  );

  const mainContent = (
    <>
      <ArtifactHeader
        artifact={artifact}
        currentVersionIndex={currentVersionIndex}
        document={document}
        handleVersionChange={handleVersionChange}
        isContentDirty={isContentDirty}
        isCurrentVersion={isCurrentVersion}
        isReadonly={isReadonly}
        metadata={metadata}
        mode={mode}
        setMetadata={setMetadata}
      />

      <ArtifactMainContent
        artifact={artifact}
        artifactDefinition={artifactDefinition}
        currentVersionIndex={currentVersionIndex}
        documents={documents}
        getDocumentContentById={getDocumentContentById}
        handleVersionChange={handleVersionChange}
        isCurrentVersion={isCurrentVersion}
        isDocumentsFetching={isDocumentsFetching}
        isReadonly={isReadonly}
        isToolbarVisible={isToolbarVisible}
        metadata={metadata}
        mode={mode}
        saveContent={saveContent}
        sendMessage={sendMessage}
        setIsToolbarVisible={setIsToolbarVisible}
        setMetadata={setMetadata}
        status={status}
        stop={stop}
      />
    </>
  );

  return (
    <ArtifactLayout
      artifact={artifact}
      chatPanel={chatPanel}
      isCurrentVersion={isCurrentVersion}
      mainContent={mainContent}
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
