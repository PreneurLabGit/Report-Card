import type { DirectoryUser, OrganizationTreeResponse } from "@/lib/domain";

const ACCOUNT_MANAGEMENT_DEPARTMENT = "Account Management";

export function flattenOrganizationTree(response: OrganizationTreeResponse) {
  const directory = new Map<string, DirectoryUser>();

  for (const superAdmin of response.superAdmins) {
    directory.set(superAdmin.userId, {
      userId: superAdmin.userId,
      userName: superAdmin.userName,
      email: superAdmin.email,
      role: superAdmin.role,
      department: superAdmin.department,
      disabled: superAdmin.disabled,
      superAdminId: superAdmin.userId,
      businessOwnerId: null,
      managerUserId: null,
    });

    for (const businessOwner of superAdmin.businessOwners) {
      directory.set(businessOwner.userId, {
        userId: businessOwner.userId,
        userName: businessOwner.userName,
        email: businessOwner.email,
        role: businessOwner.role,
        department: businessOwner.department,
        disabled: businessOwner.disabled,
        superAdminId: superAdmin.userId,
        businessOwnerId: businessOwner.userId,
        managerUserId: superAdmin.userId,
      });

      for (const teamMember of businessOwner.teamMembers) {
        directory.set(teamMember.userId, {
          userId: teamMember.userId,
          userName: teamMember.userName,
          email: teamMember.email,
          role: teamMember.role,
          department: teamMember.department,
          disabled: teamMember.disabled,
          superAdminId: superAdmin.userId,
          businessOwnerId: businessOwner.userId,
          managerUserId: businessOwner.userId,
        });
      }
    }
  }

  return directory;
}

export function getAccountManagementDirectory(response: OrganizationTreeResponse) {
  const users = Array.from(flattenOrganizationTree(response).values());
  const eligibleTeamMembers = users.filter(
    (user) =>
      ["team_member", "project_lead", "freelancer", "contributor", "department_owner"].includes(user.role ?? "") &&
      user.department === ACCOUNT_MANAGEMENT_DEPARTMENT,
  );
  const eligibleBusinessOwnerIds = new Set(
    eligibleTeamMembers.map((user) => user.managerUserId).filter((value): value is string => Boolean(value)),
  );
  const eligibleSuperAdminIds = new Set(
    users
      .filter(
        (user) =>
          user.role === "business_owner" &&
          (user.department === ACCOUNT_MANAGEMENT_DEPARTMENT || eligibleBusinessOwnerIds.has(user.userId)),
      )
      .map((user) => user.managerUserId)
      .filter((value): value is string => Boolean(value)),
  );

  return users
    .filter((user) => {
      if (
        ["team_member", "project_lead", "freelancer", "contributor", "department_owner"].includes(user.role ?? "")
      ) {
        return user.department === ACCOUNT_MANAGEMENT_DEPARTMENT;
      }

      if (user.role === "business_owner") {
        return user.department === ACCOUNT_MANAGEMENT_DEPARTMENT || eligibleBusinessOwnerIds.has(user.userId);
      }

      if (user.role === "super_admin") {
        return user.department === ACCOUNT_MANAGEMENT_DEPARTMENT || eligibleSuperAdminIds.has(user.userId);
      }

      return false;
    })
    .sort((left, right) => left.userName.localeCompare(right.userName));
}
