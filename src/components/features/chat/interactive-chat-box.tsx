import { CustomChatInput } from "./custom-chat-input";
import { useBtwInterceptor } from "#/hooks/chat/use-btw-interceptor";
import { useGoalInterceptor } from "#/hooks/chat/use-goal-interceptor";
import { useModelInterceptor } from "#/hooks/chat/use-model-interceptor";
import { useChatAttachmentUpload } from "#/hooks/chat/use-chat-attachment-upload";
import { AgentState } from "#/types/agent-state";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import { GitControlBar } from "./git-control-bar";
import { useConversationStore } from "#/stores/conversation-store";
import { useAgentState } from "#/hooks/use-agent-state";
import { useSubConversationTaskPolling } from "#/hooks/query/use-sub-conversation-task-polling";
import { partitionImagesForUpload } from "#/components/features/chat/utils/chat-input.utils";
import { isTaskPolling } from "#/utils/utils";
import toast from "react-hot-toast";
import { useNavigation } from "#/context/navigation-context";
import { useAddWorkspaces } from "#/hooks/mutation/use-local-workspaces-mutations";
import { HOME_SELECTED_WORKSPACE_PATH_KEY } from "../home/workspace-selection-form";

interface InteractiveChatBoxProps {
  onSubmit: (message: string, images: File[], files: File[]) => void;
  disabled?: boolean;
  hasStartedConversation?: boolean;
}

export function InteractiveChatBox({
  onSubmit,
  disabled = false,
  hasStartedConversation,
}: InteractiveChatBoxProps) {
  const {
    images,
    files,
    imagesMarkedUploadAsFile,
    clearAllFiles,
    subConversationTaskId,
  } = useConversationStore();
  const { curAgentState } = useAgentState();
  const { data: conversation } = useActiveConversation();
  const { conversationId: routeConversationId } = useOptionalConversationId();
  const conversationId = routeConversationId ?? conversation?.id ?? null;

  const { taskStatus: subConversationTaskStatus } =
    useSubConversationTaskPolling(
      subConversationTaskId,
      conversation?.id || null,
    );

  const { handleUpload } = useChatAttachmentUpload();
  const { navigate } = useNavigation();
  const { mutate: addWorkspaces } = useAddWorkspaces();

  const handleAfterGoal = useBtwInterceptor(conversationId, (message) => {
    const { imagesToEmbed, imagesAsFiles } = partitionImagesForUpload(
      images,
      imagesMarkedUploadAsFile,
    );
    
    // Separate real files from directory files
    const actualFiles = files.filter(f => !(f as any).isFolder);
    const folderFiles = files.filter(f => (f as any).isFolder);
    
    // We pass both actual files and folder files to onSubmit now so the parent can handle the prompt augmentation
    onSubmit(message, imagesToEmbed, [...actualFiles, ...imagesAsFiles, ...folderFiles]);
    clearAllFiles();
  });
  const handleAfterModel = useGoalInterceptor(conversationId, handleAfterGoal);
  const handleSubmit = useModelInterceptor(conversationId, handleAfterModel);

  const handleSuggestionsClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const isDisabled =
    disabled ||
    curAgentState === AgentState.AWAITING_USER_CONFIRMATION ||
    isTaskPolling(subConversationTaskStatus);

  return (
    <div data-testid="interactive-chat-box">
      <CustomChatInput
        disabled={isDisabled}
        isNewConversationPending={disabled}
        hasStartedConversation={hasStartedConversation}
        onSubmit={handleSubmit}
        onFilesPaste={handleUpload}
      />
      <div className="mt-3 pb-3">
        <GitControlBar onSuggestionsClick={handleSuggestionsClick} />
      </div>
    </div>
  );
}
