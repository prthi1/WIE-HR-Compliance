import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Avatar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import WorkIcon from "@mui/icons-material/Work";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SaveIcon from "@mui/icons-material/Save";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import BadgeIcon from "@mui/icons-material/Badge";
import ArticleIcon from "@mui/icons-material/Article";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import Accordion from "@mui/material/Accordion";
import AccordionActions from "@mui/material/AccordionActions";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { firebaseDb, firebaseStorage } from "../firebase/baseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const tableContainerStyles = {
  borderRadius: "20px",
  width: isMobile ? "88vw" : isTablet ? "62vw" : "78vw",
  marginTop: "10px",
  marginBottom: "10px",
  overflow: "auto",
  marginLeft: "auto",
  marginRight: "auto",

  "&::-webkit-scrollbar": {
    width: "0.8em",
    height: "0.8em",
  },
  "&::-webkit-scrollbar-track": {
    boxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
    webkitBoxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,.75)",
    borderRadius: "8px",
  },
};
const tableHeaderStyles = {
  fontWeight: "bold",
  fontFamily: "'Roboto', sans-serif",
  fontSize: "0.9rem",
  color: "#e6cb47",
  textAlign: "center",
};

const tableBodyStyles = {
  fontFamily: "'Open Sans', sans-serif",
  textAlign: "center",
};

function deleteEmployee(email, companyID) {
  return new Promise(async (resolve, reject) => {
    const userDocRef = doc(firebaseDb, `users/${email}`);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      if (userSnap.data().position === "Administrator") {
        reject("USR_IS_ADMIN");
        return;
      } else {
        try {
          // Delete email from employees_brief
          const compDocRef = doc(firebaseDb, `companies/${companyID}`);
          await updateDoc(compDocRef, {
            [`employees_brief.${email.replace(/\./g, "(dot)")}`]: deleteField(),
          });
          // Delete email from employees
          const employeeDocRef = doc(
            firebaseDb,
            `companies/${companyID}/employees/${email}`
          );
          await deleteDoc(employeeDocRef);
          // Delete files from Storage (if any)
          const storageRef = ref(firebaseStorage, `${companyID}/${email}`);
          const listResult = await listAll(storageRef);
          if (listResult.items.length !== 0) {
            for (const itemRef of listResult.items) {
              await deleteObject(itemRef);
            }
          }
          // Delete timesheets
          const timesheetDocRef = doc(
            firebaseDb,
            `companies/${companyID}/timesheets/${email}`
          );
          await deleteDoc(timesheetDocRef);
          // Delete leaves
          const leavesDocRef = doc(
            firebaseDb,
            `companies/${companyID}/leaves/${email}`
          );
          await deleteDoc(leavesDocRef);
          // Delete email from users
          await deleteDoc(userDocRef);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    } else {
      reject("USR_NOT_EXIST");
      return;
    }
  });
}

function deleteFile(fileName, companyID, email) {
  return new Promise((resolve, reject) => {
    const fileRef = ref(firebaseStorage, `${companyID}/${email}/${fileName}`);
    deleteObject(fileRef)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function uploadFileAndGetUrl(file, fileName, companyID, email) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(
      firebaseStorage,
      `${companyID}/${email}/${fileName}`
    );
    const uploadTask = uploadBytesResumable(storageRef, file);
    const unsubscribe = uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Uploading File - ${progress}% done`);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            unsubscribe();
            resolve(downloadURL);
          })
          .catch((error) => {
            unsubscribe();
            reject("[URL] " + error);
          });
      }
    );
  });
}

function updateEmployeeBrief(changedDate, companyID) {
  const companyDocRef = doc(firebaseDb, `companies/${companyID}`);
  updateDoc(companyDocRef, changedDate).catch((e) => {
    console.error("[DB] => Update Employee Brief: " + e);
  });
}

function updateDetails(changedData, companyID, email) {
  return new Promise((resolve, reject) => {
    const employeeDocRef = doc(
      firebaseDb,
      `companies/${companyID}/employees/${email}`
    );
    updateDoc(employeeDocRef, changedData)
      .then(() => {
        if (changedData["passport_details.expiryDate"]) {
          // Update passport expiry date in employees_brief
          const changedDate = {};
          changedDate[
            `employees_brief.${email.replace(/\./g, "(dot)")}.passportExpiry`
          ] = changedData["passport_details.expiryDate"];
          updateEmployeeBrief(changedDate, companyID);
        }
        if (changedData["visa_details.expiryDate"]) {
          // Update visa expiry date in employees_brief
          const changedDate = {};
          changedDate[
            `employees_brief.${email.replace(/\./g, "(dot)")}.visaExpiry`
          ] = changedData["visa_details.expiryDate"];
          updateEmployeeBrief(changedDate, companyID);
        }
        if (changedData["cos_details.expiryDate"]) {
          // Update cos expiry date in employees_brief
          const changedDate = {};
          changedDate[
            `employees_brief.${email.replace(/\./g, "(dot)")}.cosExpiry`
          ] = changedData["cos_details.expiryDate"];
          updateEmployeeBrief(changedDate, companyID);
        }
        if (changedData["rtw_details.expiryDate"]) {
          // Update rtw expiry date in employees_brief
          const changedDate = {};
          changedDate[
            `employees_brief.${email.replace(/\./g, "(dot)")}.rtwExpiry`
          ] = changedData["rtw_details.expiryDate"];
          updateEmployeeBrief(changedDate, companyID);
        }
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

let PROFILE_PERCENTAGE = 0;
const PERCENTAGE_PER_FIELD = 2.06;
function calculateProfilePercentage(profileData) {
  // Initial value, when account is created with 4 Mendatory Fields
  PROFILE_PERCENTAGE = 4 * PERCENTAGE_PER_FIELD;
  // check non-mandatory fields
  const nonMandatoryFields = [
    "contactNumber",
    "location",
    "project",
    "socNumber",
    "weeklyWorkingHours",
  ];
  nonMandatoryFields.forEach((field) => {
    if (profileData[field]) {
      PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
    }
  });

  if (profileData.profilePic) {
    PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
  }

  // Check personal details
  const personalDetailsFields = [
    "dateOfBirth",
    "homePhone",
    "email",
    "gender",
    "maritalStatus",
    "nationality",
    "address",
    "city",
    "state",
    "zipCode",
    "country",
  ];
  if (profileData.personal_details) {
    personalDetailsFields.forEach((field) => {
      if (profileData.personal_details[field]) {
        PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
      }
    });
  }

  // Check emergency contact details
  const emergencyContactDetailsFields = [
    "name",
    "email",
    "relationship",
    "contactNumber",
    "address",
    "city",
    "state",
    "zipCode",
    "country",
  ];
  if (profileData.emergency_contact) {
    emergencyContactDetailsFields.forEach((field) => {
      if (profileData.emergency_contact[field]) {
        PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
      }
    });
  }

  if (profileData.bank_details && profileData.bank_details.length > 0) {
    PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
  }

  // Check passport details
  const passportDetailsFields = [
    "passportNumber",
    "issueCountry",
    "issueDate",
    "expiryDate",
  ];
  if (profileData.passport_details) {
    passportDetailsFields.forEach((field) => {
      if (profileData.passport_details[field]) {
        PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
      }
    });
  }

  // Check visa details
  const visaDetailsFields = [
    "visaNumber",
    "visaType",
    "issueCountry",
    "issueDate",
    "expiryDate",
  ];
  if (profileData.visa_details) {
    visaDetailsFields.forEach((field) => {
      if (profileData.visa_details[field]) {
        PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
      }
    });
  }

  // Check cos details
  if (!profileData.isSponsored) {
    // Default 13.51% for cos details since this is not a sponsored employee
    PROFILE_PERCENTAGE += 13.51;
  } else {
    const cosDetailsFields = [
      "licenseNumber",
      "sponserName",
      "certificateNumber",
      "certificateDate",
      "assignedDate",
      "expiryDate",
      "sponserNote",
    ];
    if (profileData.cos_details) {
      cosDetailsFields.forEach((field) => {
        if (profileData.cos_details[field]) {
          PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
        }
      });
    }
  }

  // Check rtw details
  const rtwDetailsFields = ["shareCode", "expiryDate", "rtwStatus"];
  if (profileData.rtw_details) {
    rtwDetailsFields.forEach((field) => {
      if (profileData.rtw_details[field]) {
        PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
      }
    });
  }
}

async function getUserProfile(
  companyId,
  email,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setIsPageLoading,
  setSavedProfilePic,
  setEmployeeWorkProfileData,
  setSavedPersonalDetails,
  setSavedEmergencyContactDetails,
  setBankData,
  setSavedPassportDetails,
  setSavedVisaDetails,
  setSavedCosDetails,
  setSavedRTWDetails,
  setDocumentsData
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyId);
    const empRef = doc(companyDocRef, "employees", email);
    const empSnap = await getDoc(empRef);
    if (empSnap.exists()) {
      setEmployeeWorkProfileData({
        "Employee Name": empSnap.data().name,
        "Work Email": empSnap.data().email,
        Position: empSnap.data().position,
        "Contact Number": empSnap.data().contactNumber
          ? empSnap.data().contactNumber
          : "-",
        "Work Location": empSnap.data().location
          ? empSnap.data().location
          : "-",
        "Start Date": empSnap.data().startDate,
        Project: empSnap.data().project ? empSnap.data().project : "-",
        "National Insurance Number": empSnap.data().nationalInsuranceNumber
          ? empSnap.data().nationalInsuranceNumber
          : "-",
        "SOC Number": empSnap.data().socNumber ? empSnap.data().socNumber : "-",
        "Weekly Working Hours": empSnap.data().weeklyWorkingHours
          ? empSnap.data().weeklyWorkingHours
          : "-",
        "Sponsored Employee": empSnap.data().isSponsored ? "Yes" : "No",
      });
      setSavedProfilePic(
        empSnap.data().profilePic ? empSnap.data().profilePic : null
      );
      empSnap.data().personal_details
        ? setSavedPersonalDetails({
            dateOfBirth: empSnap.data().personal_details["dateOfBirth"]
              ? empSnap.data().personal_details["dateOfBirth"]
              : null,
            homePhone: empSnap.data().personal_details["homePhone"]
              ? empSnap.data().personal_details["homePhone"]
              : null,
            personalEmail: empSnap.data().personal_details["personalEmail"]
              ? empSnap.data().personal_details["personalEmail"]
              : null,
            gender: empSnap.data().personal_details["gender"]
              ? empSnap.data().personal_details["gender"]
              : null,
            maritalStatus: empSnap.data().personal_details["maritalStatus"]
              ? empSnap.data().personal_details["maritalStatus"]
              : null,
            nationality: empSnap.data().personal_details["nationality"]
              ? empSnap.data().personal_details["nationality"]
              : null,
            address: empSnap.data().personal_details["address"]
              ? empSnap.data().personal_details["address"]
              : null,
            city: empSnap.data().personal_details["city"]
              ? empSnap.data().personal_details["city"]
              : null,
            state: empSnap.data().personal_details["state"]
              ? empSnap.data().personal_details["state"]
              : null,
            zipCode: empSnap.data().personal_details["zipCode"]
              ? empSnap.data().personal_details["zipCode"]
              : null,
            country: empSnap.data().personal_details["country"]
              ? empSnap.data().personal_details["country"]
              : null,
          })
        : setSavedPersonalDetails({});
      empSnap.data().emergency_contact
        ? setSavedEmergencyContactDetails({
            name: empSnap.data().emergency_contact["name"]
              ? empSnap.data().emergency_contact["name"]
              : null,
            email: empSnap.data().emergency_contact["email"]
              ? empSnap.data().emergency_contact["email"]
              : null,
            relationship: empSnap.data().emergency_contact["relationship"]
              ? empSnap.data().emergency_contact["relationship"]
              : null,
            contactNumber: empSnap.data().emergency_contact["contactNumber"]
              ? empSnap.data().emergency_contact["contactNumber"]
              : null,
            address: empSnap.data().emergency_contact["address"]
              ? empSnap.data().emergency_contact["address"]
              : null,
            city: empSnap.data().emergency_contact["city"]
              ? empSnap.data().emergency_contact["city"]
              : null,
            state: empSnap.data().emergency_contact["state"]
              ? empSnap.data().emergency_contact["state"]
              : null,
            zipCode: empSnap.data().emergency_contact["zipCode"]
              ? empSnap.data().emergency_contact["zipCode"]
              : null,
            country: empSnap.data().emergency_contact["country"]
              ? empSnap.data().emergency_contact["country"]
              : null,
          })
        : setSavedEmergencyContactDetails({});
      empSnap.data().bank_details
        ? setBankData(empSnap.data().bank_details)
        : setBankData([]);
      empSnap.data().passport_details
        ? setSavedPassportDetails({
            passportNumber: empSnap.data().passport_details["passportNumber"]
              ? empSnap.data().passport_details["passportNumber"]
              : null,
            issueCountry: empSnap.data().passport_details["issueCountry"]
              ? empSnap.data().passport_details["issueCountry"]
              : null,
            issueDate: empSnap.data().passport_details["issueDate"]
              ? empSnap.data().passport_details["issueDate"]
              : null,
            expiryDate: empSnap.data().passport_details["expiryDate"]
              ? empSnap.data().passport_details["expiryDate"]
              : null,
          })
        : setSavedPassportDetails({});
      empSnap.data().visa_details
        ? setSavedVisaDetails({
            visaNumber: empSnap.data().visa_details["visaNumber"]
              ? empSnap.data().visa_details["visaNumber"]
              : null,
            visaType: empSnap.data().visa_details["visaType"]
              ? empSnap.data().visa_details["visaType"]
              : null,
            issueCountry: empSnap.data().visa_details["issueCountry"]
              ? empSnap.data().visa_details["issueCountry"]
              : null,
            issueDate: empSnap.data().visa_details["issueDate"]
              ? empSnap.data().visa_details["issueDate"]
              : null,
            expiryDate: empSnap.data().visa_details["expiryDate"]
              ? empSnap.data().visa_details["expiryDate"]
              : null,
          })
        : setSavedVisaDetails({});
      empSnap.data().cos_details
        ? setSavedCosDetails({
            licenseNumber: empSnap.data().cos_details["licenseNumber"]
              ? empSnap.data().cos_details["licenseNumber"]
              : null,
            sponserName: empSnap.data().cos_details["sponserName"]
              ? empSnap.data().cos_details["sponserName"]
              : null,
            certificateNumber: empSnap.data().cos_details["certificateNumber"]
              ? empSnap.data().cos_details["certificateNumber"]
              : null,
            certificateDate: empSnap.data().cos_details["certificateDate"]
              ? empSnap.data().cos_details["certificateDate"]
              : null,
            assignedDate: empSnap.data().cos_details["assignedDate"]
              ? empSnap.data().cos_details["assignedDate"]
              : null,
            expiryDate: empSnap.data().cos_details["expiryDate"]
              ? empSnap.data().cos_details["expiryDate"]
              : null,
            sponserNote: empSnap.data().cos_details["sponserNote"]
              ? empSnap.data().cos_details["sponserNote"]
              : null,
          })
        : setSavedCosDetails({});
      empSnap.data().rtw_details
        ? setSavedRTWDetails({
            shareCode: empSnap.data().rtw_details["shareCode"]
              ? empSnap.data().rtw_details["shareCode"]
              : null,
            expiryDate: empSnap.data().rtw_details["expiryDate"]
              ? empSnap.data().rtw_details["expiryDate"]
              : null,
            rtwStatus: empSnap.data().rtw_details["rtwStatus"]
              ? empSnap.data().rtw_details["rtwStatus"]
              : null,
          })
        : setSavedRTWDetails({});
      empSnap.data().documents_details
        ? setDocumentsData(empSnap.data().documents_details)
        : setDocumentsData([]);
      calculateProfilePercentage(empSnap.data());
      setIsPageLoading(false);
    } else {
      setSnackbarMessage("Employee details not found.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  } catch (error) {
    console.error("[DB] ", error);
    setSnackbarMessage("Something went wrong. Please try again later.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
}

function Profile({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  usrEmail,
}) {
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  let emailToFetch;
  if (isAdmin && email) {
    emailToFetch = email;
  } else {
    emailToFetch = usrEmail;
  }
  // Saved details of employee from DB
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [savedProfilePic, setSavedProfilePic] = useState(null);
  const [employeeWorkProfileData, setEmployeeWorkProfileData] = useState({});
  const [savedPersonalDetails, setSavedPersonalDetails] = useState({});
  const [savedEmergencyContactDetails, setSavedEmergencyContactDetails] =
    useState({});
  const [bankData, setBankData] = useState([]);
  const [savedPassportDetails, setSavedPassportDetails] = useState({});
  const [savedVisaDetails, setSavedVisaDetails] = useState({});
  const [savedCosDetails, setSavedCosDetails] = useState({});
  const [savedRTWDetails, setSavedRTWDetails] = useState({});
  const [documentsData, setDocumentsData] = useState([]);
  useEffect(() => {
    // Trigger employee details fetch once the basic details (companyID, etc.) are loaded
    if (companyID) {
      getUserProfile(
        companyID,
        emailToFetch,
        setSnackbarOpen,
        setSnackbarMessage,
        setSnackbarSeverity,
        setIsPageLoading,
        setSavedProfilePic,
        setEmployeeWorkProfileData,
        setSavedPersonalDetails,
        setSavedEmergencyContactDetails,
        setBankData,
        setSavedPassportDetails,
        setSavedVisaDetails,
        setSavedCosDetails,
        setSavedRTWDetails,
        setDocumentsData
      );
    }
  }, [companyID, emailToFetch]);

  const [isProfilePicDialogOpen, setIsProfilePicDialogOpen] = useState(false);
  const [isAddBankDialogOpen, setIsAddBankDialogOpen] = useState(false);
  const [isUploadDocumentsDialogOpen, setIsUploadDocumentsDialogOpen] =
    useState(false);
  // Delete Dialog Box
  const [deleteDialogBoxOpen, setDeleteDialogBoxOpen] = useState(false);
  const [deleteDialogBoxTitle, setDeleteDialogBoxTitle] = useState("");
  const [deleteDialogBoxContent, setDeleteDialogBoxContent] = useState("");
  const [pickedItemToDelete, setPickedItemToDelete] = useState(null);

  // Profile Picture
  const [profilePic, setProfilePic] = useState(null);
  const [isProfilePicLoading, setIsProfilePicLoading] = useState(false);
  async function handleProfilePicChange(action) {
    if (action === "upload") {
      if (profilePic === null) {
        setSnackbarMessage("Profile picture not selected");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      if (!profilePic.type.startsWith("image")) {
        setSnackbarMessage("Only images are allowed");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
      setIsProfilePicDialogOpen(false);
      setIsProfilePicLoading(true);
      await uploadFileAndGetUrl(
        profilePic,
        `profilePic`,
        companyID,
        emailToFetch
      )
        .then((url) => {
          setSavedProfilePic(url);
          updateDetails({ profilePic: url }, companyID, emailToFetch)
            .then(() => {
              setSnackbarMessage("Profile picture uploaded successfully.");
              setSnackbarSeverity("success");
              setSnackbarOpen(true);
              setIsProfilePicLoading(false);
            })
            .catch((error) => {
              console.error("[DB] => Profile Pic Update: " + error);
              setSnackbarMessage("Failed to upload profile picture.");
              setSnackbarSeverity("error");
              setSnackbarOpen(true);
              setIsProfilePicLoading(false);
            });
          // Updating the url on users collection
          const userDocRef = doc(firebaseDb, `users/${emailToFetch}`);
          updateDoc(userDocRef, { profilePic: url });

          // Update profile percentage (only update if there is no previous profile picture)
          if (savedProfilePic === null) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(PROFILE_PERCENTAGE + PERCENTAGE_PER_FIELD);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
          }
        })
        .catch((error) => {
          console.error("[Storage] => Upload Document: " + error);
          setSnackbarMessage("Failed to upload profile picture.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsProfilePicLoading(false);
        });
    }
    if (action === "delete") {
      setIsProfilePicDialogOpen(false);
      setIsProfilePicLoading(true);
      await deleteFile(`profilePic`, companyID, emailToFetch)
        .then(() => {
          setSavedProfilePic(null);
          console.log("[Storage] => Profile picture deleted.");

          updateDetails({ profilePic: null }, companyID, emailToFetch)
            .then(() => {
              setProfilePic(null);
              setSnackbarMessage("Profile picture deleted successfully.");
              setSnackbarSeverity("success");
              setSnackbarOpen(true);
              setIsProfilePicLoading(false);
            })
            .catch((error) => {
              console.error("[DB] => Profile Pic Update: " + error);
              setSnackbarMessage("Failed to delete profile picture.");
              setSnackbarSeverity("error");
              setSnackbarOpen(true);
              setIsProfilePicLoading(false);
            });
          // Updating the url on users collection
          const userDocRef = doc(firebaseDb, `users/${emailToFetch}`);
          updateDoc(userDocRef, { profilePic: null });

          // Update profile percentage (only update if there is no previous profile picture)
          const changedDate = {};
          changedDate[
            `employees_brief.${emailToFetch.replace(
              /\./g,
              "(dot)"
            )}.profilePercentage`
          ] = Math.round(PROFILE_PERCENTAGE - PERCENTAGE_PER_FIELD);
          updateEmployeeBrief(changedDate, companyID);
          PROFILE_PERCENTAGE -= PERCENTAGE_PER_FIELD;
        })
        .catch((error) => {
          console.error("[Storage] => Delete Document: " + error);
          setSnackbarMessage("Failed to delete profile picture.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsProfilePicLoading(false);
        });
    }
  }

  // Personal Details
  const [personalDetails, setPersonalDetails] = useState({});
  useEffect(() => {
    setPersonalDetails(savedPersonalDetails);
  }, [savedPersonalDetails]);
  const [isPersonalDetailsSaveLoading, setIsPersonalDetailsSaveLoading] =
    useState(false);
  function handlePersonalDetailsSave() {
    const updatedPersonalDetails = {};
    if (personalDetails.dateOfBirth !== savedPersonalDetails.dateOfBirth) {
      updatedPersonalDetails.dateOfBirth = personalDetails.dateOfBirth;
    }
    if (personalDetails.personalEmail !== savedPersonalDetails.personalEmail) {
      updatedPersonalDetails.personalEmail = personalDetails.personalEmail;
    }
    if (personalDetails.homePhone !== savedPersonalDetails.homePhone) {
      updatedPersonalDetails.homePhone = personalDetails.homePhone;
    }
    if (personalDetails.maritalStatus !== savedPersonalDetails.maritalStatus) {
      updatedPersonalDetails.maritalStatus = personalDetails.maritalStatus;
    }
    if (personalDetails.gender !== savedPersonalDetails.gender) {
      updatedPersonalDetails.gender = personalDetails.gender;
    }
    if (personalDetails.nationality !== savedPersonalDetails.nationality) {
      updatedPersonalDetails.nationality = personalDetails.nationality;
    }
    if (personalDetails.address !== savedPersonalDetails.address) {
      updatedPersonalDetails.address = personalDetails.address;
    }
    if (personalDetails.city !== savedPersonalDetails.city) {
      updatedPersonalDetails.city = personalDetails.city;
    }
    if (personalDetails.state !== savedPersonalDetails.state) {
      updatedPersonalDetails.state = personalDetails.state;
    }
    if (personalDetails.zipCode !== savedPersonalDetails.zipCode) {
      updatedPersonalDetails.zipCode = personalDetails.zipCode;
    }
    if (personalDetails.country !== savedPersonalDetails.country) {
      updatedPersonalDetails.country = personalDetails.country;
    }

    if (Object.keys(updatedPersonalDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (updatedPersonalDetails.dateOfBirth === "Invalid Date") {
      setSnackbarMessage("Please slect a valid date for date of birth.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedPersonalDetails).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedPersonalDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedPersonalDetails).length;
    } else {
      const emptyKeysInSavedPersonalDetails = Object.entries(
        savedPersonalDetails
      )
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedPersonalDetails.filter((key) =>
        Object.keys(updatedPersonalDetails).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedPersonalDetails)) {
      objectToUpdate[`personal_details.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsPersonalDetailsSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedPersonalDetails({
            ...savedPersonalDetails,
            ...updatedPersonalDetails,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("Personal details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsPersonalDetailsSaveLoading(false);
        })
        .catch((error) => {
          setSavedPersonalDetails({ ...savedPersonalDetails });
          console.error("[DB] => Personal Details: " + error);
          setSnackbarMessage("Failed to save personal details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsPersonalDetailsSaveLoading(false);
        });
    }
  }

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState({});
  useEffect(() => {
    setEmergencyContact(savedEmergencyContactDetails);
  }, [savedEmergencyContactDetails]);
  const [isEmergencyContactSaveLoading, setIsEmergencyContactSaveLoading] =
    useState(false);
  function handleEmergencyContactSave() {
    const updatedEmergencyContact = {};

    if (emergencyContact.name !== savedEmergencyContactDetails.name) {
      updatedEmergencyContact.name = emergencyContact.name;
    }
    if (emergencyContact.email !== savedEmergencyContactDetails.email) {
      updatedEmergencyContact.email = emergencyContact.email;
    }
    if (
      emergencyContact.relationship !==
      savedEmergencyContactDetails.relationship
    ) {
      updatedEmergencyContact.relationship = emergencyContact.relationship;
    }
    if (
      emergencyContact.contactNumber !==
      savedEmergencyContactDetails.contactNumber
    ) {
      updatedEmergencyContact.contactNumber = emergencyContact.contactNumber;
    }
    if (emergencyContact.address !== savedEmergencyContactDetails.address) {
      updatedEmergencyContact.address = emergencyContact.address;
    }
    if (emergencyContact.city !== savedEmergencyContactDetails.city) {
      updatedEmergencyContact.city = emergencyContact.city;
    }
    if (emergencyContact.state !== savedEmergencyContactDetails.state) {
      updatedEmergencyContact.state = emergencyContact.state;
    }
    if (emergencyContact.zipCode !== savedEmergencyContactDetails.zipCode) {
      updatedEmergencyContact.zipCode = emergencyContact.zipCode;
    }
    if (emergencyContact.country !== savedEmergencyContactDetails.country) {
      updatedEmergencyContact.country = emergencyContact.country;
    }
    if (Object.keys(updatedEmergencyContact).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedEmergencyContact).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedEmergencyContactDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedEmergencyContact).length;
    } else {
      const emptyKeysInSavedEmergencyContactDetails = Object.entries(
        savedEmergencyContactDetails
      )
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedEmergencyContactDetails.filter(
        (key) => Object.keys(updatedEmergencyContact).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedEmergencyContact)) {
      objectToUpdate[`emergency_contact.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsEmergencyContactSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedEmergencyContactDetails({
            ...savedEmergencyContactDetails,
            ...updatedEmergencyContact,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("Emergency contact details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsEmergencyContactSaveLoading(false);
        })
        .catch((error) => {
          setSavedEmergencyContactDetails({ ...savedEmergencyContactDetails });
          console.error("[DB] => Emergency Contact: " + error);
          setSnackbarMessage("Failed to save emergency contact details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsEmergencyContactSaveLoading(false);
        });
    }
  }

  // Bank Details
  const [bankDetails, setBankDetails] = useState({});
  const [isBankDetailsLoading, setIsBankDetailsLoading] = useState(false);
  function handleBankDetailsSave() {
    if (
      !bankDetails.accountNumber ||
      !bankDetails.sortCode ||
      !bankDetails.bankName
    ) {
      setSnackbarMessage("All fields are required.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const bankExists = bankData.find(
      (bank) => bank.accountNumber === bankDetails.accountNumber
    );
    if (bankExists) {
      setSnackbarMessage(
        "A bank account with this account number already exists."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let objectToUpdate = { bank_details: arrayUnion(bankDetails) };
    setIsBankDetailsLoading(true);
    updateDetails(objectToUpdate, companyID, emailToFetch)
      .then(() => {
        if (bankData.length === 0) {
          // Update profile percentage
          const changedDate = {};
          changedDate[
            `employees_brief.${emailToFetch.replace(
              /\./g,
              "(dot)"
            )}.profilePercentage`
          ] = Math.round(PROFILE_PERCENTAGE + PERCENTAGE_PER_FIELD);
          updateEmployeeBrief(changedDate, companyID);
          PROFILE_PERCENTAGE += PERCENTAGE_PER_FIELD;
        }
        setBankData([...bankData, bankDetails]);
        setSnackbarMessage("Bank details saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsBankDetailsLoading(false);
      })
      .catch((error) => {
        console.error("[DB] => Bank Details: " + error);
        setSnackbarMessage("Failed to save bank details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsBankDetailsLoading(false);
      });
    setIsAddBankDialogOpen(false);
  }

  // Passport Details
  const [passportDetails, setPassportDetails] = useState({});
  useEffect(() => {
    setPassportDetails(savedPassportDetails);
  }, [savedPassportDetails]);
  const [isPassportDetailSaveLoading, setIsPassportDetailSaveLoading] =
    useState(false);
  function handlePassportDetailsSave() {
    const updatedPassportDetails = {};

    if (
      passportDetails.passportNumber !== savedPassportDetails.passportNumber
    ) {
      updatedPassportDetails.passportNumber = passportDetails.passportNumber;
    }
    if (passportDetails.issueCountry !== savedPassportDetails.issueCountry) {
      updatedPassportDetails.issueCountry = passportDetails.issueCountry;
    }
    if (passportDetails.issueDate !== savedPassportDetails.issueDate) {
      updatedPassportDetails.issueDate = passportDetails.issueDate;
    }
    if (passportDetails.expiryDate !== savedPassportDetails.expiryDate) {
      updatedPassportDetails.expiryDate = passportDetails.expiryDate;
    }
    if (Object.keys(updatedPassportDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (updatedPassportDetails.issueDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid issue date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (updatedPassportDetails.expiryDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid expiry date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedPassportDetails).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedPassportDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedPassportDetails).length;
    } else {
      const emptyKeysInSavedPassportDetails = Object.entries(
        savedPassportDetails
      )
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedPassportDetails.filter((key) =>
        Object.keys(updatedPassportDetails).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedPassportDetails)) {
      objectToUpdate[`passport_details.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsPassportDetailSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedPassportDetails({
            ...savedPassportDetails,
            ...updatedPassportDetails,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("Passport details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsPassportDetailSaveLoading(false);
        })
        .catch((error) => {
          setSavedPassportDetails({ ...savedPassportDetails });
          console.error("[DB] => Passport: " + error);
          setSnackbarMessage("Failed to save passport details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsPassportDetailSaveLoading(false);
        });
    }
  }

  // Visa Details
  const [visaDetails, setVisaDetails] = useState({});
  useEffect(() => {
    setVisaDetails(savedVisaDetails);
  }, [savedVisaDetails]);
  const [isVisaDetailSaveLoading, setIsVisaDetailSaveLoading] = useState(false);
  function handleVisaDetailsSave() {
    const updatedVisaDetails = {};

    if (visaDetails.visaNumber !== savedVisaDetails.visaNumber) {
      updatedVisaDetails.visaNumber = visaDetails.visaNumber;
    }
    if (visaDetails.visaType !== savedVisaDetails.visaType) {
      updatedVisaDetails.visaType = visaDetails.visaType;
    }
    if (visaDetails.issueCountry !== savedVisaDetails.issueCountry) {
      updatedVisaDetails.issueCountry = visaDetails.issueCountry;
    }
    if (visaDetails.issueDate !== savedVisaDetails.issueDate) {
      updatedVisaDetails.issueDate = visaDetails.issueDate;
    }
    if (visaDetails.expiryDate !== savedVisaDetails.expiryDate) {
      updatedVisaDetails.expiryDate = visaDetails.expiryDate;
    }
    if (Object.keys(updatedVisaDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (updatedVisaDetails.issueDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid issue date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (updatedVisaDetails.expiryDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid expiry date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedVisaDetails).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedVisaDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedVisaDetails).length;
    } else {
      const emptyKeysInSavedVisaDetails = Object.entries(savedVisaDetails)
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedVisaDetails.filter((key) =>
        Object.keys(updatedVisaDetails).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedVisaDetails)) {
      objectToUpdate[`visa_details.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsVisaDetailSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedVisaDetails({
            ...savedVisaDetails,
            ...updatedVisaDetails,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("Visa details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsVisaDetailSaveLoading(false);
        })
        .catch((error) => {
          setSavedVisaDetails({ ...savedVisaDetails });
          console.error("[DB] => Visa: " + error);
          setSnackbarMessage("Failed to save visa details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsVisaDetailSaveLoading(false);
        });
    }
  }

  // COS Details
  const [cosDetails, setCosDetails] = useState({});
  useEffect(() => {
    setCosDetails(savedCosDetails);
  }, [savedCosDetails]);
  const [isCosDetailSaveLoading, setIsCosDetailSaveLoading] = useState(false);
  function handleCosDetailsSave() {
    const updatedCosDetails = {};

    if (cosDetails.licenseNumber !== savedCosDetails.licenseNumber) {
      updatedCosDetails.licenseNumber = cosDetails.licenseNumber;
    }
    if (cosDetails.sponserName !== savedCosDetails.sponserName) {
      updatedCosDetails.sponserName = cosDetails.sponserName;
    }
    if (cosDetails.certificateNumber !== savedCosDetails.certificateNumber) {
      updatedCosDetails.certificateNumber = cosDetails.certificateNumber;
    }
    if (cosDetails.certificateDate !== savedCosDetails.certificateDate) {
      updatedCosDetails.certificateDate = cosDetails.certificateDate;
    }
    if (cosDetails.assignedDate !== savedCosDetails.assignedDate) {
      updatedCosDetails.assignedDate = cosDetails.assignedDate;
    }
    if (cosDetails.expiryDate !== savedCosDetails.expiryDate) {
      updatedCosDetails.expiryDate = cosDetails.expiryDate;
    }

    if (cosDetails.sponserNote !== savedCosDetails.sponserNote) {
      updatedCosDetails.sponserNote = cosDetails.sponserNote;
    }

    if (Object.keys(updatedCosDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (updatedCosDetails.certificateDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid certificate date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (updatedCosDetails.assignedDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid assigned date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (updatedCosDetails.expiryDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid expiry date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedCosDetails).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedCosDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedCosDetails).length;
    } else {
      const emptyKeysInSavedCosDetails = Object.entries(savedCosDetails)
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedCosDetails.filter((key) =>
        Object.keys(updatedCosDetails).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedCosDetails)) {
      objectToUpdate[`cos_details.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsCosDetailSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedCosDetails({
            ...savedCosDetails,
            ...updatedCosDetails,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("COS details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsCosDetailSaveLoading(false);
        })
        .catch((error) => {
          setSavedCosDetails({ ...savedCosDetails });
          console.error("[DB] => COS: " + error);
          setSnackbarMessage("Failed to save COS details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsCosDetailSaveLoading(false);
        });
    }
  }

  // Right To Work
  const [rightToWork, setRightToWork] = useState({});
  useEffect(() => {
    setRightToWork(savedRTWDetails);
  }, [savedRTWDetails]);
  const [isRightToWorkSaveLoading, setIsRightToWorkSaveLoading] =
    useState(false);
  function handleRightToWorkSave() {
    const updatedRtwDetails = {};

    if (rightToWork.shareCode !== savedRTWDetails.shareCode) {
      updatedRtwDetails.shareCode = rightToWork.shareCode;
    }
    if (rightToWork.expiryDate !== savedRTWDetails.expiryDate) {
      updatedRtwDetails.expiryDate = rightToWork.expiryDate;
    }
    if (rightToWork.rtwStatus !== savedRTWDetails.rtwStatus) {
      updatedRtwDetails.rtwStatus = rightToWork.rtwStatus;
    }
    if (Object.keys(updatedRtwDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (updatedRtwDetails.expiryDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid expiry date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Count number of new keys and emptied keys
    const newlyEmptiedKeysCount = Object.values(updatedRtwDetails).filter(
      (value) => value === null || value === ""
    ).length;
    let newlyAddedKeysCount;
    if (Object.keys(savedRTWDetails).length === 0) {
      // Adding new keys for the first time
      newlyAddedKeysCount = Object.keys(updatedRtwDetails).length;
    } else {
      const emptyKeysInSavedRtwDetails = Object.entries(savedRTWDetails)
        .filter(([key, value]) => value === null || value === "")
        .map(([key]) => key);
      newlyAddedKeysCount = emptyKeysInSavedRtwDetails.filter((key) =>
        Object.keys(updatedRtwDetails).includes(key)
      ).length;
    }
    // Calculate profile percentage
    let profilePercentage = PROFILE_PERCENTAGE;
    if (newlyEmptiedKeysCount > 0) {
      profilePercentage -= newlyEmptiedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (newlyAddedKeysCount > 0) {
      profilePercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }

    let objectToUpdate = {};
    for (const [key, value] of Object.entries(updatedRtwDetails)) {
      objectToUpdate[`rtw_details.${key}`] = value;
    }
    if (Object.keys(objectToUpdate).length !== 0) {
      setIsRightToWorkSaveLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          setSavedRTWDetails({
            ...savedRTWDetails,
            ...updatedRtwDetails,
          });
          // Update profile percentage
          if (profilePercentage != PROFILE_PERCENTAGE) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(profilePercentage);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE = profilePercentage;
          }
          setSnackbarMessage("RTW details saved successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsRightToWorkSaveLoading(false);
        })
        .catch((error) => {
          setSavedRTWDetails({ ...savedRTWDetails });
          console.error("[DB] => RTW: " + error);
          setSnackbarMessage("Failed to save RTW details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsRightToWorkSaveLoading(false);
        });
    }
  }

  // Upload Documents
  const [documentDetails, setDocumentDetails] = useState({});
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  async function handleDocumentUpload() {
    if (
      !documentDetails.fileName ||
      !documentDetails.file ||
      !documentDetails.description
    ) {
      setSnackbarMessage("All fields are required.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const docExists = documentsData.find(
      (doc) => doc.fileName === documentDetails.fileName
    );
    if (docExists) {
      setSnackbarMessage(
        "A document with the same name already exists. Please choose a different name."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    let docDetailsToSave = {
      fileName: documentDetails.fileName,
      savedAs: `${documentDetails.fileName}.${documentDetails.file.name
        .split(".")
        .pop()}`,
      description: documentDetails.description,
      uploadDate: dayjs().format("DD-MM-YYYY"),
      url: "",
    };
    setIsUploadDocumentsDialogOpen(false);
    setIsDocumentLoading(true);
    await uploadFileAndGetUrl(
      documentDetails.file,
      `${documentDetails.fileName}.${documentDetails.file.name
        .split(".")
        .pop()}`,
      companyID,
      emailToFetch
    )
      .then((url) => {
        docDetailsToSave.url = url;

        let objectToUpdate = {
          documents_details: arrayUnion(docDetailsToSave),
        };
        updateDetails(objectToUpdate, companyID, emailToFetch)
          .then(() => {
            setDocumentsData([...documentsData, docDetailsToSave]);
            setSnackbarMessage("Document saved successfully.");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setIsDocumentLoading(false);
          })
          .catch((error) => {
            console.error("[DB] => Upload Document: " + error);
            setSnackbarMessage("Failed to save document.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setIsDocumentLoading(false);
          });
      })
      .catch((error) => {
        console.error("[Storage] => Upload Document: " + error);
        setSnackbarMessage("Failed to upload document.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsDocumentLoading(false);
      });
  }

  // Delete Bank Details or Document
  async function handleDelete() {
    if (pickedItemToDelete.type === "bank") {
      // Delete bank details
      const { type, ...rest } = pickedItemToDelete;
      let objectToUpdate = { bank_details: arrayRemove(rest) };

      setIsBankDetailsLoading(true);
      updateDetails(objectToUpdate, companyID, emailToFetch)
        .then(() => {
          // Update profile percentage
          if (bankData.length === 1) {
            const changedDate = {};
            changedDate[
              `employees_brief.${emailToFetch.replace(
                /\./g,
                "(dot)"
              )}.profilePercentage`
            ] = Math.round(PROFILE_PERCENTAGE - PERCENTAGE_PER_FIELD);
            updateEmployeeBrief(changedDate, companyID);
            PROFILE_PERCENTAGE -= PERCENTAGE_PER_FIELD;
          }
          setBankData(
            bankData.filter(
              (bank) => bank.accountNumber !== pickedItemToDelete.accountNumber
            )
          );
          setSnackbarMessage("Bank details deleted successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsBankDetailsLoading(false);
        })
        .catch((error) => {
          console.error("[DB] => Bank Details Remove: " + error);
          setSnackbarMessage("Failed to delete bank details.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsBankDetailsLoading(false);
        });
      setDeleteDialogBoxOpen(false);
    }
    if (pickedItemToDelete.type === "document") {
      // Delete document
      const { type, ...rest } = pickedItemToDelete;
      let objectToUpdate = { documents_details: arrayRemove(rest) };
      setIsDocumentLoading(true);
      setDeleteDialogBoxOpen(false);
      await deleteFile(pickedItemToDelete.savedAs, companyID, emailToFetch)
        .then(() => {
          console.log("[Storage] => Document deleted.");

          updateDetails(objectToUpdate, companyID, emailToFetch)
            .then(() => {
              setDocumentsData(
                documentsData.filter(
                  (doc) => doc.fileName !== pickedItemToDelete.fileName
                )
              );
              setSnackbarMessage("Document deleted successfully.");
              setSnackbarSeverity("success");
              setSnackbarOpen(true);
              setIsDocumentLoading(false);
            })
            .catch((error) => {
              console.error("[DB] => Document Remove: " + error);
              setSnackbarMessage("Failed to delete document.");
              setSnackbarSeverity("error");
              setSnackbarOpen(true);
              setIsDocumentLoading(false);
            });
        })
        .catch((error) => {
          console.error("[Storage] => Delete Document: " + error);
          setSnackbarMessage("Failed to remove document.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsDocumentLoading(false);
        });
    }
  }

  // Delete Employee
  const [isEmployeeDeleteLoading, setIsEmployeeDeleteLoading] = useState(false);
  async function handleEmployeeDelete() {
    setIsEmployeeDeleteLoading(true);
    await deleteEmployee(email, companyID)
      .then(() => {
        setSnackbarMessage(
          "Employee deleted, Please allow 2-5 minutes for changes to reflect."
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsEmployeeDeleteLoading(false);
        navigate("/employees");
      })
      .catch((error) => {
        console.error("[DB] => Employee Delete: " + error);
        if (error === "USR_IS_ADMIN") {
          setSnackbarMessage(
            "Administrator account cannot be deleted, Please contact support."
          );
        } else {
          setSnackbarMessage("Failed to delete employee profile.");
        }
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsEmployeeDeleteLoading(false);
      });
    setIsEmployeeDeleteLoading(false);
  }

  return (
    <div
      style={{
        overflow: "auto",
        height: isTablet ? "94%" : "92%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Profile pic starts here */}

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "10px",
        }}
      >
        {isPageLoading || isProfilePicLoading ? (
          <Skeleton
            variant="circular"
            width={100}
            height={100}
            sx={{ mr: 2 }}
          />
        ) : (
          <Avatar
            sx={{
              width: "100px",
              height: "100px",
              mr: 2,
              cursor: isAdmin ? "pointer" : "auto",
              fontSize: "2rem",
            }}
            alt={employeeWorkProfileData["Employee Name"]}
            src={savedProfilePic}
            onClick={() => isAdmin && setIsProfilePicDialogOpen(true)}
            style={{
              backgroundColor: "#f4a322",
            }}
          >
            {employeeWorkProfileData["Employee Name"] &&
              employeeWorkProfileData["Employee Name"]
                .split(" ")
                .map((word) => word.charAt(0))
                .join("")}
          </Avatar>
        )}
        <Box>
          <Typography variant="h6">
            {isPageLoading ? (
              <Skeleton sx={{ width: "120px" }} />
            ) : (
              <b>{employeeWorkProfileData["Employee Name"]}</b>
            )}
          </Typography>
          <Typography variant="body1">
            {isPageLoading ? (
              <Skeleton />
            ) : (
              <i>{employeeWorkProfileData["Position"]}</i>
            )}
          </Typography>
        </Box>
      </Box>
      {/* Profile pic ends here */}

      {/* Work Profile starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <WorkIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Work Profile
          </Typography>
        </div>
        {isPageLoading ? (
          <Skeleton
            width={isMobile ? "88vw" : isTablet ? "62vw" : "78vw"}
            height={"12vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        ) : (
          <TableContainer
            component={Paper}
            sx={{ ...tableContainerStyles, maxHeight: "50vh" }}
          >
            <Table>
              <TableBody>
                {Object.entries(employeeWorkProfileData).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell>
                      <i>{key}</i>
                    </TableCell>
                    <TableCell>{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      {/* Work Profile ends here */}
      {/* Personal Profile starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <AccountCircleIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Personal Profile
          </Typography>
        </div>
        <Grid
          container
          style={{
            marginTop: "10px",
            paddingBottom: "20px",
            paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
            marginLeft: "auto",
            marginRight: "auto",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={320} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date of Birth"
                  value={
                    personalDetails.dateOfBirth
                      ? dayjs(personalDetails.dateOfBirth, "DD-MM-YYYY")
                      : null
                  }
                  onChange={(value) => {
                    setPersonalDetails({
                      ...personalDetails,
                      dateOfBirth: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  disabled={!isAdmin}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                      backgroundColor: "#4b49ac10",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#4b49ac",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Home Phone"
                variant="outlined"
                size="small"
                name="homePhone"
                type="number"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={personalDetails.homePhone || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    homePhone: e.target.value,
                  });
                }}
                disabled={!isAdmin}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#7da0fa10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
                  },
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      display: "none",
                    },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Personal Email"
                variant="outlined"
                size="small"
                name="personalEmail"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                type="email"
                value={personalDetails.personalEmail || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    personalEmail: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#7da0fa10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <FormControl
                fullWidth
                size="small"
                disabled={!isAdmin}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#74b58110",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                  },
                }}
              >
                <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                  Gender
                </InputLabel>
                <Select
                  label="Gender"
                  value={personalDetails.gender || ""}
                  onChange={(e) => {
                    setPersonalDetails({
                      ...personalDetails,
                      gender: e.target.value,
                    });
                  }}
                  sx={{ fontFamily: "'Open Sans', Arial" }}
                >
                  <MenuItem value={"male"}>Male</MenuItem>
                  <MenuItem value={"female"}>Female</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <FormControl
                fullWidth
                size="small"
                disabled={!isAdmin}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#74b58110",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                  },
                }}
              >
                <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                  Marital Status
                </InputLabel>
                <Select
                  label="Marital Status"
                  value={personalDetails.maritalStatus || ""}
                  onChange={(e) => {
                    setPersonalDetails({
                      ...personalDetails,
                      maritalStatus: e.target.value,
                    });
                  }}
                  sx={{ fontFamily: "'Open Sans', Arial" }}
                >
                  <MenuItem value={"single"}>Single</MenuItem>
                  <MenuItem value={"married"}>Married</MenuItem>
                  <MenuItem value={"divorced"}>Divorced</MenuItem>
                  <MenuItem value={"widowed"}>Widowed</MenuItem>
                </Select>
              </FormControl>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Nationality"
                variant="outlined"
                name="nationality"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.nationality || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    nationality: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#7da0fa10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Address"
                variant="outlined"
                name="address"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.address || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    address: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#4b49ac10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="City"
                variant="outlined"
                name="city"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.city || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    city: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#ffc85d10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="State/Province"
                variant="outlined"
                name="state"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.state || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    state: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#ffc85d10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Zip/Postal Code"
                variant="outlined"
                name="zipCode"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.zipCode || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    zipCode: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#74b58110",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Country"
                variant="outlined"
                name="country"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={personalDetails.country || ""}
                onChange={(e) => {
                  setPersonalDetails({
                    ...personalDetails,
                    country: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#4b49ac10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                  },
                }}
              />
            )}
          </Grid>
        </Grid>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isPersonalDetailsSaveLoading}
              onClick={() => handlePersonalDetailsSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isPersonalDetailsSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </Box>
      {/* Personal Profile ends here */}
      {/* Emergency Contact starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <ContactEmergencyIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Emergency Contact
          </Typography>
        </div>
        <Grid
          container
          style={{
            marginTop: "10px",
            paddingBottom: "20px",
            paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
            marginLeft: "auto",
            marginRight: "auto",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Full Name"
                variant="outlined"
                size="small"
                name="EmergencyFullName"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.name || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    name: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Email"
                variant="outlined"
                size="small"
                name="emergencyEmail"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.email || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    email: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Relationship"
                variant="outlined"
                size="small"
                name="emergencyRelationship"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.relationship || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    relationship: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
                    backgroundColor: "#7da0fa10",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Contact Number"
                variant="outlined"
                size="small"
                name="emergencyPhoneNumber"
                type="number"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.contactNumber || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    contactNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      display: "none",
                    },
                  "& input[type=number]": {
                    MozAppearance: "textfield",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Address"
                variant="outlined"
                name="address"
                size="small"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.address || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    address: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="City"
                variant="outlined"
                name="city"
                size="small"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.city || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    city: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="State/Province"
                variant="outlined"
                name="state"
                size="small"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.state || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    state: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Zip/Postal Code"
                variant="outlined"
                name="zipCode"
                size="small"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.zipCode || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    zipCode: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Country"
                variant="outlined"
                name="country"
                size="small"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={emergencyContact.country || ""}
                onChange={(e) => {
                  setEmergencyContact({
                    ...emergencyContact,
                    country: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
              />
            )}
          </Grid>
        </Grid>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isEmergencyContactSaveLoading}
              onClick={() => handleEmergencyContactSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isEmergencyContactSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </Box>
      {/* Emergency Contact ends here */}
      {/* Bank details starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginLeft: "auto",
          marginRight: "auto",
          paddingBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingTop: "14px",
            width: "99%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <AccountBalanceIcon
              style={{
                marginLeft: "20px",
                marginTop: "2px",
                fontSize: "30px",
                color: "#f4a322",
              }}
            />
            <Typography
              variant="h6"
              style={{
                fontWeight: "500",
                marginLeft: "14px",
                marginTop: "2px",
              }}
            >
              Bank Details
            </Typography>
          </div>

          {isAdmin && (
            <Button
              variant="contained"
              disabled={isPageLoading || isBankDetailsLoading}
              onClick={() => {
                setIsAddBankDialogOpen(true);
              }}
              sx={{
                backgroundColor: "#4b49ac",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#2f2cce" },
              }}
            >
              <AddIcon style={{ marginRight: "12px", fontSize: "24px" }} />
              Bank
            </Button>
          )}
        </div>
        {isPageLoading ? (
          <Skeleton
            width={isMobile ? "88vw" : isTablet ? "62vw" : "78vw"}
            height={"12vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        ) : bankData.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4}>
            <i>No Bank Details Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Bank Name</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Account Number
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>Sort Code</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {bankData.map((bank) => (
                  <TableRow key={bank.accountNumber}>
                    <TableCell style={tableBodyStyles}>
                      {bank.bankName}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {bank.accountNumber}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {bank.sortCode}
                    </TableCell>
                    {isAdmin && (
                      <TableCell style={tableBodyStyles}>
                        <DeleteIcon
                          onClick={() => {
                            setDeleteDialogBoxOpen(true);
                            setDeleteDialogBoxTitle("Delete Bank Details?");
                            setDeleteDialogBoxContent(
                              'Are you sure you want to delete "' +
                                bank.bankName +
                                '" details ?'
                            );
                            setPickedItemToDelete({ ...bank, type: "bank" });
                          }}
                          sx={{
                            cursor: isAdmin ? "pointer" : "default",
                            color: "#ed4337",
                            borderRadius: "20%",
                            padding: "2px",
                            ":hover": {
                              backgroundColor: "#a9a9a9",
                            },
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      {/* Bank details ends here */}
      {/* Passport starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <BadgeIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Passport Details
          </Typography>
        </div>
        <Grid
          container
          style={{
            marginTop: "10px",
            paddingBottom: "20px",
            paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
            marginLeft: "auto",
            marginRight: "auto",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Passport Number"
                variant="outlined"
                size="small"
                name="passportNumber"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={passportDetails.passportNumber || ""}
                onChange={(e) => {
                  setPassportDetails({
                    ...passportDetails,
                    passportNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Country of Issue"
                variant="outlined"
                size="small"
                name="countryOfIssue"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={passportDetails.issueCountry || ""}
                onChange={(e) => {
                  setPassportDetails({
                    ...passportDetails,
                    issueCountry: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Issued Date"
                  value={
                    passportDetails.issueDate
                      ? dayjs(passportDetails.issueDate, "DD-MM-YYYY")
                      : null
                  }
                  onChange={(value) => {
                    setPassportDetails({
                      ...passportDetails,
                      issueDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  disabled={!isAdmin}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#4b49ac",
                        backgroundColor: "#4b49ac10",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Expiration Date"
                  value={
                    passportDetails.expiryDate
                      ? dayjs(passportDetails.expiryDate, "DD-MM-YYYY")
                      : null
                  }
                  onChange={(value) => {
                    setPassportDetails({
                      ...passportDetails,
                      expiryDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  disabled={!isAdmin}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#f3887c",
                        backgroundColor: "#f3887c10",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
        </Grid>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isPassportDetailSaveLoading}
              onClick={() => handlePassportDetailsSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isPassportDetailSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </Box>
      {/* Passport ends here */}
      {/* Visa starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <ArticleIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Visa Details
          </Typography>
        </div>
        <Grid
          container
          style={{
            marginTop: "10px",
            paddingBottom: "20px",
            paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
            marginLeft: "auto",
            marginRight: "auto",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Visa Number"
                variant="outlined"
                size="small"
                name="visaNumber"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={visaDetails.visaNumber || ""}
                onChange={(e) => {
                  setVisaDetails({
                    ...visaDetails,
                    visaNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Visa Type"
                variant="outlined"
                size="small"
                name="visaType"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={visaDetails.visaType || ""}
                onChange={(e) => {
                  setVisaDetails({
                    ...visaDetails,
                    visaType: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Country of Issue"
                variant="outlined"
                size="small"
                name="countryOfIssue"
                disabled={!isAdmin}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={visaDetails.issueCountry || ""}
                onChange={(e) => {
                  setVisaDetails({
                    ...visaDetails,
                    issueCountry: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Issued Date"
                  value={
                    visaDetails.issueDate
                      ? dayjs(visaDetails.issueDate, "DD-MM-YYYY")
                      : null
                  }
                  onChange={(value) => {
                    setVisaDetails({
                      ...visaDetails,
                      issueDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  disabled={!isAdmin}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#4b49ac",
                        backgroundColor: "#4b49ac10",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Expiration Date"
                  value={
                    visaDetails.expiryDate
                      ? dayjs(visaDetails.expiryDate, "DD-MM-YYYY")
                      : null
                  }
                  disabled={!isAdmin}
                  onChange={(value) => {
                    setVisaDetails({
                      ...visaDetails,
                      expiryDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#f3887c",
                        backgroundColor: "#f3887c10",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
        </Grid>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isVisaDetailSaveLoading}
              onClick={() => handleVisaDetailsSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isVisaDetailSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </Box>
      {/* Visa ends here */}
      {/* COS starts here */}
      {employeeWorkProfileData["Sponsored Employee"] === "Yes" && (
        <Box
          sx={{
            width: isTablet ? "96%" : "98%",
            backgroundColor: "#fff",
            margin: "10px 20px 10px 0",
            boxShadow: "0px 4px 4px #CCCCCC",
            borderRadius: "12px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div style={{ display: "flex", paddingTop: "10px" }}>
            <ArticleIcon
              style={{
                marginLeft: "20px",
                marginTop: "2px",
                fontSize: "30px",
                color: "#f4a322",
              }}
            />
            <Typography
              variant="h6"
              style={{
                fontWeight: "500",
                marginLeft: "14px",
                marginTop: "2px",
              }}
            >
              COS Details
            </Typography>
          </div>
          <Grid
            container
            style={{
              marginTop: "10px",
              paddingBottom: "20px",
              paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
              marginLeft: "auto",
              marginRight: "auto",
              width: "100%",
            }}
            spacing={2}
          >
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="License Number"
                  variant="outlined"
                  size="small"
                  name="licenseNumber"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  disabled={!isAdmin}
                  value={cosDetails.licenseNumber || ""}
                  onChange={(e) => {
                    setCosDetails({
                      ...cosDetails,
                      licenseNumber: e.target.value,
                    });
                  }}
                  sx={{
                    width: "320px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#74b581",
                        backgroundColor: "#74b58110",
                      },
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Sponsor's Name"
                  variant="outlined"
                  size="small"
                  name="sponsorName"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  disabled={!isAdmin}
                  value={cosDetails.sponserName || ""}
                  onChange={(e) => {
                    setCosDetails({
                      ...cosDetails,
                      sponserName: e.target.value,
                    });
                  }}
                  sx={{
                    width: "320px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#4b49ac",
                        backgroundColor: "#4b49ac10",
                      },
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Certificate Number"
                  variant="outlined"
                  size="small"
                  name="certificateNumber"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  disabled={!isAdmin}
                  value={cosDetails.certificateNumber || ""}
                  onChange={(e) => {
                    setCosDetails({
                      ...cosDetails,
                      certificateNumber: e.target.value,
                    });
                  }}
                  sx={{
                    width: "320px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#74b581",
                        backgroundColor: "#74b58110",
                      },
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Certificate Date"
                    value={
                      cosDetails.certificateDate
                        ? dayjs(cosDetails.certificateDate, "DD-MM-YYYY")
                        : null
                    }
                    onChange={(value) => {
                      setCosDetails({
                        ...cosDetails,
                        certificateDate: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    slotProps={{ textField: { size: "small" } }}
                    disabled={!isAdmin}
                    sx={{
                      width: 320,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#4b49ac",
                          backgroundColor: "#4b49ac10",
                        },
                    }}
                  />
                </LocalizationProvider>
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Assigned Date"
                    value={
                      cosDetails.assignedDate
                        ? dayjs(cosDetails.assignedDate, "DD-MM-YYYY")
                        : null
                    }
                    onChange={(value) => {
                      setCosDetails({
                        ...cosDetails,
                        assignedDate: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    slotProps={{ textField: { size: "small" } }}
                    disabled={!isAdmin}
                    sx={{
                      width: 320,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#4b49ac",
                          backgroundColor: "#4b49ac10",
                        },
                    }}
                  />
                </LocalizationProvider>
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Expiration Date"
                    value={
                      cosDetails.expiryDate
                        ? dayjs(cosDetails.expiryDate, "DD-MM-YYYY")
                        : null
                    }
                    onChange={(value) => {
                      setCosDetails({
                        ...cosDetails,
                        expiryDate: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    slotProps={{ textField: { size: "small" } }}
                    disabled={!isAdmin}
                    sx={{
                      width: 320,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#f3887c",
                          backgroundColor: "#f3887c10",
                        },
                    }}
                  />
                </LocalizationProvider>
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"320px"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Sponsor's Note"
                  variant="outlined"
                  size="small"
                  name="sponsorNote"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={cosDetails.sponserNote || ""}
                  disabled={!isAdmin}
                  onChange={(e) => {
                    setCosDetails({
                      ...cosDetails,
                      sponserNote: e.target.value,
                    });
                  }}
                  sx={{
                    width: "320px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#4b49ac",
                        backgroundColor: "#4b49ac10",
                      },
                  }}
                />
              )}
            </Grid>
          </Grid>
          {isAdmin && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingBottom: "20px",
              }}
            >
              <Button
                variant="contained"
                disabled={isPageLoading || isCosDetailSaveLoading}
                onClick={() => handleCosDetailsSave()}
                sx={{
                  backgroundColor: "#74b581",
                  width: "120px",
                  height: "36px",
                  textTransform: "none",
                  borderRadius: "18px",
                  marginRight: isMobile ? "20px" : "40px",
                  fontFamily: "'Roboto', sans-serif",
                  ":hover": { backgroundColor: "#73a47c", color: "#000" },
                }}
              >
                {isCosDetailSaveLoading ? (
                  <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
                ) : (
                  <>
                    <SaveIcon
                      style={{ marginRight: "12px", fontSize: "24px" }}
                    />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </Box>
      )}
      {/* COS ends here */}
      {/* Right To Work starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          boxShadow: "0px 4px 4px #CCCCCC",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <ArticleIcon
            style={{
              marginLeft: "20px",
              marginTop: "2px",
              fontSize: "30px",
              color: "#f4a322",
            }}
          />
          <Typography
            variant="h6"
            style={{
              fontWeight: "500",
              marginLeft: "14px",
              marginTop: "2px",
            }}
          >
            Right To Work
          </Typography>
        </div>
        <Grid
          container
          style={{
            marginTop: "10px",
            paddingBottom: "20px",
            paddingLeft: isMobile ? "12px" : isTablet ? "40px" : "0px",
            marginLeft: "auto",
            marginRight: "auto",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Share Code"
                variant="outlined"
                size="small"
                name="shareCode"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                disabled={!isAdmin}
                value={rightToWork.shareCode || ""}
                onChange={(e) => {
                  setRightToWork({
                    ...rightToWork,
                    shareCode: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Expiration Date"
                  value={
                    rightToWork.expiryDate
                      ? dayjs(rightToWork.expiryDate, "DD-MM-YYYY")
                      : null
                  }
                  onChange={(value) => {
                    setRightToWork({
                      ...rightToWork,
                      expiryDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  format="DD-MM-YYYY"
                  slotProps={{ textField: { size: "small" } }}
                  disabled={!isAdmin}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#f3887c",
                        backgroundColor: "#f3887c10",
                      },
                  }}
                />
              </LocalizationProvider>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"320px"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="RTW Status"
                variant="outlined"
                size="small"
                name="rtwStatus"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={rightToWork.rtwStatus || ""}
                disabled={!isAdmin}
                onChange={(e) => {
                  setRightToWork({
                    ...rightToWork,
                    rtwStatus: e.target.value,
                  });
                }}
                sx={{
                  width: "320px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
              />
            )}
          </Grid>
        </Grid>
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isRightToWorkSaveLoading}
              onClick={() => handleRightToWorkSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isRightToWorkSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </Box>
      {/* Right To Work ends here */}
      {/* Documents starts here */}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginLeft: "auto",
          marginRight: "auto",
          paddingBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingTop: "14px",
            width: "99%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <AttachFileIcon
              style={{
                marginLeft: "20px",
                marginTop: "2px",
                fontSize: "30px",
                color: "#f4a322",
              }}
            />
            <Typography
              variant="h6"
              style={{
                fontWeight: "500",
                marginLeft: "14px",
                marginTop: "2px",
              }}
            >
              Documents
            </Typography>
          </div>
          {isAdmin && (
            <Button
              variant="contained"
              disabled={isPageLoading || isDocumentLoading}
              onClick={() => {
                setIsUploadDocumentsDialogOpen(true);
              }}
              sx={{
                backgroundColor: "#7da0fa",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#5484ff" },
              }}
            >
              <AddIcon style={{ marginRight: "12px", fontSize: "24px" }} />
              Document
            </Button>
          )}
        </div>
        {isPageLoading || isDocumentLoading ? (
          <Skeleton
            width={isMobile ? "88vw" : isTablet ? "62vw" : "78vw"}
            height={"12vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        ) : documentsData.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4}>
            <i>No Documents Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>File Name</TableCell>
                  {/* <TableCell style={tableHeaderStyles}>Upload Date</TableCell> */}
                  <TableCell style={tableHeaderStyles}>Description</TableCell>
                  <TableCell style={tableHeaderStyles}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentsData.map((document) => (
                  <TableRow key={document.fileName}>
                    <TableCell style={tableBodyStyles}>
                      <b>{document.fileName}</b>
                    </TableCell>
                    {/* <TableCell style={tableBodyStyles}>
                      {document.uploadDate}
                    </TableCell> */}
                    <TableCell style={tableBodyStyles}>
                      <i>{document.description}</i>
                    </TableCell>
                    <TableCell
                      style={{
                        ...tableBodyStyles,
                        display: "flex",
                        justifyContent: "space-evenly",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          backgroundColor: "#74b581",
                          color: "#fff",
                          fontWeight: "500",
                          position: "relative",
                          height: "20px",
                          borderRadius: "10px",
                          "& .MuiButton-startIcon": { margin: "0px" },
                          ":hover": { backgroundColor: "#73a47c" },
                        }}
                        onClick={() => {
                          window.open(document.url, "_blank");
                        }}
                        startIcon={<CloudDownloadIcon />}
                      ></Button>
                      {isAdmin && (
                        <DeleteIcon
                          onClick={() => {
                            setDeleteDialogBoxOpen(true);
                            setDeleteDialogBoxTitle("Delete Document?");
                            setDeleteDialogBoxContent(
                              'Are you sure you want to delete document "' +
                                document.fileName +
                                '"?'
                            );
                            setPickedItemToDelete({
                              ...document,
                              type: "document",
                            });
                          }}
                          sx={{
                            cursor: "pointer",
                            color: "#ed4337",
                            borderRadius: "20%",
                            padding: "2px",
                            ":hover": { backgroundColor: "#a9a9a9" },
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      {/* Documents ends here */}
      {/* Delete User Accordion starts here */}
      {email != null && isAdmin && (
        <Accordion
          sx={{
            width: isMobile ? "88vw" : isTablet ? "62vw" : "75vw",
            borderRadius: "20px",
            margin: "16px 0 16px 0",
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel3-content"
            id="panel3-header"
            sx={{
              fontWeight: "800",
              fontSize: "1.1rem",
              backgroundColor: "#e5737330",
              color: "#ed4337",
              borderRadius: "20px 20px 0 0",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Danger Zone
          </AccordionSummary>
          <AccordionDetails sx={{ fontFamily: "'Open Sans', Arial" }}>
            <b>Delete employee profile.</b> <br />
            <i>
              Deleting an employee profile will delete all related data,
              documents and this action cannot be undone.
            </i>
          </AccordionDetails>
          <AccordionActions>
            <Button
              variant="contained"
              disabled={isPageLoading || isEmployeeDeleteLoading}
              sx={{
                backgroundColor: "#ed4337",
                color: "#fff",
                borderRadius: "20px",
                textTransform: "none",
                ":hover": { backgroundColor: "#ed433740", color: "#ed4337" },
              }}
              onClick={() => {
                handleEmployeeDelete();
              }}
            >
              {isEmployeeDeleteLoading ? (
                <CircularProgress size={24} sx={{ color: "#ed4337" }} />
              ) : (
                <> Delete Employee</>
              )}
            </Button>
          </AccordionActions>
        </Accordion>
      )}
      {/* Delete User Accordion ends here */}
      {/* Upload Profile Pic dialog box starts here */}
      <Dialog
        open={isProfilePicDialogOpen}
        onClose={() => setIsProfilePicDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <AddAPhotoIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box>Profile Picture</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            display={"flex"}
            alignItems={"center"}
            sx={{ paddingTop: "8px" }}
          >
            <TextField
              label="Profile Picture"
              variant="outlined"
              size="small"
              name="profilePicture"
              type="file"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
                shrink: true,
              }}
              onChange={(e) => {
                setProfilePic(e.target.files[0]);
              }}
              sx={{
                width: "80%",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#Ffc85d",
                  backgroundColor: "#Ffc85d10",
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={!savedProfilePic}
            sx={{ color: "#ed4337", marginRight: "10vw" }}
            onClick={() => handleProfilePicChange("delete")}
          >
            Delete
          </Button>
          <Button onClick={() => setIsProfilePicDialogOpen(false)}>
            Close
          </Button>
          <Button
            sx={{ color: "#74b581" }}
            onClick={() => handleProfilePicChange("upload")}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      {/* Upload Profile Pic dialog box ends here */}
      {/* Add Bank details dialog box starts here */}
      <Dialog
        open={isAddBankDialogOpen}
        onClose={() => {
          setIsAddBankDialogOpen(false);
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <AccountBalanceIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box> Add Bank Details</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid
            container
            style={{
              width: "100%",
            }}
            spacing={2}
            marginTop={"6px"}
          >
            <Grid item xs={12} md={6}>
              <TextField
                id="AccountNumber"
                label="Account Number"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                onChange={(e) => {
                  setBankDetails({
                    ...bankDetails,
                    accountNumber: e.target.value,
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                id="SortCode"
                label="Sort Code"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                onChange={(e) => {
                  setBankDetails({
                    ...bankDetails,
                    sortCode: e.target.value,
                  });
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                id="BankName"
                label="Bank Name"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
                    backgroundColor: "#7da0fa10",
                  },
                }}
                onChange={(e) => {
                  setBankDetails({
                    ...bankDetails,
                    bankName: e.target.value,
                  });
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsAddBankDialogOpen(false);
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleBankDetailsSave}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Bank details dialog box ends here */}
      {/* Upload document dialog box starts here */}
      <Dialog
        open={isUploadDocumentsDialogOpen}
        onClose={() => {
          setIsUploadDocumentsDialogOpen(false);
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <AttachFileIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box>Upload A Document</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid
            container
            style={{
              width: "100%",
            }}
            spacing={2}
            marginTop={"6px"}
          >
            <Grid item xs={12} md={6}>
              <TextField
                id="FileName"
                label="File Name"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                onChange={(e) => {
                  setDocumentDetails({
                    ...documentDetails,
                    fileName: e.target.value,
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Upload File"
                variant="outlined"
                size="small"
                name="file"
                type="file"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                  shrink: true,
                }}
                onChange={(e) => {
                  setDocumentDetails({
                    ...documentDetails,
                    file: e.target.files[0],
                  });
                }}
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                id="Description"
                label="Description"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                onChange={(e) => {
                  setDocumentDetails({
                    ...documentDetails,
                    description: e.target.value,
                  });
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsUploadDocumentsDialogOpen(false);
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleDocumentUpload}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* Upload document dialog box ends here */}
      {/* Delete Dialog Box */}
      <Dialog
        open={deleteDialogBoxOpen}
        onClose={() => setDeleteDialogBoxOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <DeleteIcon
              sx={{
                color: "#ed4337",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box> {deleteDialogBoxTitle}</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {deleteDialogBoxContent}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogBoxOpen(false)}>No</Button>
          <Button onClick={() => handleDelete()} sx={{ color: "#ed4337" }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Delete Dialog Box */}
    </div>
  );
}

export default Profile;
