import type { AudienceOption, NormalizedDataset } from "@/lib/domain";

export function buildAudienceOptions(dataset: NormalizedDataset): AudienceOption[] {
  const options: AudienceOption[] = dataset.userDirectory.map((user) => {
    const audience = user.role?.toLowerCase().includes("manager")
      ? "manager"
      : user.role?.toLowerCase().includes("leader")
        ? "leader"
        : "user";

    return {
      id: `${audience}:${user.id}`,
      audience,
      label: `${user.name} (${audience})`,
      subjectId: user.id,
    };
  });

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
