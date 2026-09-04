import type { TFunction } from "i18next";
import {
  resolveConversationRuntime,
  uploadFilesToConversation,
} from "#/api/conversation-file-upload.api";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import type { SendMessageRequest } from "#/api/conversation-service/agent-server-conversation-service.types";
import { convertImageToBase64 } from "#/utils/convert-image-to-base-64";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { partitionImagesForUpload } from "#/components/features/chat/utils/chat-input.utils";
import { validateFiles } from "#/utils/file-validation";
import { I18nKey } from "#/i18n/declaration";

export interface SendMessageWithAttachmentsResult {
  text: string;
  content: string;
  imageUrls: string[];
  fileUrls: string[];
  timestamp: string;
}

export async function sendMessageWithAttachments(options: {
  conversationId: string;
  content: string;
  images: File[];
  files: File[];
  imagesMarkedUploadAsFile: string[];
  t: TFunction;
}): Promise<SendMessageWithAttachmentsResult> {
  const {
    conversationId,
    content,
    images,
    files,
    imagesMarkedUploadAsFile,
    t,
  } = options;

  const { imagesToEmbed, imagesAsFiles } = partitionImagesForUpload(
    images,
    imagesMarkedUploadAsFile,
  );
  const allFiles = [...files, ...imagesAsFiles];
  // Filter out both remote folders and local folders
  const actualFilesToUpload = allFiles.filter(f => !(f as any).isRemoteFolder && !(f as any).isFolder);
  const folderFiles = allFiles.filter(f => (f as any).isRemoteFolder || (f as any).isFolder);

  let finalContent = content;
  if (folderFiles.length > 0) {
    const folderPaths = folderFiles.map(f => (f as any).folderPath || f.name).join("\n");
    finalContent += `\n\nDirectorio de referencia:\n${folderPaths}`;
  }

  const validation = validateFiles([...imagesToEmbed, ...actualFilesToUpload]);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage ?? "Invalid attachments");
  }

  const imageUrls = await Promise.all(
    imagesToEmbed.map((image) => convertImageToBase64(image)),
  );

  const runtime = await resolveConversationRuntime(conversationId);

  const { skipped_files: skippedFiles, uploaded_files: uploadedFiles } =
    actualFilesToUpload.length > 0
      ? await uploadFilesToConversation(conversationId, actualFilesToUpload)
      : { skipped_files: [], uploaded_files: [] };

  skippedFiles.forEach((file) => displayErrorToast(file.reason));

  const filePrompt = `${t(I18nKey.CHAT_INTERFACE$AUGMENTED_PROMPT_FILES_TITLE)}: ${uploadedFiles.join("\n\n")}`;
  const prompt =
    uploadedFiles.length > 0 ? `${finalContent}\n\n${filePrompt}` : finalContent;

  const timestamp = new Date().toISOString();

  const messageContent: SendMessageRequest = {
    role: "user",
    content: [{ type: "text", text: prompt }],
  };

  if (imageUrls.length > 0) {
    messageContent.content.push({
      type: "image",
      image_urls: imageUrls,
    });
  }

  await AgentServerConversationService.sendMessage(
    conversationId,
    messageContent,
    runtime,
  );

  return {
    text: content,
    content: prompt,
    imageUrls,
    fileUrls: uploadedFiles,
    timestamp,
  };
}
