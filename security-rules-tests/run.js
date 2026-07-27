/**
 * Security rules test suite for firestore.rules + storage.rules.
 *
 * Runs against the LOCAL Firebase emulator (never touches production). Start the
 * emulator first, then run this script:
 *
 *   firebase emulators:exec --only firestore,storage "node security-rules-tests/run.js"
 *
 * (emulators:exec starts the emulator, waits for it to be ready, runs the command,
 * then shuts the emulator down — no manual start/stop needed.)
 *
 * Every test is either "must succeed" or "must fail" (permission-denied). A test that
 * behaves the opposite way is a real bug in firestore.rules / storage.rules — either a
 * data leak (something that should be blocked isn't) or a functionality break
 * (something the real app needs to do is being blocked).
 */

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} = require("firebase/firestore");
const {
  ref,
  uploadBytes,
  getBytes,
} = require("firebase/storage");

const ROOT = path.join(__dirname, "..");

let pass = 0;
let fail = 0;
let skipped = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e.message });
    console.log(`FAIL  ${name}`);
    console.log(`        ${e.message.split("\n")[0]}`);
  }
}

// Use for assertions that the LOCAL emulator can't reliably verify, so the report is
// honest about what was and wasn't actually checked (instead of silently deleting them).
function skip(name, reason) {
  skipped++;
  console.log(`skip  ${name}`);
  console.log(`        ${reason}`);
}

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId: "quickcrew-rules-test",
    firestore: {
      rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: fs.readFileSync(path.join(ROOT, "storage.rules"), "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });

  // -----------------------------------------------------------------------------
  // FIXTURES — seeded with rules disabled, exactly like real data would look.
  // -----------------------------------------------------------------------------
  //   orgA: employer1 (approved), employerPending (pending) — owns jobA1
  //   orgB: employer2 (approved) — completely unrelated org, used for cross-org tests
  //   worker1: approved worker, applied+assigned to jobA1
  //   worker2: approved worker, uninvolved — used to test "can't see worker1's stuff"
  //   admin1: exists in adminUsers
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, "adminUsers", "admin1"), { addedAt: new Date() });

    await setDoc(doc(db, "users", "worker1"), {
      role: "worker", approvalStatus: "approved", isActive: true,
      fullName: "Worker One", phone: "111", skills: ["cleaning"],
    });
    await setDoc(doc(db, "users", "worker2"), {
      role: "worker", approvalStatus: "approved", isActive: true,
      fullName: "Worker Two", phone: "222", skills: ["cleaning"],
    });
    await setDoc(doc(db, "users", "employer1"), {
      role: "employer", approvalStatus: "approved", isActive: true,
      orgId: "orgA", orgIds: ["orgA"], memberRole: "Owner",
    });
    await setDoc(doc(db, "users", "employer2"), {
      role: "employer", approvalStatus: "approved", isActive: true,
      orgId: "orgB", orgIds: ["orgB"], memberRole: "Owner",
    });
    await setDoc(doc(db, "users", "employerPending"), {
      role: "employer", approvalStatus: "pending", isActive: true,
      orgId: "orgA", orgIds: ["orgA"], memberRole: "Manager",
    });

    await setDoc(doc(db, "organizations", "orgA"), {
      name: "Org A", createdBy: "employer1", createdAt: new Date(),
    });
    await setDoc(doc(db, "organizations", "orgB"), {
      name: "Org B", createdBy: "employer2", createdAt: new Date(),
    });

    await setDoc(doc(db, "jobs", "jobA1"), {
      orgId: "orgA", orgName: "Org A", createdBy: "employer1",
      title: "Cleaner", status: "open", businessApprovalRequired: false,
    });

    await setDoc(doc(db, "applications", "jobA1_worker1"), {
      jobId: "jobA1", workerUid: "worker1", orgId: "orgA", status: "pending",
    });

    await setDoc(doc(db, "assignments", "jobA1_worker1"), {
      jobId: "jobA1", workerUid: "worker1", employerUid: "employer1", orgId: "orgA",
      status: "confirmed", hoursSubmitted: false,
    });

    // Storage fixtures
    const storage = ctx.storage();
    await uploadBytes(ref(storage, "users/worker1/idDocument/passport.pdf"), new Uint8Array([1, 2, 3]), { contentType: "application/pdf" });
    await uploadBytes(ref(storage, "users/worker1/visaDocument/visa.pdf"), new Uint8Array([1, 2, 3]), { contentType: "application/pdf" });
    await uploadBytes(ref(storage, "users/worker1/cv/cv.pdf"), new Uint8Array([1, 2, 3]), { contentType: "application/pdf" });
  });

  const anon = testEnv.unauthenticatedContext().firestore();
  const worker1 = testEnv.authenticatedContext("worker1").firestore();
  const worker2 = testEnv.authenticatedContext("worker2").firestore();
  const employer1 = testEnv.authenticatedContext("employer1").firestore();
  const employer2 = testEnv.authenticatedContext("employer2").firestore();
  const employerPending = testEnv.authenticatedContext("employerPending").firestore();
  const admin1 = testEnv.authenticatedContext("admin1").firestore();

  console.log("\n--- Unauthenticated access ---");

  await test("anon cannot read a user profile", async () => {
    await assertFails(getDoc(doc(anon, "users/worker1")));
  });
  await test("anon cannot read jobs", async () => {
    await assertFails(getDoc(doc(anon, "jobs/jobA1")));
  });
  await test("anon cannot write anything", async () => {
    await assertFails(setDoc(doc(anon, "jobs/hack"), { orgId: "orgA" }));
  });

  console.log("\n--- Reading documents that don't exist yet ---");
  // Regression coverage for a real bug found in manual QA: WorkerJobDetails opens an
  // onSnapshot listener on an assignment doc (and getDoc's an application doc) BEFORE
  // the worker has ever applied — i.e. before that doc exists. resource.data is null
  // for a non-existent doc, so a rule like `resource.data.workerUid == uid` throws and
  // gets treated as permission-denied unless the rule explicitly handles "doesn't exist
  // yet" as an allowed case (see the !exists() checks in firestore.rules).

  await test("worker reading a not-yet-created assignment doc doesn't error", async () => {
    const snap = await assertSucceeds(getDoc(doc(worker2, "assignments/jobA1_worker2")));
    if (snap.exists()) throw new Error("fixture assumption broken: doc should not exist");
  });
  await test("worker reading a not-yet-created application doc doesn't error", async () => {
    const snap = await assertSucceeds(getDoc(doc(worker2, "applications/jobDoesNotExist_worker2")));
    if (snap.exists()) throw new Error("fixture assumption broken: doc should not exist");
  });
  await test("worker reading a not-yet-created day-lock doc doesn't error", async () => {
    const snap = await assertSucceeds(getDoc(doc(worker2, "workerShiftDayLocks/worker2_2026-08-01")));
    if (snap.exists()) throw new Error("fixture assumption broken: doc should not exist");
  });

  console.log("\n--- users/{uid} ---");

  await test("worker can read their own profile", async () => {
    await assertSucceeds(getDoc(doc(worker1, "users/worker1")));
  });
  await test("worker CANNOT read another worker's profile", async () => {
    await assertFails(getDoc(doc(worker1, "users/worker2")));
  });
  await test("employer CAN read a worker's profile (applicant review)", async () => {
    await assertSucceeds(getDoc(doc(employer1, "users/worker1")));
  });
  await test("worker updating their own phone number succeeds", async () => {
    await assertSucceeds(updateDoc(doc(worker1, "users/worker1"), { phone: "999" }));
  });
  await test("worker CANNOT self-approve (approvalStatus)", async () => {
    // worker1 is seeded as "approved" already, so this must target a genuinely
    // DIFFERENT value — setting a field to the value it already has produces an empty
    // diff, which would trivially (and wrongly) look like "nothing changed".
    await assertFails(updateDoc(doc(worker1, "users/worker1"), { approvalStatus: "suspended" }));
  });
  await test("worker CANNOT change their own role to employer", async () => {
    await assertFails(updateDoc(doc(worker1, "users/worker1"), { role: "employer" }));
  });
  await test("worker CANNOT set their own skills", async () => {
    await assertFails(updateDoc(doc(worker1, "users/worker1"), { skills: ["everything"] }));
  });
  await test("worker CANNOT create a profile for someone else's uid", async () => {
    await assertFails(setDoc(doc(worker1, "users/worker2"), {
      role: "worker", approvalStatus: "pending", isActive: true,
    }));
  });
  await test("signup CANNOT self-create as already approved", async () => {
    await assertFails(setDoc(doc(worker2, "users/newWorker"), {
      role: "worker", approvalStatus: "approved", isActive: true,
    }));
  });
  await test("random user CANNOT grant themselves admin", async () => {
    await assertFails(setDoc(doc(worker1, "adminUsers/worker1"), { addedAt: new Date() }));
  });
  await test("admin CAN approve a worker", async () => {
    await assertSucceeds(updateDoc(doc(admin1, "users/worker2"), {
      approvalStatus: "approved", skills: ["cleaning", "kitchen"],
    }));
  });

  console.log("\n--- organizations/{orgId} ---");

  await test("employer from org B CANNOT edit org A", async () => {
    await assertFails(updateDoc(doc(employer2, "organizations/orgA"), { description: "hijacked" }));
  });
  await test("employer from org A CAN edit their own org", async () => {
    await assertSucceeds(updateDoc(doc(employer1, "organizations/orgA"), { description: "We clean things" }));
  });
  await test("employer CANNOT rewrite who created the org", async () => {
    await assertFails(updateDoc(doc(employer1, "organizations/orgA"), { createdBy: "employer2" }));
  });

  console.log("\n--- jobs/{jobId} ---");

  await test("pending (unapproved) employer CANNOT post a job", async () => {
    await assertFails(setDoc(doc(employerPending, "jobs/jobPending1"), {
      orgId: "orgA", createdBy: "employerPending", status: "open",
    }));
  });
  await test("approved employer CAN post a job for their own org", async () => {
    await assertSucceeds(setDoc(doc(employer1, "jobs/jobA2"), {
      orgId: "orgA", createdBy: "employer1", status: "open",
    }));
  });
  await test("employer CANNOT post a job claiming a different org", async () => {
    await assertFails(setDoc(doc(employer1, "jobs/jobSpoof"), {
      orgId: "orgB", createdBy: "employer1", status: "open",
    }));
  });
  await test("employer from org B CANNOT edit org A's job", async () => {
    await assertFails(updateDoc(doc(employer2, "jobs/jobA1"), { title: "Stolen listing" }));
  });
  await test("employer from org A CAN edit their own job", async () => {
    await assertSucceeds(updateDoc(doc(employer1, "jobs/jobA1"), { title: "Cleaner (updated)" }));
  });
  await test("employer CANNOT move a job into a different org", async () => {
    await assertFails(updateDoc(doc(employer1, "jobs/jobA1"), { orgId: "orgB" }));
  });
  await test("approved worker CAN self-assign to an open, no-approval-needed job", async () => {
    await assertSucceeds(updateDoc(doc(worker2, "jobs/jobA1"), {
      status: "assigned", assignedWorkerUid: "worker2",
    }));
    // revert for later tests
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "jobs/jobA1"), { status: "open", assignedWorkerUid: null });
    });
  });
  await test("worker CANNOT self-assign a job to someone else", async () => {
    await assertFails(updateDoc(doc(worker1, "jobs/jobA1"), {
      status: "assigned", assignedWorkerUid: "worker2",
    }));
  });
  await test("worker CANNOT set a job straight to 'filled' (skip employer approval)", async () => {
    await assertFails(updateDoc(doc(worker1, "jobs/jobA1"), { status: "filled" }));
  });

  console.log("\n--- applications/{jobId}_{workerUid} ---");

  await test("worker CAN apply for themselves with the correct doc id", async () => {
    await assertSucceeds(setDoc(doc(worker2, "applications/jobA1_worker2"), {
      jobId: "jobA1", workerUid: "worker2", orgId: "orgA", status: "pending",
    }));
  });
  await test("worker CANNOT create an application impersonating another worker", async () => {
    await assertFails(setDoc(doc(worker2, "applications/jobA1_worker1"), {
      jobId: "jobA1", workerUid: "worker2", orgId: "orgA", status: "pending",
    }));
  });
  await test("worker CANNOT self-approve their own application", async () => {
    await assertFails(updateDoc(doc(worker1, "applications/jobA1_worker1"), { status: "accepted" }));
  });
  await test("worker CAN cancel their own application", async () => {
    await assertSucceeds(updateDoc(doc(worker2, "applications/jobA1_worker2"), { status: "cancelled" }));
  });
  await test("owning org's employer CAN approve an application", async () => {
    await assertSucceeds(updateDoc(doc(employer1, "applications/jobA1_worker1"), { status: "accepted" }));
  });
  await test("employer from a DIFFERENT org CANNOT approve/reject this application", async () => {
    await assertFails(updateDoc(doc(employer2, "applications/jobA1_worker1"), { status: "rejected" }));
  });
  await test("worker CANNOT read another worker's application", async () => {
    await assertFails(getDoc(doc(worker2, "applications/jobA1_worker1")));
  });

  // Regression coverage for a real bug found in manual QA: EmployerJobApplicants /
  // EmployerJobsHome / jobs.service.js all query `applications` filtered by jobId (and
  // status). Firestore rejects a *query* (as opposed to a single-doc read) unless it can
  // prove every possible matching document satisfies the rule using ONLY the query's own
  // filters — it will NOT evaluate the rule per-document for a list request. Since the
  // read rule checks `resource.data.orgId`, that field must also be one of the query's
  // `where(...)` clauses, or Firestore rejects the whole query up front.
  await test("employer CAN query applications for their job WHEN the query filters by orgId too", async () => {
    const q = query(
      collection(employer1, "applications"),
      where("jobId", "==", "jobA1"),
      where("orgId", "==", "orgA"),
      where("status", "==", "accepted")
    );
    await assertSucceeds(getDocs(q));
  });
  await test("the same query WITHOUT an orgId filter is rejected outright (not just filtered)", async () => {
    const q = query(
      collection(employer1, "applications"),
      where("jobId", "==", "jobA1"),
      where("status", "==", "accepted")
    );
    await assertFails(getDocs(q));
  });

  console.log("\n--- assignments/{jobId}_{workerUid} ---");

  await test("worker CAN clock themselves in (clock fields only)", async () => {
    await assertSucceeds(updateDoc(doc(worker1, "assignments/jobA1_worker1"), {
      workerClockIn: new Date(),
    }));
  });
  await test("worker CANNOT sneak hoursSubmitted into a clock-in update", async () => {
    await assertFails(updateDoc(doc(worker1, "assignments/jobA1_worker1"), {
      workerClockIn: new Date(), hoursSubmitted: true,
    }));
  });
  await test("owning employer CAN submit hours (status -> pending review)", async () => {
    await assertSucceeds(updateDoc(doc(employer1, "assignments/jobA1_worker1"), {
      employerClockIn: "9:00 am", employerClockOut: "5:00 pm",
      hoursSubmitted: true, reviewStatus: "pending",
    }));
  });
  await test("employer CANNOT mark their own submission as reviewed/paid", async () => {
    await assertFails(updateDoc(doc(employer1, "assignments/jobA1_worker1"), {
      reviewStatus: "paid",
    }));
  });
  await test("admin CAN mark a submission as reviewed", async () => {
    await assertSucceeds(updateDoc(doc(admin1, "assignments/jobA1_worker1"), {
      reviewStatus: "reviewed", reviewedBy: "admin1",
    }));
  });
  await test("employer from a different org CANNOT read this assignment", async () => {
    await assertFails(getDoc(doc(employer2, "assignments/jobA1_worker1")));
  });

  // ------------------------------------------------------------------------
  // STORAGE — the part everyone should care most about: passport/visa docs.
  // ------------------------------------------------------------------------
  console.log("\n--- Storage: profile files ---");

  const worker1Storage = testEnv.authenticatedContext("worker1").storage();
  const employer1Storage = testEnv.authenticatedContext("employer1").storage();
  const worker2Storage = testEnv.authenticatedContext("worker2").storage();
  const admin1Storage = testEnv.authenticatedContext("admin1").storage();

  await test("worker CAN read their own idDocument", async () => {
    await assertSucceeds(getBytes(ref(worker1Storage, "users/worker1/idDocument/passport.pdf")));
  });
  await test("employer CANNOT read a worker's idDocument (passport)", async () => {
    await assertFails(getBytes(ref(employer1Storage, "users/worker1/idDocument/passport.pdf")));
  });
  await test("employer CANNOT read a worker's visaDocument", async () => {
    await assertFails(getBytes(ref(employer1Storage, "users/worker1/visaDocument/visa.pdf")));
  });
  await test("another worker CANNOT read this worker's idDocument", async () => {
    await assertFails(getBytes(ref(worker2Storage, "users/worker1/idDocument/passport.pdf")));
  });
  skip(
    "admin CAN read a worker's idDocument",
    "Local emulator limitation: storage.rules' firestore.exists()/get() cross-service " +
    "calls don't reliably resolve against the Firestore EMULATOR (confirmed reproducible, " +
    "unrelated to rule content — same syntax the Firebase docs prescribe). It fails CLOSED " +
    "(denies), never open, so it can't hide a leak — it can only hide a false block. " +
    "Verify this one manually after deploying: log in as a real adminUsers account and " +
    "confirm you can open a worker's ID document from backoffice."
  );
  skip(
    "employer CAN read a worker's CV (intentional MVP trade-off)",
    "Same local emulator limitation as above (isEmployer() also uses firestore.get()). " +
    "Verify manually: log in as an employer and open an applicant's CV from EmployerJobApplicants."
  );
  await test("worker CANNOT upload a file over the 10MB limit", async () => {
    const big = new Uint8Array(11 * 1024 * 1024);
    await assertFails(uploadBytes(ref(worker1Storage, "users/worker1/cv/too_big.pdf"), big, { contentType: "application/pdf" }));
  });
  await test("worker CANNOT write into another worker's folder", async () => {
    await assertFails(uploadBytes(ref(worker2Storage, "users/worker1/cv/hijack.pdf"), new Uint8Array([1]), { contentType: "application/pdf" }));
  });

  // -----------------------------------------------------------------------------
  await testEnv.cleanup();

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped (see notes above)\n`);
  if (fail > 0) {
    console.log("Failures:");
    for (const f of failures) console.log(`  - ${f.name}\n    ${f.error.split("\n")[0]}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Test run crashed:", e);
  process.exit(1);
});
