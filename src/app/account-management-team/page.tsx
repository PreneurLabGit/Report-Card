import Link from "next/link";

import styles from "./page.module.css";

const teamMembers = [
  {
    name: "Bianca Myers",
    email: "bianca.myers@ilovesalt.com",
    role: "business_owner",
    businessOwner: "JL, Bianca Myers, Test owner",
    client: "",
    superAdmin: "Jay Shah",
    department: "Account Management",
    jobTitle: "",
    status: "Active",
  },
  {
    name: "MD Sohanur Rahman Abir",
    email: "test.abri@xho.to",
    role: "project_lead",
    businessOwner: "Raihan",
    client:
      "Bell Canada, Carbon60 Operating Co. LTD, Coca - Cola Ltd., Holman, Shopify, Luxe Brands Inc., Adidas Canada Limited",
    superAdmin: "Arif Nezami",
    department: "Account Management, Content, Creative, Creator, Design",
    jobTitle: "Production Manager",
    status: "Active",
  },
  {
    name: "Nadeem",
    email: "nadeem.syed@nectarfirst.com",
    role: "super_admin",
    businessOwner: "",
    client: "",
    superAdmin: "Arif Nezami",
    department: "Account Management",
    jobTitle: "",
    status: "Active",
  },
  {
    name: "New Team Member",
    email: "member2@xho.to",
    role: "team_member",
    businessOwner: "Test owner",
    client:
      "Bell Canada, Carbon60 Operating Co. LTD, Coca - Cola Ltd., Cutwater Spirits, LLC, Astrazeneca Canada Inc., Anheuser-Busch, LLC, Daisy Co",
    superAdmin: "Raihan",
    department: "Digital, Design, Creator, Creative, Account Management",
    jobTitle: "3D Designer",
    status: "Active",
  },
  {
    name: "Raihan",
    email: "raihan@xho.to",
    role: "super_admin",
    businessOwner: "Bianca Myers",
    client: "",
    superAdmin: "Raihan",
    department: "Account Management, Digital, Design, Creative, Content, Creator, Kitchen",
    jobTitle: "Production Executive",
    status: "Active",
  },
  {
    name: "Raihan Khan",
    email: "raihan.khan@xho.to",
    role: "project_lead",
    businessOwner: "Test owner",
    client: "Bell Canada, Coca - Cola Ltd., Adidas Canada Limited, FIFA Canada",
    superAdmin: "Arif Nezami",
    department: "Account Management, Content, Creative, Creator, Design, Digital, Kitchen, Media",
    jobTitle: "Production Manager",
    status: "Active",
  },
  {
    name: "Salt Dev",
    email: "new@devspin.online",
    role: "super_admin",
    businessOwner: "Test owner",
    client:
      "Adidas America, Inc., Adidas Canada Limited, Anheuser-Busch, LLC, Astrazeneca Canada Inc., Bell Canada, plus unresolved client IDs in claims",
    superAdmin: "Arif Nezami",
    department: "Account Management",
    jobTitle: "",
    status: "Active",
  },
  {
    name: "Shane Deen",
    email: "shane.deen@ilovesalt.com",
    role: "super_admin",
    businessOwner: "Bianca Myers, JL, Test owner",
    client: "",
    superAdmin: "Arif Nezami",
    department: "Account Management",
    jobTitle: "Production Executive",
    status: "Active",
  },
  {
    name: "Test Lead",
    email: "test.lead@xho.to",
    role: "project_lead",
    businessOwner: "Test owner",
    client:
      "Adidas Canada Limited, Anheuser-Busch, LLC, Bell Canada, Coca - Cola Ltd., FIFA Canada, Lindt & Sprungli, Lead Aggregate: 4a9487c8-2775-4a4b-8fc8-0c5da5040042, Luxe Brands Inc.",
    superAdmin: "Arif Nezami",
    department: "Account Management",
    jobTitle: "Account Executive",
    status: "Active",
  },
  {
    name: "Test owner",
    email: "test.owner@xho.to",
    role: "business_owner",
    businessOwner: "Test owner",
    client:
      "Bell Canada, Carbon60 Operating Co. LTD, Coca - Cola Ltd., Anheuser-Busch, LLC, Adidas America, Inc., Adidas Canada Limited, FIFA Canada, Ferrara Candy Company, Hershey Canada Inc., Flora Food US Inc., Holman - USD, Holman",
    superAdmin: "Raihan",
    department: "Account Management",
    jobTitle: "Copywriter",
    status: "Active",
  },
  {
    name: "Test User Upload2",
    email: "test2@xho.to",
    role: "team_member",
    businessOwner: "JL",
    client: "",
    superAdmin: "Arif Nezami",
    department: "Account Management",
    jobTitle: "Vice President",
    status: "Active",
  },
] as const;

export default function AccountManagementTeamPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>Account Management Team</p>
            <h1>Team directory and responsibility overview</h1>
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

        <section className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Business Owner</th>
                  <th>Client</th>
                  <th>Super Admin</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.email}>
                    <td className={styles.nameCell}>{member.name}</td>
                    <td>{member.email}</td>
                    <td>{member.role}</td>
                    <td>{member.businessOwner || "-"}</td>
                    <td>{member.client || "-"}</td>
                    <td>{member.superAdmin}</td>
                    <td>{member.department}</td>
                    <td>{member.jobTitle || "-"}</td>
                    <td>
                      <span className={styles.statusPill}>{member.status}</span>
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
}
