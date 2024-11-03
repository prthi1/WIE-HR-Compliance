const {onDocumentCreated, onDocumentDeleted} =
  require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {logger} = require("firebase-functions");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({region: "europe-west2"});

const {resetLeaves, deleteNotifications, deleteAnnouncements,
  deleteTasks, deletePayslips} = require("./scheduledJobs");

const {notifyAboutExpiry} = require("./expiringDetails");

const {sendEmail} = require("./sendEmail");

// The es6-promise-pool to limit the concurrency of promises.
const PromisePool = require("es6-promise-pool");
// Maximum concurrent account deletions.
const MAX_CONCURRENT = 3;

if (process.env.FUNCTIONS_EMULATOR) {
  logger.info("Functions running on emulator.");
  admin.firestore().settings({
    host: "localhost:8080",
    ssl: false,
  });
}

/**
 * Generates a password of 6 characters
 * @return {string} Generated password
 */
function generatePassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
}

exports.createAuthOnFirestoreUserCreate =
  onDocumentCreated("users/{email}", async (event) => {
    const userData = event.data.data();
    const {email, position, companyID, companyName} = userData;
    try {
      const password = generatePassword();
      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
      });
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        companyID: companyID,
        position: position === "Administrator" ?
          "Administrator" : "Employee",
      });
      await sendEmail(email,
          `[${companyName}] Login Credentials`,
          `You have been added to ${companyName} as ${position}, 
        \nPlease login with the following credentials:
        \n\nEmail: ${email}
        \nPassword: ${password}
        \nLogin URL: www.wiehr.co.uk
        \nYou may change your password at `+
        `www.wiehr.co.uk/forgot-password
        \n\nThis is an automated email from ` +
        `WIE HR Compliance, please do not reply.`);
      logger.info("Auth created:", userRecord.email);
      return userRecord;
    } catch (error) {
      logger.error("Error creating user:", error);
    }
  });

exports.deleteAuthOnFirestoreUserDelete =
  onDocumentDeleted("users/{email}", async (event) => {
    const email = event.params.email;
    return admin.auth().getUserByEmail(email)
        .then((userRecord) => {
          return admin.auth().deleteUser(userRecord.uid);
        })
        .then(() => {
          logger.info("Auth deleted:", email);
          return null;
        })
        .catch((error) => {
          logger.error("Error deleting user:", error);
        });
  });

// Run once a day at midnight
exports.scheduledExecutions =
  onSchedule("every day 00:00", async () => {
    /* Use a pool so that we execute maximum
    `MAX_CONCURRENT` functions in parallel.*/
    const promisePool = new PromisePool(
        () => {
          resetLeaves();
          deleteNotifications();
          deleteAnnouncements();
          deleteTasks();
          deletePayslips();
          notifyAboutExpiry();
        },
        MAX_CONCURRENT,
    );

    await promisePool.start();

    logger.info("Scheduled executions triggered.");
  });

exports.sendEmailOnFirestoreNotificationCreate =
  onDocumentCreated("companies/{companyID}/notifications/{id}",
      async (event) => {
        const notificationData = event.data.data();
        const {to, emailTemplate} = notificationData;

        await sendEmail(to, emailTemplate.title,
            `${emailTemplate.body} 
        \n\nThis is an automated email from ` +
        `WIE HR Compliance, please do not reply.`);
      });
