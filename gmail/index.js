
const { getEmails, authorize, addLabels, extractSenderEmail } = require("./email");
const labelEmail = require("./openai");
const sendEmail = require("./sendEmail");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processEmails() {
  const auth = await authorize();
  const emails = await getEmails(auth);

  if (emails.length === 0) {
    console.log("No new emails to process.");
    return;
  }

  for (const email of emails) {
    try {
      const { label, response } = await labelEmail(email.snippet);
      if (!label || !response) {
        console.error(`Error: Label or response is undefined for email ID: ${email.id}`);
        continue;
      }

      // Add label to email in Gmail
      await addLabels(auth, email.id, label);

      // Send reply
      const senderEmail = extractSenderEmail(email);
      if (senderEmail) {
        console.log(`Sending reply to: ${senderEmail}`);
        try {
          const responseId = await sendEmail(auth, senderEmail, response, email.id);
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
    await delay(10000); // 10 seconds delay
  }
}

module.exports = processEmails
// processEmails();