"use client";

import { errorText } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface UserInfo {
  id: string;
  fullName: string | null;
  firstName: string | null;
  imageUrl: string;
}

export function useWorkspace(
  user: UserInfo | null | undefined,
  errors: Record<string, string>,
) {
  const userId = user?.id;
  const ownedWorkspace = useQuery(
    api.workspaces.getOwned,
    userId ? {} : "skip",
  );

  // When user is not an owner, check if they're a member of someone else's workspace
  const memberWorkspaces = useQuery(
    api.workspaces.getMemberships,
    ownedWorkspace === null && userId ? {} : "skip",
  );

  // Use owned workspace first, then first membership workspace
  const effectiveWorkspace = ownedWorkspace ?? memberWorkspaces?.[0] ?? null;

  const createWorkspace = useMutation(api.workspaces.create);
  const updateWorkspace = useMutation(api.workspaces.update);
  const removeMember = useMutation(api.workspaces.removeMember);
  const cancelMeeting = useMutation(api.meetings.cancel);
  const updateMeetingStatus = useMutation(api.meetings.updateStatus);

  const members = useQuery(
    api.workspaces.getMembersByWorkspaceId,
    effectiveWorkspace?._id ? { workspaceId: effectiveWorkspace._id } : "skip",
  );

  const meetings = useQuery(
    api.workspaces.getMeetingsByWorkspaceId,
    effectiveWorkspace?._id ? { workspaceId: effectiveWorkspace._id } : "skip",
  );

  const personalMeetings = useQuery(
    api.meetings.listMine,
    userId ? {} : "skip",
  );

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Runs a mutation, mapping failures to a translated message. */
  const run = async (fn: () => Promise<unknown>, rethrow = false) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e, errors, errors.GENERIC));
      if (rethrow) throw e;
    }
  };

  const handleCreate = async (name: string, brandingColor?: string) => {
    if (!userId) return;
    setIsCreating(true);
    await run(() =>
      createWorkspace({
        name,
        brandingColor,
        displayName: user?.fullName ?? user?.firstName ?? undefined,
        imageUrl: user?.imageUrl ?? undefined,
      }),
    );
    setIsCreating(false);
  };

  const handleUpdate = (
    workspaceId: Id<"workspaces">,
    data: { name?: string; brandingColor?: string },
  ) => run(() => updateWorkspace({ workspaceId, ...data }));

  const handleRemoveMember = (
    workspaceId: Id<"workspaces">,
    memberId: Id<"workspaceMembers">,
  ) => run(() => removeMember({ workspaceId, memberId }));

  const handleCancelMeeting = (meetingId: string) =>
    run(() => cancelMeeting({ meetingId: meetingId as Id<"meetings"> }));

  const handleUpdateMeetingStatus = (
    meetingId: string,
    status: "active" | "completed" | "no_show",
  ) =>
    run(
      () =>
        updateMeetingStatus({ meetingId: meetingId as Id<"meetings">, status }),
      true,
    );

  const isLoading =
    !!userId &&
    (ownedWorkspace === undefined ||
      (ownedWorkspace === null && memberWorkspaces === undefined) ||
      personalMeetings === undefined ||
      (!!effectiveWorkspace &&
        (meetings === undefined || members === undefined)));

  return {
    workspace: effectiveWorkspace,
    isOwner: !!effectiveWorkspace && effectiveWorkspace.ownerId === userId,
    members: members ?? [],
    meetings: meetings ?? [],
    personalMeetings: personalMeetings ?? [],
    isLoading,
    isCreating,
    error,
    handleCreate,
    handleUpdate,
    handleRemoveMember,
    handleCancelMeeting,
    handleUpdateMeetingStatus,
  };
}
