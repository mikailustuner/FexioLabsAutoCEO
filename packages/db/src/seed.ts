import { getDbClient } from "./client.js";
import {
  createEmployee,
  createProject,
  createTask,
  type EmployeeRole,
} from "./index.js";

async function seed() {
  const db = getDbClient();

  console.log("Seeding database...");

  // Create employees
  const employees = await Promise.all([
    createEmployee(db, {
      name: "Ahmet Yılmaz",
      role: "CEO" as EmployeeRole,
      email: "ahmet@fexiolabs.com",
      slackUserId: "U001",
      githubUsername: "ahmetyilmaz",
      workloadScore: 0.3,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Mehmet Demir",
      role: "CTO" as EmployeeRole,
      email: "mehmet@fexiolabs.com",
      slackUserId: "U002",
      githubUsername: "mehmetdemir",
      workloadScore: 0.5,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Ayşe Kaya",
      role: "PRODUCT_MANAGER" as EmployeeRole,
      email: "ayse@fexiolabs.com",
      slackUserId: "U003",
      workloadScore: 0.4,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Fatma Öz",
      role: "DEVELOPER" as EmployeeRole,
      email: "fatma@fexiolabs.com",
      slackUserId: "U004",
      githubUsername: "fatmaoz",
      workloadScore: 0.6,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Ali Çelik",
      role: "DEVELOPER" as EmployeeRole,
      email: "ali@fexiolabs.com",
      slackUserId: "U005",
      githubUsername: "alicelik",
      workloadScore: 0.5,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Zeynep Arslan",
      role: "DESIGNER" as EmployeeRole,
      email: "zeynep@fexiolabs.com",
      slackUserId: "U006",
      workloadScore: 0.4,
      isActive: true,
    }),
    createEmployee(db, {
      name: "Can Yıldız",
      role: "QA" as EmployeeRole,
      email: "can@fexiolabs.com",
      slackUserId: "U007",
      workloadScore: 0.3,
      isActive: true,
    }),
  ]);

  console.log(`Created ${employees.length} employees`);

  // Create a sample project
  const project = await createProject(db, {
    name: "Örnek Mobil Uygulama",
    description: "Kullanıcıların sosyal medya içeriklerini paylaşabileceği bir mobil uygulama",
    status: "ACTIVE",
    priority: 7,
  });

  console.log(`Created project: ${project.name}`);

  // Create sample tasks
  const tasks = await Promise.all([
    createTask(db, {
      title: "Kullanıcı kayıt sistemi",
      description: "Email ve şifre ile kayıt özelliği",
      status: "DONE",
      project: { connect: { id: project.id } },
      assignee: { connect: { id: employees[3].id } }, // Fatma
      estimateHours: 16,
      actualHours: 14,
    }),
    createTask(db, {
      title: "Ana sayfa tasarımı",
      description: "Dashboard UI/UX tasarımı",
      status: "IN_PROGRESS",
      project: { connect: { id: project.id } },
      assignee: { connect: { id: employees[5].id } }, // Zeynep
      estimateHours: 24,
    }),
    createTask(db, {
      title: "Backend API geliştirme",
      description: "RESTful API endpoints",
      status: "IN_PROGRESS",
      project: { connect: { id: project.id } },
      assignee: { connect: { id: employees[4].id } }, // Ali
      estimateHours: 32,
    }),
    createTask(db, {
      title: "Test yazımı",
      description: "Unit ve integration testleri",
      status: "TODO",
      project: { connect: { id: project.id } },
      assignee: { connect: { id: employees[6].id } }, // Can
      estimateHours: 16,
    }),
  ]);

  console.log(`Created ${tasks.length} tasks`);

  console.log("Seeding completed!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const db = getDbClient();
    await db.$disconnect();
  });

