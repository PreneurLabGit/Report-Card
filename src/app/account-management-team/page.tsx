import Link from "next/link";

import { fetchOrganizationTree, SaltHubApiError } from "@/lib/salthub-api";
import { getAccountManagementDirectory } from "@/lib/organization-tree";

import styles from "./page.module.css";

interface AccountManagementMemberRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  businessOwner: string;
  superAdmin: string;
  department: string;
  status: string;
}

function formatRole(role: string | null) {
  if (!role) {
    return "Unknown";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function getAccountManagementPageData() {
  const response = await fetchOrganizationTree();
  const users = getAccountManagementDirectory(response);
  const byId = new Map(users.map((user) => [user.userId, user]));

  const rows: AccountManagementMemberRow[] = users.map((user) => ({
    userId: user.userId,
    name: user.userName,
    email: user.email ?? "Unavailable",
    role: formatRole(user.role),
    businessOwner: user.businessOwnerId ? byId.get(user.businessOwnerId)?.userName ?? "Outside Account Management" : "-",
    superAdmin: user.superAdminId ? byId.get(user.superAdminId)?.userName ?? "Outside Account Management" : "-",
    department: user.department ?? "Unavailable",
    status: user.disabled ? "Disabled" : "Active",
  }));

  const summary = {
    totalMembers: rows.length,
    superAdmins: rows.filter((row) => row.role === "Super Admin").length,
    businessOwners: rows.filter((row) => row.role === "Business Owner").length,
    accountManagementUsers: rows.filter(
      (row) => !["Super Admin", "Business Owner"].includes(row.role),
    ).length,
  };

  return { rows, summary };
}

export default async function AccountManagementTeamPage() {
  try {
    const { rows, summary } = await getAccountManagementPageData();

    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.hero}>
            <div>
              <p className={styles.kicker}>Account Management Team</p>
              <h1>Live Account Management directory</h1>
              <p className={styles.subcopy}>Eligible Account Management users are sourced from the live hierarchy, along with their reporting business owners and super admins.</p>
            </div>
            <div className={styles.actions}>
              <Link href="/good-to-know" className={styles.secondaryButton}>
                Good to know
              </Link>
              <Link href="/" className={styles.backButton}>
                Back to app
              </Link>
            </div>
          </header>

          <section className={styles.summaryGrid}>
            <article className={styles.summaryCard}>
              <span>Directory users</span>
              <strong>{summary.totalMembers}</strong>
            </article>
            <article className={styles.summaryCard}>
              <span>Super admins</span>
              <strong>{summary.superAdmins}</strong>
            </article>
            <article className={styles.summaryCard}>
              <span>Business owners</span>
              <strong>{summary.businessOwners}</strong>
            </article>
            <article className={styles.summaryCard}>
              <span>AM users</span>
              <strong>{summary.accountManagementUsers}</strong>
            </article>
          </section>

          <section className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Business Owner</th>
                    <th>Super Admin</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((member) => (
                    <tr key={member.userId}>
                      <td className={styles.nameCell}>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.role}</td>
                      <td>{member.businessOwner}</td>
                      <td>{member.superAdmin}</td>
                      <td>{member.department}</td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            member.status === "Disabled" ? styles.statusDisabled : styles.statusActive
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof SaltHubApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "The Account Management directory could not be loaded.";

    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.hero}>
            <div>
              <p className={styles.kicker}>Account Management Team</p>
              <h1>Live Account Management directory</h1>
              <p className={styles.subcopy}>The page is configured for live API data, but the directory request failed.</p>
            </div>
            <div className={styles.actions}>
              <Link href="/good-to-know" className={styles.secondaryButton}>
                Good to know
              </Link>
              <Link href="/" className={styles.backButton}>
                Back to app
              </Link>
            </div>
          </header>

          <section className={styles.errorCard}>
            <strong>Unable to load Account Management users</strong>
            <p>{message}</p>
          </section>
        </div>
      </main>
    );
  }
}
