import type { DirectoryUser, OrganizationTreeResponse } from "@/lib/domain";

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
  return Array.from(flattenOrganizationTree(response).values())
    .filter((user) => user.department === "Account Management")
    .sort((left, right) => left.userName.localeCompare(right.userName));
}
