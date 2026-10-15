// import bcrypt from 'bcryptjs';
// import { db } from '../lib/db';
// import Organization from '../models/Organization';
// import User from '../models/User';
// import Program from '../models/Program';
// import Session from '../models/Session';
// import Material from '../models/Material';
// import Assignment from '../models/Assignment';
// import Submission from '../models/Submission';
// import Query from '../models/Query';
// import QueryMessage from '../models/QueryMessage';
// import Notification from '../models/Notification';

// function hoursFromNow(h: number): Date {
//   return new Date(Date.now() + h * 3600 * 1000);
// }

// async function hash(pw: string) {
//   return bcrypt.hash(pw, 10);
// }

// async function run() {
//   await db();
//   console.log('Connected. Seeding…\n');

//   // ---- Clean slate for seeded entities ----
//   await Promise.all([
//     Notification.deleteMany({}),
//     QueryMessage.deleteMany({}),
//     Query.deleteMany({}),
//     Submission.deleteMany({}),
//     Assignment.deleteMany({}),
//     Material.deleteMany({}),
//     Session.deleteMany({}),
//     Program.deleteMany({}),
//     User.deleteMany({}),
//     Organization.deleteMany({}),
//   ]);
//   console.log('Cleared existing data.');

//   // ---- Org ----
//   const org = await Organization.create({
//     name: 'Acme Institute',
//     slug: 'acme',
//     status: 'active',
//   });
//   console.log('Created org:', org.name);

//   // ---- Users ----
//   const pw = await hash('password123');

//   const admin = await User.create({
//     orgId: org._id,
//     name: 'Amelia Admin',
//     email: 'admin@lms.dev',
//     passwordHash: pw,
//     role: 'admin',
//     status: 'active',
//   });

//   const mentorA = await User.create({
//     orgId: org._id,
//     name: 'Marco Mentor',
//     email: 'mentor@lms.dev',
//     passwordHash: pw,
//     role: 'mentor',
//     status: 'active',
//   });

//   const mentorB = await User.create({
//     orgId: org._id,
//     name: 'Priya Mentor',
//     email: 'priya@lms.dev',
//     passwordHash: pw,
//     role: 'mentor',
//     status: 'active',
//   });

//   const studentA = await User.create({
//     orgId: org._id,
//     name: 'Sam Student',
//     email: 'student@lms.dev',
//     passwordHash: pw,
//     role: 'student',
//     status: 'active',
//   });

//   const studentB = await User.create({
//     orgId: org._id,
//     name: 'Rina River',
//     email: 'rina@lms.dev',
//     passwordHash: pw,
//     role: 'student',
//     status: 'active',
//   });

//   const studentC = await User.create({
//     orgId: org._id,
//     name: 'Tomas Tran',
//     email: 'tomas@lms.dev',
//     passwordHash: pw,
//     role: 'student',
//     status: 'active',
//   });

//   const studentD = await User.create({
//     orgId: org._id,
//     name: 'Zoe Zhang',
//     email: 'zoe@lms.dev',
//     passwordHash: pw,
//     role: 'student',
//     status: 'active',
//   });

//   console.log('Created users.');

//   // ---- Programs ----
//   const webDev = await Program.create({
//     orgId: org._id,
//     name: 'Web Development Bootcamp',
//     description:
//       'Full-stack fundamentals: HTML, CSS, JavaScript, React, Node, MongoDB.',
//     status: 'active',
//     startDate: hoursFromNow(-24 * 14),
//     endDate: hoursFromNow(24 * 30),
//     mentors: [mentorA._id],
//     students: [studentA._id, studentB._id],
//     createdBy: admin._id,
//   });

//   const dataSci = await Program.create({
//     orgId: org._id,
//     name: 'Data Science Foundations',
//     description:
//       'Python, pandas, statistics, ML basics, and a capstone project.',
//     status: 'active',
//     startDate: hoursFromNow(-24 * 7),
//     endDate: hoursFromNow(24 * 45),
//     mentors: [mentorB._id],
//     students: [studentC._id, studentD._id],
//     createdBy: admin._id,
//   });

//   console.log('Created programs.');

//   // Sync user.programIds
//   await User.updateOne({ _id: studentA._id }, { $set: { programIds: [webDev._id] } });
//   await User.updateOne({ _id: studentB._id }, { $set: { programIds: [webDev._id] } });
//   await User.updateOne({ _id: studentC._id }, { $set: { programIds: [dataSci._id] } });
//   await User.updateOne({ _id: studentD._id }, { $set: { programIds: [dataSci._id] } });
//   await User.updateOne({ _id: mentorA._id }, { $set: { programIds: [webDev._id] } });
//   await User.updateOne({ _id: mentorB._id }, { $set: { programIds: [dataSci._id] } });

//   // ---- Sessions ----
//   const s1 = await Session.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'Intro to the Web',
//     agenda:
//       'How the web works. HTTP, DNS, clients & servers.\n\nRead: MDN — How the web works.',
//     mentorId: mentorA._id,
//     startsAt: hoursFromNow(-24 * 7),
//     endsAt: hoursFromNow(-24 * 7 + 2),
//     status: 'completed',
//     recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
//     createdBy: mentorA._id,
//   });

//   const s2 = await Session.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'CSS Layout Deep Dive',
//     agenda:
//       'Flexbox vs Grid. When to use what.\n\nBring a layout screenshot you want to rebuild.',
//     mentorId: mentorA._id,
//     startsAt: hoursFromNow(24),
//     endsAt: hoursFromNow(26),
//     meetingUrl: 'https://meet.google.com/abc-defg-hij',
//     status: 'scheduled',
//     createdBy: mentorA._id,
//   });

//   const s3 = await Session.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'JavaScript Fundamentals',
//     agenda: 'Variables, functions, arrays, objects, closures.',
//     mentorId: mentorA._id,
//     startsAt: hoursFromNow(24 * 3),
//     endsAt: hoursFromNow(24 * 3 + 2),
//     meetingUrl: 'https://meet.google.com/klm-nopq-rst',
//     status: 'scheduled',
//     createdBy: mentorA._id,
//   });

//   const s4 = await Session.create({
//     orgId: org._id,
//     programId: dataSci._id,
//     title: 'Python & pandas Kickoff',
//     agenda: 'Setting up Jupyter. Loading CSVs. Basic DataFrame operations.',
//     mentorId: mentorB._id,
//     startsAt: hoursFromNow(24 * 2),
//     endsAt: hoursFromNow(24 * 2 + 2),
//     meetingUrl: 'https://meet.google.com/xyz-uvwx-123',
//     status: 'scheduled',
//     createdBy: mentorB._id,
//   });

//   console.log('Created sessions.');

//   // ---- Materials ----
//   await Material.create([
//     {
//       orgId: org._id,
//       sessionId: s1._id,
//       programId: webDev._id,
//       title: 'Session 1 — Slides',
//       description: 'Intro deck covering HTTP, DNS, and the request lifecycle.',
//       kind: 'slide',
//       url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//       publicId: '',
//       resourceType: 'raw',
//       format: 'pdf',
//       size: 13264,
//       originalName: 'intro-slides.pdf',
//       uploadedBy: mentorA._id,
//     },
//     {
//       orgId: org._id,
//       sessionId: s1._id,
//       programId: webDev._id,
//       title: 'MDN — How the web works',
//       description: 'External reading.',
//       kind: 'link',
//       url: 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works',
//       uploadedBy: mentorA._id,
//     },
//     {
//       orgId: org._id,
//       sessionId: s4._id,
//       programId: dataSci._id,
//       title: 'pandas Cheat Sheet',
//       kind: 'doc',
//       url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//       publicId: '',
//       resourceType: 'raw',
//       format: 'pdf',
//       size: 13264,
//       originalName: 'pandas-cheatsheet.pdf',
//       uploadedBy: mentorB._id,
//     },
//   ]);

//   console.log('Created materials.');

//   // ---- Assignments ----
//   // 1. Overdue, submitted, graded
//   const a1 = await Assignment.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'Build a personal landing page',
//     description:
//       'Single-page HTML + CSS. Must include a nav bar, hero section, and a footer.\n\nSubmit as a ZIP.',
//     dueAt: hoursFromNow(-24 * 3),
//     maxMarks: 100,
//     allowLate: true,
//     createdBy: mentorA._id,
//   });

//   // 2. Due in 20h, one student already submitted, other pending
//   const a2 = await Assignment.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'Recreate a layout from a screenshot',
//     description:
//       'Pick any landing page you like. Recreate the layout with Flexbox or Grid.',
//     dueAt: hoursFromNow(20),
//     maxMarks: 50,
//     allowLate: true,
//     createdBy: mentorA._id,
//   });

//   // 3. Due in 5 days, no submissions
//   const a3 = await Assignment.create({
//     orgId: org._id,
//     programId: webDev._id,
//     title: 'JavaScript array exercises',
//     description: 'Complete the 10 exercises in the attached PDF.',
//     dueAt: hoursFromNow(24 * 5),
//     maxMarks: 30,
//     allowLate: false,
//     createdBy: mentorA._id,
//   });

//   // 4. Data science assignment
//   const a4 = await Assignment.create({
//     orgId: org._id,
//     programId: dataSci._id,
//     title: 'Explore the Titanic dataset',
//     description:
//       'Load the Titanic CSV with pandas. Produce 5 insights with code + short explanation.',
//     dueAt: hoursFromNow(24 * 2),
//     maxMarks: 40,
//     allowLate: true,
//     createdBy: mentorB._id,
//   });

//   console.log('Created assignments.');

//   // ---- Submissions ----
//   // a1: both students submitted; A graded, B not graded
//   await Submission.create({
//     orgId: org._id,
//     assignmentId: a1._id,
//     studentId: studentA._id,
//     text: 'Here is my landing page. I went with a dark hero and a light body.',
//     attachments: [
//       {
//         url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
//         publicId: '',
//         resourceType: 'raw',
//         format: 'pdf',
//         size: 13264,
//         originalName: 'sam-landing.zip',
//       },
//     ],
//     submittedAt: hoursFromNow(-24 * 4),
//     marks: 88,
//     feedback:
//       'Nice contrast and typography. Watch spacing on the nav — it felt slightly tight on mobile. Solid work overall.',
//     gradedAt: hoursFromNow(-24 * 3 - 2),
//     gradedBy: mentorA._id,
//   });

//   await Submission.create({
//     orgId: org._id,
//     assignmentId: a1._id,
//     studentId: studentB._id,
//     text: 'I made a landing page for a fictional coffee shop. Feedback welcome!',
//     attachments: [],
//     submittedAt: hoursFromNow(-24 * 3 - 1),
//   });

//   // a2: student B submitted already, student A pending
//   await Submission.create({
//     orgId: org._id,
//     assignmentId: a2._id,
//     studentId: studentB._id,
//     text: 'Recreated the Stripe pricing page. Used CSS Grid for the cards.',
//     attachments: [],
//     submittedAt: hoursFromNow(-3),
//   });

//   // a4: Zoe submitted, Tomas pending
//   await Submission.create({
//     orgId: org._id,
//     assignmentId: a4._id,
//     studentId: studentD._id,
//     text: 'Wrote 6 insights. Biggest surprise was how strongly Pclass correlates with survival.',
//     attachments: [],
//     submittedAt: hoursFromNow(-12),
//   });

//   console.log('Created submissions.');

//   // ---- Queries ----
//   const q1 = await Query.create({
//     orgId: org._id,
//     programId: webDev._id,
//     sessionId: s2._id,
//     studentId: studentA._id,
//     subject: 'Confused about when to use Grid vs Flex',
//     status: 'open',
//     lastMessageAt: hoursFromNow(-5),
//     messageCount: 3,
//   });

//   await QueryMessage.create([
//     {
//       orgId: org._id,
//       queryId: q1._id,
//       senderId: studentA._id,
//       body: "I get that Grid is 2D and Flex is 1D, but in practice I keep reaching for Grid even for simple rows. Is that fine or should I force myself to use Flex?",
//       attachments: [],
//     },
//     {
//       orgId: org._id,
//       queryId: q1._id,
//       senderId: mentorA._id,
//       body: "Totally fine, but there's a heuristic: if you could describe it as 'a row of things', Flex. If it's 'a layout with rows and columns', Grid. Start with Flex for horizontal navs, button rows, and card rows. Grid for whole-page layouts.",
//       attachments: [],
//     },
//     {
//       orgId: org._id,
//       queryId: q1._id,
//       senderId: studentA._id,
//       body: "That heuristic is exactly what I needed, thanks. I'll try it on the next exercise.",
//       attachments: [],
//     },
//   ]);
//   await Query.updateOne(
//     { _id: q1._id },
//     { $set: { assignedMentorId: mentorA._id } }
//   );

//   const q2 = await Query.create({
//     orgId: org._id,
//     programId: dataSci._id,
//     studentId: studentD._id,
//     subject: 'pandas read_csv is slow on my machine',
//     status: 'open',
//     lastMessageAt: hoursFromNow(-30),
//     messageCount: 1,
//   });

//   await QueryMessage.create({
//     orgId: org._id,
//     queryId: q2._id,
//     senderId: studentD._id,
//     body: 'The Titanic CSV loads fine but a bigger file took 40 seconds. Any tips?',
//     attachments: [],
//   });

//   const q3 = await Query.create({
//     orgId: org._id,
//     programId: webDev._id,
//     studentId: studentB._id,
//     subject: 'Which formatter do you recommend for VS Code?',
//     status: 'resolved',
//     lastMessageAt: hoursFromNow(-24 * 5),
//     messageCount: 2,
//   });

//   await QueryMessage.create([
//     {
//       orgId: org._id,
//       queryId: q3._id,
//       senderId: studentB._id,
//       body: 'Prettier or ESLint? Or both?',
//       attachments: [],
//     },
//     {
//       orgId: org._id,
//       queryId: q3._id,
//       senderId: mentorA._id,
//       body: 'Both. Prettier handles formatting, ESLint handles logic/style rules. Install the ESLint + Prettier VS Code extensions and set format-on-save to Prettier.',
//       attachments: [],
//     },
//   ]);

//   console.log('Created queries.\n');

//   // ---- Summary ----
//   console.log('========================================');
//   console.log('  Login credentials (all password123)');
//   console.log('========================================');
//   console.log('  admin@lms.dev    → admin');
//   console.log('  mentor@lms.dev   → mentor (Web Dev)');
//   console.log('  priya@lms.dev    → mentor (Data Science)');
//   console.log('  student@lms.dev  → student (Web Dev)');
//   console.log('  rina@lms.dev     → student (Web Dev)');
//   console.log('  tomas@lms.dev    → student (Data Science)');
//   console.log('  zoe@lms.dev      → student (Data Science)');
//   console.log('========================================\n');
//   console.log('Seed complete.');
//   process.exit(0);
// }

// run().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });



import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import User from '../models/User';

async function run() {
  await db();
  console.log('Connected to database.');

  const email = 'muhammadabdullahkhaver@gmail.com';

  // Avoid creating a duplicate user
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await User.create({
    name: 'Muhammad Abdullah Khaver',
    email,
    passwordHash,
    role: 'admin',
    status: 'active',
  });

  console.log('User created successfully:');
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Default password: password123');

  process.exit(0);
}

run().catch((error) => {
  console.error('Failed to create user:', error);
  process.exit(1);
});