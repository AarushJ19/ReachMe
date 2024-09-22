require("dotenv").config();
const { google } = require("googleapis");
const labelEmail = require("./openai");
const sendEmail = require("./sendEmail");
const path = require("path");
const fs = require("fs");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "./gmail/credentials.json";

const readline = require("readline");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Load credentials from file
async function loadCredentials() {
  const content = await fs.promises.readFile(CREDENTIALS_PATH, "utf8");
  return JSON.parse(content);
}

// Get and store new token after prompting for user authorization
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the code from that page here: ", (code) => {
      rl.close();
      oAuth2Client.getToken(code, async (err, token) => {
        if (err) {
          console.error("Error retrieving access token", err);
          reject(err);
          return;
        }
        oAuth2Client.setCredentials(token);
        await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token));
        resolve(oAuth2Client);
      });
    });
  });
}

// Load or request authorization to call APIs
async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = await fs.promises.readFile(TOKEN_PATH, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
    console.log("Successfully authorized using stored token.");
    return oAuth2Client;
  } catch (err) {
    return getNewToken(oAuth2Client);
  }
}

// Function to create or update a label
async function createOrUpdateLabel(auth, labelName) {
  const gmail = google.gmail({ version: "v1", auth });
  const labelColors = {
    interested: { backgroundColor: "#16a766", textColor: "#ffffff" },
    "not interested": { backgroundColor: "#cc3a21", textColor: "#ffffff" },
    "more info": { backgroundColor: "#f2c960", textColor: "#ffffff" },
    default: { backgroundColor: "#fbe983", textColor: "#000000" },
  };
  const color = labelColors[labelName.toLowerCase()] || labelColors["default"];

  const labelsResponse = await gmail.users.labels.list({ userId: "me" });
  const existingLabel = labelsResponse.data.labels.find(
    (label) => label.name.toLowerCase() === labelName.toLowerCase()
  );

  if (existingLabel) {
    await gmail.users.labels.update({
      userId: "me",
      id: existingLabel.id,
      requestBody: {
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
        color: {
          backgroundColor: color.backgroundColor,
          textColor: color.textColor,
        },
      },
    });
    return existingLabel.id;
  }

  const newLabel = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
      color: {
        backgroundColor: color.backgroundColor,
        textColor: color.textColor,
      },
    },
  });

  return newLabel.data.id;
}

// Function to modify email labels
async function addLabels(auth, messageId, labelName) {
  try {
    const gmail = google.gmail({ version: "v1", auth });
    const labelId = await createOrUpdateLabel(auth, labelName);

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ["UNREAD"],
      },
    });

    console.log(`Label '${labelName}' added to email ID: ${messageId}`);
  } catch (error) {
    console.error("Error modifying message labels:", error);
    throw error;
  }
}

// Function to fetch unread emails from the last week
async function getEmails(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const oneWeekAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 7 days ago
  const oneWeekAgoSec = Math.floor(oneWeekAgo.getTime() / 1000);

  const res = await gmail.users.messages.list({
    userId: "me",
    q: `after:${oneWeekAgoSec} is:unread`,
    maxResults: 100,
  });

  const messages = res.data.messages || [];
  const emails = [];

  for (const message of messages) {
    const messageId = message.id;
    const messageDetails = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    emails.push({
      id: messageId,
      payload: messageDetails.data.payload,
      snippet: messageDetails.data.snippet,
      labels: messageDetails.data.labelIds,
    });
  }

  return emails;
}

// Function to process emails: label, reply, and add labels
async function processEmails() {
  const auth = await authorize();
  const emails = await getEmails(auth);

  if (emails.length === 0) {
    console.log("No new emails to process.");
    return;
  }

  for (const email of emails) {
    try {
      const response = await labelEmail(email.snippet);
      if (!response) {
        console.error(`Error: OpenAI API returned an empty response for email ID: ${email.id}`);
        continue;
      }

      const [label, reply] = response.split("\n", 2);
      if (!label) {
        console.error(`Error: Label is undefined for email ID: ${email.id}`);
        continue;
      }

      // Add label to email in Gmail
      await addLabels(auth, email.id, label);

      // Send reply
      const senderEmail = extractSenderEmail(email);
      if (senderEmail) {
        console.log(`Sending reply to: ${senderEmail}`);
        try {
          const responseId = await sendEmail(auth, senderEmail, reply);
          console.log(`Reply sent to ${senderEmail} for email ID: ${email.id}. Message ID: ${responseId}`);
        } catch (sendError) {
          console.error(`Failed to send reply to ${senderEmail} for email ID: ${email.id}`, sendError);
        }
      } else {
        console.error(`Error: Unable to extract sender email for email ID: ${email.id}`);
      }
    } catch (error) {
      console.error(`Error processing email ID: ${email.id}`, error);
    }

    // Introduce delay between processing each email
    await delay(1000); // 1 second delay
  }
}

// Helper function to extract the sender's email address from the email headers
function extractSenderEmail(email) {
  const headers = email.payload.headers;
  const fromHeader = headers.find((header) => header.name === "From");
  if (fromHeader) {
    const match = fromHeader.value.match(/<(.+)>/);
    return match ? match[1] : fromHeader.value;
  }
  return null;
}

module.exports = {
  getEmails,
  authorize,
  processEmails,
  extractSenderEmail,
  addLabels,
  createOrUpdateLabel,
};
