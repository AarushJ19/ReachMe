// const express = require("express");
// const processGmailEmails = require("./gmail/index"); // Gmail email processing function
// // const processOutlookEmails = require("./outlook/processOutlookEmails"); // Outlook email processing function
// // const getAuthClient = require("./outlook/authentication"); // For Outlook Auth

// const app = express();
// const port = 3000;

// app.get("/start-gmail", async (req, res) => {
//   await processGmailEmails();
//   res.json({ message: "Gmail processing started" });
// });

// // app.get("/start-outlook", async (req, res) => {
// //   const authClient = await getAuthClient();
// //   await processOutlookEmails(authClient);
// //   res.json({ message: "Outlook processing started" });
// // });

// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });


const express = require("express");
const path = require("path");
const processGmailEmails = require("./gmail/index"); // Gmail email processing function
// const processOutlookEmails = require("./outlook/processOutlookEmails"); // Outlook email processing function
// const getAuthClient = require("./outlook/authentication"); // For Outlook Auth

const app = express();
const port = 3000;

// Serve static files from the 'src/frontend' directory
app.use(express.static(path.join(__dirname, '/public')));

// Route to serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

app.get("/start-gmail", async (req, res) => {
  await processGmailEmails();
  res.json({ message: "Gmail processing started" });
});

// app.get("/start-outlook", async (req, res) => {
//   const authClient = await getAuthClient();
//   await processOutlookEmails(authClient);
//   res.json({ message: "Outlook processing started" });
// });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
