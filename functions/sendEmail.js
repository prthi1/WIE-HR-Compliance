const sgMail = require("@sendgrid/mail");
const {logger} = require("firebase-functions");
require("dotenv").config();

/**
 * Sends an email from no-reply@hrcompliance.wie-solutions.co.uk
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 */
async function sendEmail(to, subject, text) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const from = "no-reply@hrcompliance.wie-solutions.co.uk";

  const msg = {
    to: to,
    from: {email: from, name: "WIE HR Compliance"},
    subject: subject,
    text: text,
  };

  await sgMail.send(msg).catch((error) => {
    logger.error("Error sending email: ", error);
  });
}

module.exports = {sendEmail};
