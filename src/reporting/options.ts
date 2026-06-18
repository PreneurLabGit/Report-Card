import type { AudienceOption, NormalizedDataset } from "@/lib/domain";

export function buildAudienceOptions(dataset: NormalizedDataset): AudienceOption[] {
  const options: AudienceOption[] = dataset.userDirectory.map((user) => {
    const managerNote = dataset.frictionNotes.find((note) => note.managerEmail.toLowerCase() === user.email.toLowerCase());
    const leaderNote = dataset.frictionNotes.find((note) => note.leaderName.toLowerCase() === user.name.toLowerCase());
    const audience = user.role?.toLowerCase().includes("manager")
      ? "manager"
      : user.role?.toLowerCase().includes("leader")
        ? "leader"
        : "user";

    return {
      id: `${audience}:${audience === "manager" ? managerNote?.managerId ?? user.id : audience === "leader" ? leaderNote?.leaderId ?? user.id : user.id}`,
      audience,
      label: `${user.name} (${audience})`,
      subjectId:
        audience === "manager"
          ? managerNote?.managerId ?? user.id
          : audience === "leader"
            ? leaderNote?.leaderId ?? user.id
            : user.id,
    };
  });

  for (const [managerId, notes] of Object.entries(dataset.frictionRollups.byManagerId)) {
    if (!options.some((option) => option.audience === "manager" && option.subjectId === managerId)) {
      options.push({
        id: `manager:${managerId}`,
        audience: "manager",
        label: `${notes[0]?.managerName ?? managerId} (manager)`,
        subjectId: managerId,
      });
    }
  }

  for (const [leaderId, notes] of Object.entries(dataset.frictionRollups.byLeaderId)) {
    if (!options.some((option) => option.audience === "leader" && option.subjectId === leaderId)) {
      options.push({
        id: `leader:${leaderId}`,
        audience: "leader",
        label: `${notes[0]?.leaderName ?? leaderId} (leader)`,
        subjectId: leaderId,
      });
    }
  }

  options.push(
    ...dataset.departmentRollups.map((department) => ({
      id: `departmentLead:${department.id}`,
      audience: "departmentLead" as const,
      label: `${department.department} department`,
      subjectId: department.id,
    })),
  );

  options.push({
    id: "elt:enterprise",
    audience: "elt",
    label: "Enterprise leadership team",
    subjectId: "enterprise",
  });

  return options;
}
