const { assertFails, assertSucceeds, initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const fs = require("fs");

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-test-shared-rules",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080
    },
  });

  const authCtx = testEnv.authenticatedContext("zMvSDEP1CohNwdC9p5vV6VPk7632", {
    email: "jesse.laten.shumaker@gmail.com"
  });
  const db = authCtx.firestore();

  try {
    await assertSucceeds(db.collection("users").doc("shared_household").collection("plans").doc("some_doc").set({ name: "test plan" }));
    console.log("Success write to shared_household");
  } catch(e) {
    console.error("Failed write to shared_household:", e);
  }

  try {
    await assertSucceeds(db.collection("users").doc("shared_household").collection("categories").doc("11f52ae0-0221-4228-bf21-e91fcc19f032").set({
      "name": "Dockage",
      "createdAt": 1781359968743,
      "color": "#8b5cf6",
      "userId": "zMvSDEP1CohNwdC9p5vV6VPk7632",
      "_deleted": false,
      "id": "11f52ae0-0221-4228-bf21-e91fcc19f032"
    }));
    console.log("Success write category");
  } catch(e) {
    console.error("Failed write category:", e);
  }
}
run();
