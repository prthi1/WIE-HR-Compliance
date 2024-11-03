import { firebaseDb } from "./baseConfig";
import { doc, writeBatch, getDoc, collection, Timestamp } from "firebase/firestore";

async function getAdminEmail(companyID) {
    const compDocRef = doc(firebaseDb, `companies/${companyID}`);
    const compDetails = await getDoc(compDocRef);

    if (compDetails.exists()) {
        return compDetails.data().companyEmail;
    } else {
        console.error("[DB] GetAdminEmail => Company doc not found.");
    }
}

export async function writeNotification(
    companyID,
    emails,
    title,
    message,
    emailTemplate
) {
    try {
        const notisColRef = collection(firebaseDb, `companies/${companyID}/notifications`);
        const batch = writeBatch(firebaseDb);

        for (let email of emails) {
            let recipientEmail;
            if (email === 'admin') {
                recipientEmail = await getAdminEmail(companyID);
            } else {
                recipientEmail = email;
            }

            const notisDocRef = doc(notisColRef);

            batch.set(notisDocRef, {
                to: recipientEmail,
                title: title,
                message: message,
                isRead: false,
                emailTemplate: emailTemplate,
                time: Timestamp.now(),
                deleteTime: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 30))),
            });
        }

        await batch.commit();
    } catch (e) {
        console.error("[DB] => Notification Write: " + e);
    }
}