const admin = require("firebase-admin");
const {Filter, Timestamp} = require("firebase-admin/firestore");
const {logger} = require("firebase-functions");
const firestore = admin.firestore();

/**
 * Formats date as DD-MM-YYYY
 * @param {Date} date
 * @return {string} DD-MM-YYYY
 */
function formatDate(date) {
  // Format date as DD-MM-YYYY
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // January is 0!
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Gets admin's email of a company
 * @param {string} companyID
 * @return {string} admin's email
 */
async function getAdminEmail(companyID) {
  const companyRef = firestore.collection("companies").doc(companyID);
  const companySnapshot = await companyRef.get()
      .catch((error) => {
        logger.error("getAdminEmail => Error: ", error);
      });
  const company = companySnapshot.data();
  return company.companyEmail;
}

/**
 * Gets employee details which are expiring within 1 or 3 months
 * @return {Array} Array of Maps with expiring employee details
 */
async function getExpiringEmployeesDetails() {
  const today = new Date();
  const oneMonthFuture = new Date(today);
  oneMonthFuture.setMonth(today.getMonth() + 1);
  const threeMonthsFuture = new Date(today);
  threeMonthsFuture.setMonth(today.getMonth() + 3);

  const oneMonthFutureStr = formatDate(oneMonthFuture);
  const threeMonthsFutureStr = formatDate(threeMonthsFuture);

  const employeeCollection = firestore.collectionGroup("employees");

  const expiringSnapshot = await employeeCollection.where(Filter.or(
      Filter.where("passport_details.expiryDate", "==", oneMonthFutureStr),
      Filter.where("visa_details.expiryDate", "==", oneMonthFutureStr),
      Filter.where("cos_details.expiryDate", "==", oneMonthFutureStr),
      Filter.where("rtw_details.expiryDate", "==", oneMonthFutureStr),
      Filter.where("passport_details.expiryDate", "==", threeMonthsFutureStr),
      Filter.where("visa_details.expiryDate", "==", threeMonthsFutureStr),
      Filter.where("cos_details.expiryDate", "==", threeMonthsFutureStr),
      Filter.where("rtw_details.expiryDate", "==", threeMonthsFutureStr),
  )).get().catch((error) => {
    logger.error("getExpiringEmployeesDetails => Error: ", error);
  });

  const expiringEmployees = [];

  if (expiringSnapshot) {
    expiringSnapshot.forEach((doc) => {
      const passport_expiry_date = doc.data().passport_details &&
        doc.data().passport_details.expiryDate || "";
      const visa_expiry_date = doc.data().visa_details &&
        doc.data().visa_details.expiryDate || "";
      const cos_expiry_date = doc.data().cos_details &&
        doc.data().cos_details.expiryDate || "";
      const rtw_expiry_date = doc.data().rtw_details &&
        doc.data().rtw_details.expiryDate || "";

      if (passport_expiry_date === oneMonthFutureStr ||
        passport_expiry_date === threeMonthsFutureStr) {
        // Passport Expiring within 1 or 3 months
        const expiringEmployee = {
          companyID: doc.ref.parent.parent.id,
          name: doc.data().name,
          email: doc.data().email,
          type: "Passport",
          expiryDate: passport_expiry_date,
        };
        expiringEmployees.push(expiringEmployee);
      }

      if (visa_expiry_date === oneMonthFutureStr ||
        visa_expiry_date === threeMonthsFutureStr) {
        // Visa Expiring within 1 or 3 months
        const expiringEmployee = {
          companyID: doc.ref.parent.parent.id,
          name: doc.data().name,
          email: doc.data().email,
          type: "Visa",
          expiryDate: visa_expiry_date,
        };
        expiringEmployees.push(expiringEmployee);
      }

      if (cos_expiry_date === oneMonthFutureStr ||
        cos_expiry_date === threeMonthsFutureStr) {
        // COS Expiring within 1 or 3 months
        const expiringEmployee = {
          companyID: doc.ref.parent.parent.id,
          name: doc.data().name,
          email: doc.data().email,
          type: "Certificate of Sponsorship",
          expiryDate: cos_expiry_date,
        };
        expiringEmployees.push(expiringEmployee);
      }

      if (rtw_expiry_date === oneMonthFutureStr ||
        rtw_expiry_date === threeMonthsFutureStr) {
        // RTW Expiring within 1 or 3 months
        const expiringEmployee = {
          companyID: doc.ref.parent.parent.id,
          name: doc.data().name,
          email: doc.data().email,
          type: "Right To Work",
          expiryDate: rtw_expiry_date,
        };
        expiringEmployees.push(expiringEmployee);
      }
    });
  }

  return expiringEmployees;
}

/**
 * Sends notifications to admin with details of expiring employees
 */
async function notifyAboutExpiry() {
  const expiringEmployees = await getExpiringEmployeesDetails();
  try {
    const checkedIDs = new Set();
    const adminEmails = {};

    // Gather admin emails for unique company IDs
    for (const employee of expiringEmployees) {
      if (!checkedIDs.has(employee.companyID)) {
        checkedIDs.add(employee.companyID);
        adminEmails[employee.companyID] =
          await getAdminEmail(employee.companyID);
      }
    }

    const batch = firestore.batch();

    // write notifications
    let count = 0;
    expiringEmployees.forEach((employee) => {
      const adminEmail = adminEmails[employee.companyID];
      batch.create(firestore.collection("companies")
          .doc(employee.companyID).collection("notifications").doc(), {
        to: adminEmail,
        isRead: false,
        title: `${employee.type} Expiry`,
        message: `${employee.name} (${employee.email})'s 
                ${employee.type} is expiring on ${employee.expiryDate}.`,
        time: Timestamp.now(),
        deleteTime: Timestamp.fromDate(new Date(new
        Date().setDate(new Date().getDate() + 30))),
        emailTemplate: {
          title: `${employee.type} Expiry Reminder`,
          body: `${employee.name} (${employee.email})'s ${employee.type} is ` +
            `expiring on ${employee.expiryDate}.
          \n Vist www.wiehr.co.uk`+
          `/profile?email=${employee.email} to update.`,
        },
      });

      count++;
    });

    await batch.commit();
    if (count > 0) {
      logger.info(`notifyAboutExpiry => Notified ${count} expiring details.`);
    } else {
      logger.info("notifyAboutExpiry => No expiring details found to notify.");
    }
  } catch (error) {
    logger.error("notifyAboutExpiry => Error: ", error);
  }
}

module.exports = {notifyAboutExpiry};
