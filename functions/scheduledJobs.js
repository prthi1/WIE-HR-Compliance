const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");
const firestore = admin.firestore();
const storageBucket = admin.storage().bucket();
/**
 * Formats date as DD-MM-YYYY
 * @param {Date} date
 * @return {string} DD-MM-YYYY
 */
function formatDate(date) {
  // Format date as DD-MM-YYYY
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // January is 0!
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Gets a company's allowed leaves counts
 * @param {string} companyID 
 * @return {Map} allowed leaves for each leave type
 */
async function getAllowedLeavesCount(companyID) {
  const compDocRef = firestore.doc(`companies/${companyID}`);
  const compDetails = await compDocRef.get();

  if (compDetails.exists) {
    const leavesAllowed = compDetails.data().leavesAllowed;
    if (leavesAllowed) {
      return leavesAllowed;
    }
  }

  // Return default values if no company document or leavesAllowed is found
  return {
    annualLeavesAllowed: 28,
    sickLeavesAllowed: 3,
  };
}

/**
 * Resets all leaves that have passed their reset date.
 */
async function resetLeaves() {
  /* set default values back to all leaves that have passed or
  equal to their reset date*/
  try {
    const today = new Date();
    const todayString = formatDate(today);
    const batch = firestore.batch();

    const querySnapshot = await firestore.collectionGroup("leaves")
      .where("resetDate", "<=", Timestamp.fromDate(today))
      .get();

    let count = 0;
    for (const doc of querySnapshot.docs) {
      const newDurEndDate = new Date(today);
      newDurEndDate.setFullYear(newDurEndDate.getFullYear() + 1);
      const newResetDate = new Date(today);
      newResetDate.setFullYear(newResetDate.getFullYear() + 1);
      newResetDate.setHours(0, 0, 0, 0);

      // Get allowed leaves
      const allowedLeaves =
        await getAllowedLeavesCount(doc.ref.parent.parent.id);

      batch.update(doc.ref, {
        durStartDate: todayString,
        durEndDate: formatDate(newDurEndDate),
        annualLeavesBalance: allowedLeaves.annualLeavesAllowed,
        sickLeavesBalance: allowedLeaves.sickLeavesAllowed,
        leavesData: [],
        resetDate: Timestamp.fromDate(newResetDate),
      });

      count++;
    };

    await batch.commit();
    if (count > 0) {
      logger.info(`resetLeaves => Reset ${count} leaves.`);
    } else {
      logger.info("resetLeaves => No leaves found to reset.");
    }
  } catch (error) {
    logger.error("resetLeaves => Error:", error);
    throw error;
  }
}

/**
 * Deletes all notifications that have passed their delete date.
 */
async function deleteNotifications() {
  try {
    const today = new Date();
    const batch = firestore.batch();

    const querySnapshot = await firestore
      .collectionGroup("notifications")
      .where("deleteTime", "<", Timestamp.fromDate(today))
      .get();

    let count = 0;
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    if (count > 0) {
      logger.info(`deleteNotifications => Deleted ${count} notifications.`);
    } else {
      logger.info("deleteNotifications => No notifications found to delete.");
    }
  } catch (error) {
    logger.error("deleteNotifications => Error:", error);
    throw error;
  }
}

/**
 * Deletes all leaves that have passed their delete date.
 */
async function deleteAnnouncements() {
  try {
    const today = new Date();
    const batch = firestore.batch();

    const querySnapshot = await firestore
      .collectionGroup("announcements")
      .where("deleteTime", "<", Timestamp.fromDate(today))
      .get();

    let count = 0;
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    if (count > 0) {
      logger.info(`deleteAnnouncements => Deleted ${count} announcements.`);
    } else {
      logger.info("deleteAnnouncements => No announcements found to delete.");
    }
  } catch (error) {
    logger.error("deleteAnnouncements => Error:", error);
    throw error;
  }
}

/**
 * Deletes all tasks that have passed their delete date.
 */
async function deleteTasks() {
  try {
    const today = new Date();
    const batch = firestore.batch();

    const querySnapshot = await firestore
      .collectionGroup("tasks")
      .where("deleteTime", "<", Timestamp.fromDate(today))
      .get();

    let count = 0;
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    if (count > 0) {
      logger.info(`deleteTasks => Deleted ${count} tasks.`);
    } else {
      logger.info("deleteTasks => No tasks found to delete.");
    }
  } catch (error) {
    logger.error("deleteTasks => Error:", error);
    throw error;
  }
}

/**
 * Deletes all payslips that have passed their delete date.
 */
async function deletePayslips() {
  try {
    const today = new Date();
    const batch = firestore.batch();

    const querySnapshot = await firestore
      .collectionGroup("payslips")
      .where("deleteTime", "<", Timestamp.fromDate(today))
      .get();

    let count = 0;
    const deletePromises = [];

    querySnapshot.forEach((doc) => {
      const attachmentPath = doc.data().attachmentPath;
      if (attachmentPath) {
        const attachmentRef = storageBucket.file(attachmentPath);
        deletePromises.push(attachmentRef.delete());
      }
      batch.delete(doc.ref);
      count++;
    });

    await Promise.all(deletePromises);
    await batch.commit();
    if (count > 0) {
      logger.info(`deletePayslips => Deleted ${count} 
        payslips and their attachments.`);
    } else {
      logger.info("deletePayslips => No payslips found to delete.");
    }
  } catch (error) {
    logger.error("deletePayslips => Error:", error);
    throw error;
  }
}

module.exports = {
  resetLeaves, deleteNotifications, deleteAnnouncements,
  deleteTasks, deletePayslips,
};
