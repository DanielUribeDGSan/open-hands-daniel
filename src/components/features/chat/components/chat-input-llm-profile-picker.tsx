import React from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { useChatInputLlmProfileState } from "#/hooks/use-chat-input-llm-profile-state";
import { ComboboxCaretInline } from "#/ui/combobox-caret";
import { Search } from "lucide-react";
import SettingsGearIcon from "#/icons/settings-gear.svg?react";
import CheckIcon from "#/icons/checkmark.svg?react";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import { NavigationLink } from "#/components/shared/navigation-link";
import { ContextMenu } from "#/ui/context-menu";
import { ContextMenuListItem } from "#/components/features/context-menu/context-menu-list-item";
import { Divider } from "#/ui/divider";
import { Typography } from "#/ui/typography";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { chatInputPillButtonClassName } from "#/utils/form-control-classes";
import { formatModelNameForDisplay } from "#/utils/format-model-name";
import { useProviderModels } from "#/hooks/query/use-provider-models";
import { extractModelAndProvider } from "#/utils/extract-model-and-provider";
import ProfilesService from "#/api/profiles-service/profiles-service.api";
import { useSaveLlmProfile } from "#/hooks/mutation/use-save-llm-profile";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import { useSwitchLlmProfileAndLog } from "#/hooks/mutation/use-switch-llm-profile-and-log";

const PROFILE_LABEL_MAX_CHARS = 18;

function truncateLabel(label: string): string {
  return label.length <= PROFILE_LABEL_MAX_CHARS
    ? label
    : `${label.slice(0, PROFILE_LABEL_MAX_CHARS)}…`;
}

interface ChatInputLlmProfileMenuContentProps {
  onClose: () => void;
  dividerInset?: "menu";
  settingsLinkClassName?: string;
  settingsIconClassName?: string;
}

/**
 * The in-conversation OpenHands LLM-profile switcher list. Selecting a profile
 * live-swaps the running conversation's LLM via `/switch_profile` (the ACP
 * analog is {@link ChatInputModelMenuContent}). Shared by the inline pill and
 * the chat-input overflow submenu.
 */
export function ChatInputLlmProfileMenuContent({
  onClose,
  dividerInset,
  settingsLinkClassName,
  settingsIconClassName,
}: ChatInputLlmProfileMenuContentProps) {
  const { t } = useTranslation("openhands");
  const {
    profiles,
    currentProfileName,
    currentProfileModel,
    canSwitchProfile,
    selectProfile,
  } = useChatInputLlmProfileState();

  const { conversationId } = useOptionalConversationId();
  const { switchAndLog } = useSwitchLlmProfileAndLog();

  const currentModelStr = currentProfileModel ?? "";
  const { provider: currentProvider, model: currentModelValue } = React.useMemo(
    () => extractModelAndProvider(currentModelStr),
    [currentModelStr]
  );

  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: providerModels = [] } = useProviderModels(currentProvider || null);

  const extendedProviderModels = React.useMemo(() => {
    if (!currentModelValue) return providerModels;
    const exists = providerModels.some((m) => m.name === currentModelValue);
    if (!exists) {
      return [{ provider: currentProvider, name: currentModelValue, verified: false }, ...providerModels];
    }
    return providerModels;
  }, [providerModels, currentModelValue, currentProvider]);

  const filteredProviderModels = React.useMemo(() => {
    if (!searchQuery.trim()) return extendedProviderModels;
    const lowerQuery = searchQuery.toLowerCase();
    return extendedProviderModels.filter((m) => 
      m.name.toLowerCase().includes(lowerQuery) || 
      (m.provider && m.provider.toLowerCase().includes(lowerQuery))
    );
  }, [extendedProviderModels, searchQuery]);

  const saveProfileMutation = useSaveLlmProfile();

  // Read-only surfaces (a cloud member on the home page, or a start-task route)
  // still name the active profile — the same shape ChatInputModelMenuContent
  // uses when the ACP picker is gated off.
  const showProfileList = canSwitchProfile && profiles.length > 0;
  const showModelList = canSwitchProfile && extendedProviderModels.length > 0;
  const readOnlyProfileName = canSwitchProfile ? null : currentProfileName;

  const handleSelect = (profileName: string) => {
    selectProfile(profileName);
    onClose();
  };

  const handleSelectModel = async (modelId: string) => {
    if (!currentProfileName) return;
    onClose();

    try {
      const profileDetail = await ProfilesService.getProfile(currentProfileName, "plaintext");
      if (!profileDetail) return;

      const newConfig = { ...(profileDetail.config || {}), model: modelId };
      await saveProfileMutation.mutateAsync({ name: currentProfileName, request: { llm: newConfig as any } });
      
      switchAndLog(conversationId, currentProfileName);
    } catch (e) {
      console.error("Failed to update profile model", e);
    }
  };

  return (
    <>
      {showModelList && (
        <>
          <li role="presentation" className="px-2 pt-2 pb-1">
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-[var(--oh-muted)] group-focus-within:text-white pointer-events-none transition-colors">
                <Search width={14} height={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar modelo o escribir manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim() !== "") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectModel(searchQuery.trim());
                  }
                }}
                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md bg-[var(--oh-surface)]/50 text-[var(--oh-text-primary)] border border-[var(--oh-border-subtle)] focus:outline-none focus:border-[var(--oh-border)] focus:bg-[var(--oh-surface-raised)] hover:border-[var(--oh-border)] hover:bg-[var(--oh-surface-raised)] transition-colors placeholder:text-[var(--oh-muted)]"
              />
            </div>
          </li>
          <li role="presentation" className="px-2 pt-2 pb-0.5">
            <Typography.Text className="text-[11px] font-medium text-[var(--oh-text-dim)] uppercase tracking-wide leading-4">
              Modelos ({currentProvider})
            </Typography.Text>
          </li>
          {filteredProviderModels.length > 0 ? filteredProviderModels.map((option) => {
            const fullModelId = option.provider ? `${option.provider}/${option.name}` : option.name;
            const isSelected = fullModelId === currentProfileModel;
            return (
              <ContextMenuListItem
                key={fullModelId}
                testId={`chat-input-acp-model-option-${fullModelId}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelectModel(fullModelId);
                }}
                className={cn(
                  "flex flex-col items-stretch gap-0.5",
                  isSelected && "bg-[var(--oh-interactive-hover)]",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex-1 truncate text-sm leading-5"
                    title={option.name}
                  >
                    {option.name}
                  </span>
                  {isSelected && (
                    <CheckIcon
                      width={14}
                      height={14}
                      className="shrink-0"
                      aria-hidden
                    />
                  )}
                </span>
              </ContextMenuListItem>
            );
          }) : (
            <ContextMenuListItem
              testId="chat-input-custom-model-option"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSelectModel(searchQuery.trim());
              }}
            >
              Usar modelo personalizado: <span className="font-semibold ml-1">{searchQuery.trim()}</span>
            </ContextMenuListItem>
          )}
        </>
      )}

      {showProfileList && (
        <>
          {/* role="presentation" keeps this a valid <li> child of the
              ContextMenu <ul> without exposing the label as a menu item. */}
          <li role="presentation" className={cn("px-2 pt-1 pb-0.5", showModelList && "mt-2")}>
            <Typography.Text className="text-[11px] font-medium text-[var(--oh-text-dim)] uppercase tracking-wide leading-4">
              {t(I18nKey.SETTINGS$AVAILABLE_PROFILES)}
            </Typography.Text>
          </li>
          {profiles.map((profile) => {
            const isCurrent = profile.name === currentProfileName;
            const displayModel = formatModelNameForDisplay(profile.model);
            return (
              <ContextMenuListItem
                key={profile.name}
                testId={`chat-input-llm-profile-option-${profile.name}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (isCurrent) {
                    onClose();
                    return;
                  }
                  handleSelect(profile.name);
                }}
                className={cn(
                  "flex flex-col items-stretch gap-0.5",
                  isCurrent && "bg-[var(--oh-interactive-hover)]",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="flex-1 truncate text-sm leading-5"
                    title={profile.model ?? profile.name}
                  >
                    {profile.name}
                  </span>
                  {isCurrent && (
                    <CheckIcon
                      width={14}
                      height={14}
                      className="shrink-0"
                      aria-hidden
                    />
                  )}
                </span>
                {displayModel && (
                  <span className="block truncate text-xs leading-4 text-[var(--oh-muted)]">
                    {displayModel}
                  </span>
                )}
              </ContextMenuListItem>
            );
          })}
        </>
      )}
      {readOnlyProfileName && (
        <li className="text-sm" data-testid="chat-input-llm-profile-current">
          <div className="flex flex-col gap-0.5 p-2 leading-5 text-[var(--oh-foreground)]">
            <span className="truncate" title={readOnlyProfileName}>
              {readOnlyProfileName}
            </span>
            {currentProfileModel && (
              <span className="truncate text-xs leading-4 text-[var(--oh-muted)]">
                {formatModelNameForDisplay(currentProfileModel)}
              </span>
            )}
          </div>
        </li>
      )}
      {(showProfileList || readOnlyProfileName) && (
        <Divider inset={dividerInset} />
      )}
      <li className="text-sm">
        <NavigationLink
          to="/settings/llm"
          onClick={onClose}
          className={cn(
            "flex h-[30px] items-center gap-2 rounded p-2 leading-5 text-[var(--oh-foreground)] hover:bg-[var(--oh-interactive-hover)] transition-colors",
            settingsLinkClassName,
          )}
        >
          <SettingsGearIcon
            width={16}
            height={16}
            className={cn("shrink-0", settingsIconClassName)}
            aria-hidden
          />
          <span>{t(I18nKey.SETTINGS$LLM_PROFILES)}</span>
        </NavigationLink>
      </li>
    </>
  );
}

export function ChatInputLlmProfilePicker() {
  const { t } = useTranslation("openhands");
  const { profiles, currentProfileName, currentProfileModel, isLoading, isSwitching } =
    useChatInputLlmProfileState();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = useClickOutsideElement<HTMLUListElement>(
    () => setIsPopoverOpen(false),
    triggerRef,
  );

  // No LLM profiles yet (or the agent-server lacks the surface): stay out of
  // the way, exactly like the ACP/AgentProfile pickers.
  if (isLoading || profiles.length === 0) {
    return null;
  }

  const displayModel = currentProfileModel?.split('/').pop();
  const label = displayModel || currentProfileName || t(I18nKey.LLM$SELECT_MODEL_PLACEHOLDER);

  return (
      <Popover
        isOpen={isPopoverOpen}
        onOpenChange={setIsPopoverOpen}
        placement="top-start"
        offset={8}
        classNames={{
          content: "p-0 bg-transparent border-0 shadow-none",
        }}
      >
        <PopoverTrigger>
          <button
            ref={triggerRef}
            type="button"
            className={cn(chatInputPillButtonClassName, "max-w-[200px]")}
            title={currentProfileName ?? undefined}
            data-testid="chat-input-llm-profile"
            aria-expanded={isPopoverOpen}
            aria-haspopup="dialog"
            disabled={isSwitching}
            aria-busy={isSwitching}
          >
            <span className="truncate">{truncateLabel(label)}</span>
            <ComboboxCaretInline isOpen={isPopoverOpen} />
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <ContextMenu
            testId="chat-input-llm-profile-popover"
            theme="popover"
            className="min-w-[200px] max-w-[320px] max-h-[300px] overflow-y-auto custom-scrollbar-always"
          >
            <ChatInputLlmProfileMenuContent
              onClose={() => setIsPopoverOpen(false)}
            />
          </ContextMenu>
        </PopoverContent>
      </Popover>
  );
}
