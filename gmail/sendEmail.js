
const { google } = require("googleapis");

async function sendEmail(auth, recipient, reply, threadId) {
  if (!reply) {
    console.error("Reply is empty. Cannot send email.");
    throw new Error("Reply is empty");
  }

  const gmail = google.gmail({ version: "v1", auth });

  const rawMessage = [
    `To: ${recipient}`,
    `Subject: Re: Your Email`,
    `In-Reply-To: ${threadId}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    reply,
  ].join("\r\n");

  const base64EncodedEmail = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64EncodedEmail,
        threadId: threadId,
      },
    });

    console.log(`Email sent successfully to ${recipient}: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error("Error sending email with Gmail API:", error);
    throw error;
  }
}


module.exports = sendEmail;
