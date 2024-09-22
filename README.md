Automated Email Processor with Google and Outlook Login Integration
This Node.js application automates the process of reading, labeling, and replying to emails using Gmail API and OpenAI API. It provides a simple login page where users can authenticate with their Google or Outlook accounts. After logging in, the system processes incoming emails, categorizes them using AI, applies appropriate labels, and sends personalized replies to the email senders.

Features:
Google and Outlook OAuth Authentication: Users can log in with their Google or Outlook accounts to enable email processing.
Gmail Integration: Automatically fetches new emails from the user's inbox, labels them, and sends replies.
AI-Powered Email Labeling: Uses OpenAI API to analyze email content and assign labels (e.g., 'interested', 'not interested').
Automated Email Responses: Generates and sends personalized replies based on email content.
Delay Mechanism: Adds a delay between processing each email to comply with API rate limits.
Error Handling: Robust error handling for email fetching, labeling, and sending replies.

Tech Stack:
Node.js with Express.js
Gmail API & Outlook API for email management
OpenAI API for intelligent email labeling
OAuth2 for Google and Outlook authentication
BullMQ (optional) for job scheduling and queuing

How It Works:
User Login: Users log in via Google or Outlook on the frontend.
Email Processing: After login, the system fetches new emails, categorizes them using AI, and sends replies.

Backend Workflow:
Emails are retrieved from the user's inbox.
Emails are labeled using AI-powered text analysis.
The system sends an automated response back to the sender.

How to Use:
Clone this repository.
Set up your environment variables for Google and Outlook API keys, OpenAI API key, and Gmail credentials.

Run the backend server with:

node index.js

Access the login page and authenticate using Google.
Watch as emails are processed, labeled, and replied to automatically!
