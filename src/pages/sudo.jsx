import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
} from "@mui/material";
import AddBusinessOutlinedIcon from "@mui/icons-material/AddBusinessOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import Tooltip from "@mui/material/Tooltip";
import CardMembershipIcon from "@mui/icons-material/CardMembership";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import SaveIcon from "@mui/icons-material/Save";
import PaymentsIcon from "@mui/icons-material/Payments";
import PaymentIcon from "@mui/icons-material/Payment";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import {
  firebaseAuth,
  firebaseDb,
  firebaseStorage,
} from "../firebase/baseConfig";
import { signOutUser } from "../firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
  collection,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  deleteObject,
  listAll,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const tableContainerStyles = {
  borderRadius: "20px",
  width: "95vw",
  marginTop: "10px",
  marginBottom: "10px",
  maxHeight: "95vh",
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

const actionBtnStyles = {
  cursor: "pointer",
  borderRadius: "20%",
  padding: "2px",
  ":hover": { backgroundColor: "#D3D3D3" },
};

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
function updateCompany(companyID, data) {
  return new Promise((resolve, reject) => {
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    updateDoc(companyDocRef, data)
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function deleteCompany(companyID) {
  return new Promise(async (resolve, reject) => {
    try {
      const companyDocRef = doc(firebaseDb, "companies", companyID);
      const subcollections = [
        "employees",
        "notifications",
        "timesheets",
        "leaves",
        "announcements",
        "tasks",
        "payslips",
      ];
      let employeeEmails = [];
      // Delete all documents in each subcollection
      for (const subcollection of subcollections) {
        const subcollectionRef = collection(companyDocRef, subcollection);
        const subDocs = await getDocs(subcollectionRef);
        for (const subDoc of subDocs.docs) {
          if (subcollection === "employees") {
            employeeEmails.push(subDoc.data().email);
          }
          deleteDoc(subDoc.ref);
        }
      }

      // Delete objects from Storage (if any)
      for (const email of employeeEmails) {
        const storageRef = ref(firebaseStorage, `${companyID}/${email}`);
        const listResult = await listAll(storageRef);
        if (listResult.items.length !== 0) {
          for (const itemRef of listResult.items) {
            await deleteObject(itemRef);
          }
        }
      }

      // Delete employee emails from users collection
      for (const email of employeeEmails) {
        const usersDocRef = doc(firebaseDb, "users", email);
        deleteDoc(usersDocRef);
      }

      // Finally, Delete company document
      deleteDoc(companyDocRef);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function addCompany(companyName, adminName, email) {
  return new Promise(async (resolve, reject) => {
    const trimmedCompanyName = companyName.replace(/\s/g, "");
    const docID = `${trimmedCompanyName}(${Timestamp.now().seconds})`;
    const date = new Date().toISOString().slice(0, 10);
    const [year, month, day] = date.split("-");
    const formattedDate = `${day}-${month}-${year}`;

    // Get the date one year from now
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const dateOneYearFromNow = oneYearFromNow.toISOString().slice(0, 10);
    const [yearOneYear, monthOneYear, dayOneYear] =
      dateOneYearFromNow.split("-");
    const formattedDateOneYear = `${dayOneYear}-${monthOneYear}-${yearOneYear}`;
    oneYearFromNow.setHours(0, 0, 0, 0);

    // Get the date one month from now
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    oneMonthFromNow.setHours(0, 0, 0, 0);
    const dateOneMonthFromNow = oneMonthFromNow.toISOString().slice(0, 10);
    const [yearOneMonth, monthOneMonth, dayOneMonth] =
      dateOneMonthFromNow.split("-");
    const formattedDateOneMonth = `${dayOneMonth}-${monthOneMonth}-${yearOneMonth}`;

    try {
      const usersDocRef = doc(firebaseDb, `users/${email}`);
      const docSnap = await getDoc(usersDocRef);
      if (docSnap.exists()) {
        reject("EMAIL_ALREADY_EXIST");
        return;
      }

      const companyDocRef = doc(firebaseDb, "companies", docID);
      setDoc(companyDocRef, {
        companyEmail: email,
        companyName: companyName,
        companyID: docID,
        isDisabled: false,
        employees_brief: {
          [email.replace(/\./g, "(dot)")]: {
            email: email,
            isSponsored: false,
            name: adminName,
            position: "Administrator",
            startDate: formattedDate,
            profilePercentage: 10,
          },
        },
        leavesAllowed: {
          annualLeavesAllowed: 28,
          sickLeavesAllowed: 3,
        },
        positions: [
          {
            name: "Administrator",
            code: "Admin",
            desc: "Topmost manager of the company. This person has full access to all features of the app.",
          },
        ],
        subscription: "Basic",
        payments: [],
        renewalDate: formattedDateOneMonth,
      });
      setDoc(doc(companyDocRef, "employees", email), {
        name: adminName,
        position: "Administrator",
        email: email,
        isSponsored: false,
        startDate: formattedDate,
      });
      setDoc(doc(companyDocRef, "leaves", email), {
        name: `${adminName} (${email})`,
        durStartDate: formattedDate,
        durEndDate: formattedDateOneYear,
        annualLeavesBalance: 28,
        sickLeavesBalance: 3,
        resetDate: Timestamp.fromDate(oneYearFromNow),
      });
      setDoc(doc(firebaseDb, "users", email), {
        name: adminName,
        companyID: docID,
        companyName: companyName,
        email: email,
        position: "Administrator",
      });

      const createdCompDetails = {
        id: docID,
        companyName: companyName,
        companyEmail: email,
        createdAt: formattedDate,
        adminName: adminName,
        adminEmail: email,
        totEmployees: 1,
        isDisabled: false,
        subscription: "Basic",
        payments: [],
        renewalDate: formattedDateOneMonth,
      };
      resolve(createdCompDetails);
    } catch (error) {
      reject(error);
    }
  });
}

function getCompanies() {
  return new Promise(async (resolve, reject) => {
    await getDocs(collection(firebaseDb, "companies"))
      .then((companiesSnap) => {
        let allCompanies = [];
        companiesSnap.forEach((doc) => {
          const employees = doc.data().employees_brief;
          let adminName = "";
          let adminEmail = "";
          let createdAt = "";
          let totEmployees = 0;
          Object.keys(employees).forEach((key) => {
            if (employees[key].position === "Administrator") {
              adminName = employees[key].name;
              adminEmail = employees[key].email;
              createdAt = employees[key].startDate;
            }
            totEmployees += 1;
          });
          const compDetails = {
            id: doc.id,
            companyName: doc.data().companyName,
            companyEmail: doc.data().companyEmail,
            createdAt: createdAt,
            adminName: adminName,
            adminEmail: adminEmail,
            totEmployees: totEmployees,
            isDisabled: doc.data().isDisabled,
            subscription: doc.data().subscription,
            renewalDate: doc.data().renewalDate,
            payments: doc.data().payments,
          };

          allCompanies.push(compDetails);
        });
        resolve(allCompanies);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function Sudo({ setSnackbarOpen, setSnackbarMessage, setSnackbarSeverity }) {
  const navigate = useNavigate();
  useEffect(() => {
    firebaseAuth.authStateReady().then(() => {
      firebaseAuth.currentUser.getIdTokenResult().then((token) => {
        if (token.claims.position !== "SuperAdmin") {
          navigate("/");
        }
      });
    });
  }, []);

  const isInitialized = useRef(false); // initialized flag to prevent multiple fetches
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  useEffect(() => {
    if (isInitialized.current) return; // If already initialized, do nothing
    setIsPageLoading(true);
    getCompanies()
      .then((companies) => {
        setCompanies(companies);
      })
      .catch((error) => {
        console.error("[DB] => GetCompanies:", error);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        isInitialized.current = true;
        setIsPageLoading(false);
      });
  }, [firebaseAuth.onAuthStateChanged]);

  // Add Company
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isCompanyAddLoading, setIsCompanyAddLoading] = useState(false);
  async function handleAddCompany() {
    if (companyName.trim().length < 3) {
      setSnackbarMessage("Company name must be at least 3 characters.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (adminName.trim().length < 3) {
      setSnackbarMessage("Admin name must be at least 3 characters.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (/[^\w\s]/.test(adminName)) {
      setSnackbarOpen(true);
      setSnackbarMessage("Admin name cannot contain special characters.");
      setSnackbarSeverity("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(adminEmail)) {
      setSnackbarMessage("Please enter a valid email.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setIsCompanyAddLoading(true);
    setAddCompanyDialogOpen(false);
    addCompany(companyName, adminName, adminEmail.toLocaleLowerCase())
      .then((createdCompany) => {
        setCompanyName("");
        setAdminName("");
        setAdminEmail("");
        setCompanies((prevCompanies) => [createdCompany, ...prevCompanies]);
        setSnackbarMessage(
          "Company created, Admin's credentials will be emailed shortly."
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error("[DB] => AddCompany:", error);
        if (error === "EMAIL_ALREADY_EXIST") {
          setSnackbarMessage(
            "This email is already registered. Please use another email."
          );
        } else {
          setSnackbarMessage(
            "Something went wrong, please try again in a few minutes."
          );
        }
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setIsCompanyAddLoading(false);
      });
  }

  // Company disable or enable
  const [disableOrEnableDialogOpen, setDisableOrEnableDialogOpen] =
    useState(false);
  const [changeStatusOfCompany, setChangeStatusOfCompany] = useState({});
  const [isChangeStatusLoading, setIsChangeStatusLoading] = useState(false);
  function handleCompanyDisableOrEnable() {
    setIsChangeStatusLoading(true);
    setDisableOrEnableDialogOpen(false);
    updateCompany(changeStatusOfCompany.companyID, {
      isDisabled: changeStatusOfCompany.setDisabled,
    })
      .then(() => {
        setCompanies(
          companies.map((company) => {
            if (company.id === changeStatusOfCompany.companyID) {
              return {
                ...company,
                isDisabled: changeStatusOfCompany.setDisabled,
              };
            }
            return company;
          })
        );
        setSnackbarMessage("Company status updated successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error("[DB] => UpdateCompany:", error);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setChangeStatusOfCompany({});
        setIsChangeStatusLoading(false);
      });
  }

  // Delete company
  const [deleteDialogOpen, setDeleteDialogBoxOpen] = useState(false);
  const [pickedCompanyToDelete, setPickedCompanyToDelete] = useState({});
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  function handleDeleteCompany() {
    setDeleteDialogBoxOpen(false);
    setIsDeleteLoading(true);
    deleteCompany(pickedCompanyToDelete.id)
      .then(() => {
        setCompanies(
          companies.filter((company) => company.id !== pickedCompanyToDelete.id)
        );
        setSnackbarMessage("Company deleted successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error("[DB] => DeleteCompany:", error);
        setSnackbarMessage(
          "Error some details may not be deleted, Please contact technical support."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setPickedCompanyToDelete({});
        setIsDeleteLoading(false);
      });
  }

  //Membership
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [pickedCompanyToMembership, setPickedCompanyToMembership] = useState(
    {}
  );
  const [membershipChange, setMembershipChange] = useState({});
  const [isMembershipChangeLoading, setIsMembershipChangeLoading] =
    useState(false);
  function handleMembershipChange(compID) {
    let objectToUpdate = {};
    if (membershipChange.subscription) {
      objectToUpdate.subscription = membershipChange.subscription;
    } else {
      objectToUpdate.subscription = pickedCompanyToMembership.subscription;
    }
    if (
      typeof membershipChange.renewalDate === "undefined" ||
      membershipChange.renewalDate === "Invalid Date"
    ) {
      objectToUpdate.renewalDate = pickedCompanyToMembership.renewalDate;
    } else {
      objectToUpdate.renewalDate = membershipChange.renewalDate;
    }
    setIsMembershipChangeLoading(true);
    updateCompany(compID, objectToUpdate)
      .then(() => {
        const comp = companies.find((company) => company.id === compID);
        const newComp = {
          ...comp,
          subscription: objectToUpdate.subscription,
          renewalDate: objectToUpdate.renewalDate,
        };
        setCompanies(
          companies.map((company) =>
            company.id === compID ? newComp : company
          )
        );
        setSnackbarMessage("Company membership updated successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error("[DB] => UpdateCompany:", error);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setIsMembershipChangeLoading(false);
      });
  }

  // Add new payment
  const [paymentDetails, setPaymentDetails] = useState({});
  const [isPaymentAddLoading, setIsPaymentAddLoading] = useState(false);
  async function handleAddPayment(compID) {
    if (!paymentDetails.file) {
      setSnackbarMessage("Please upload an invoice.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!paymentDetails.paymentDate) {
      paymentDetails.paymentDate = dayjs().format("DD-MM-YYYY");
    }
    if (paymentDetails.paymentDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid payment date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!paymentDetails.periodStart) {
      paymentDetails.periodStart = dayjs().format("DD-MM-YYYY");
    }
    if (paymentDetails.periodStart === "Invalid Date") {
      setSnackbarMessage("Please select a valid period start date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!paymentDetails.periodEnd) {
      paymentDetails.periodEnd = dayjs().add(1, "month").format("DD-MM-YYYY");
    }
    if (paymentDetails.periodEnd === "Invalid Date") {
      setSnackbarMessage("Please select a valid period end date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!paymentDetails.amount) {
      if (pickedCompanyToMembership.subscription === "Basic") {
        paymentDetails.amount = 30;
      } else if (pickedCompanyToMembership.subscription === "Standard") {
        paymentDetails.amount = 50;
      } else if (pickedCompanyToMembership.subscription === "Premium") {
        paymentDetails.amount = 75;
      }
    }
    if (paymentDetails.amount && isNaN(paymentDetails.amount)) {
      setSnackbarMessage("Amount must be a number.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let comp = companies.find((company) => company.id === compID);
    let paymentExists = false;
    for (let payment of comp.payments) {
      if (
        payment.periodStart === paymentDetails.periodStart &&
        payment.periodEnd === paymentDetails.periodEnd
      ) {
        setSnackbarMessage("Payment already exists for this period.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        paymentExists = true;
        break;
      }
    }
    if (!paymentExists) {
      setIsPaymentAddLoading(true);

      const invoiceName = `invoice_${paymentDetails.periodStart}-${
        paymentDetails.periodEnd
      }.${paymentDetails.file.name.split(".").pop()}`;
      let invoiceUrl = "";
      await uploadFileAndGetUrl(
        paymentDetails.file,
        invoiceName,
        compID,
        pickedCompanyToMembership.adminEmail
      )
        .then((url) => {
          invoiceUrl = url;
        })
        .catch((error) => {
          console.error("[DB] => UploadFileAndGetUrl:", error);
          setSnackbarMessage("Could not upload invoice. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
      if (comp.payments.length > 15) {
        await deleteFile(
          comp.payments[0].invoiceSavedAs,
          compID,
          pickedCompanyToMembership.adminEmail
        );
        comp.payments = comp.payments.slice(1);
      }
      const thisPayment = {
        subscription: comp.subscription,
        periodStart: paymentDetails.periodStart,
        periodEnd: paymentDetails.periodEnd,
        paymentDate: paymentDetails.paymentDate,
        amount: paymentDetails.amount,
        invoice: invoiceUrl,
        invoiceSavedAs: invoiceName,
      };
      comp.payments.push(thisPayment);
      updateCompany(compID, { payments: comp.payments })
        .then(() => {
          setCompanies(
            companies.map((company) => (company.id === compID ? comp : company))
          );
          setSnackbarMessage("Payment added successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setPaymentDetails({});
        })
        .catch((error) => {
          console.error("[DB] => UpdateCompany:", error);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        })
        .finally(() => {
          setIsPaymentAddLoading(false);
        });
    }
  }

  async function handleRemovePayment(compID, periodStart, periodEnd) {
    const comp = companies.find((company) => company.id === compID);
    const index = comp.payments.findIndex(
      (payment) =>
        payment.periodStart === periodStart && payment.periodEnd === periodEnd
    );
    if (index !== -1) {
      await deleteFile(
        comp.payments[index].invoiceSavedAs,
        compID,
        pickedCompanyToMembership.adminEmail
      );
      comp.payments.splice(index, 1);
    }

    updateCompany(compID, { payments: comp.payments })
      .then(() => {
        setCompanies(
          companies.map((company) =>
            company.id === compID
              ? { ...company, payments: comp.payments }
              : company
          )
        );
        setSnackbarMessage("Payment removed successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch((error) => {
        console.error("[DB] => UpdateCompany:", error);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
  }

  return (
    <div
      style={{
        overflow: "auto",
        height: isTablet ? "94%" : "96%",
      }}
    >
      <div
        style={{
          marginRight: isMobile ? "8px" : isTablet ? "14px" : "20px",
          marginLeft: isMobile ? "8px" : isTablet ? "14px" : "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          marginBottom: "14px",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: "800",
            color: "#a378ff",
          }}
        >
          Super Admin
        </Typography>
        <Button
          variant="contained"
          disabled={isPageLoading || isCompanyAddLoading}
          sx={{
            backgroundColor: "#74b581",
            width: "150px",
            height: "40px",
            fontSize: "0.95rem",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "20px",
            ":hover": { backgroundColor: "#73a47c" },
          }}
          onClick={() => {
            setAddCompanyDialogOpen(true);
          }}
        >
          <AddBusinessOutlinedIcon
            style={{
              marginRight: "12px",
              fontSize: "24px",
            }}
          />
          Company
        </Button>
      </div>

      {isPageLoading ? (
        <Box
          sx={{
            height: "20%",
            width: "95%",
            marginLeft: "12px",
            backgroundColor: "#f9f9f9",
            borderRadius: "20px",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CircularProgress sx={{ color: "#a378ff" }} />
        </Box>
      ) : companies.length === 0 ? (
        <Box
          sx={{
            height: "20%",
            width: "95%",
            marginLeft: "12px",
            backgroundColor: "#f9f9f9",
            borderRadius: "20px",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              color: "#a6a6a6",
            }}
          >
            No Companies Found
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={tableContainerStyles}>
          <Table aria-label="simple table" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderStyles}>Company</TableCell>
                <TableCell sx={tableHeaderStyles}>Company Email</TableCell>
                <TableCell sx={tableHeaderStyles}>Created On</TableCell>
                <TableCell sx={tableHeaderStyles}>Admin</TableCell>
                <TableCell sx={tableHeaderStyles}>Admin Email</TableCell>
                <TableCell sx={tableHeaderStyles}>Employees</TableCell>
                <TableCell sx={tableHeaderStyles}>Membership</TableCell>
                <TableCell sx={tableHeaderStyles}>Renewal</TableCell>
                <TableCell sx={tableHeaderStyles}>Status</TableCell>
                <TableCell sx={tableHeaderStyles}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell sx={tableBodyStyles}>
                    {company.companyName}
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    <i>{company.companyEmail}</i>
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    <i>{company.createdAt}</i>
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    {company.adminName}
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    <i>{company.adminEmail}</i>
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    {company.totEmployees}
                  </TableCell>
                  <TableCell sx={tableBodyStyles}>
                    {company.subscription}
                  </TableCell>
                  <TableCell
                    sx={{
                      tableBodyStyles,
                      color: dayjs().isAfter(
                        dayjs(company.renewalDate, "DD-MM-YYYY")
                      )
                        ? "#ed4337"
                        : "inherit",
                    }}
                  >
                    {company.renewalDate}
                  </TableCell>
                  <TableCell
                    sx={{
                      tableBodyStyles,
                      fontWeight: "bold",
                      color: company.isDisabled ? "#ff9966" : "#74b581",
                    }}
                  >
                    {company.isDisabled ? "Disabled" : "Active"}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...tableBodyStyles,
                      display: "flex",
                      justifyContent: "space-evenly",
                      alignItems: "center",
                      border: "none",
                    }}
                  >
                    {isChangeStatusLoading ? (
                      <CircularProgress size={22} sx={{ color: "#a378ff" }} />
                    ) : company.isDisabled ? (
                      <Tooltip title="Enable this company" arrow>
                        <PlayCircleIcon
                          onClick={() => {
                            if (isChangeStatusLoading) return;
                            setChangeStatusOfCompany({
                              companyID: company.id,
                              companyName: company.companyName,
                              setDisabled: false,
                            });
                            setDisableOrEnableDialogOpen(true);
                          }}
                          sx={{
                            color: "#74b581",
                            ...actionBtnStyles,
                          }}
                        ></PlayCircleIcon>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Disable this company" arrow>
                        <PauseCircleIcon
                          onClick={() => {
                            if (isChangeStatusLoading) return;
                            setChangeStatusOfCompany({
                              companyID: company.id,
                              companyName: company.companyName,
                              setDisabled: true,
                            });
                            setDisableOrEnableDialogOpen(true);
                          }}
                          sx={{
                            color: "#ff9966",
                            ...actionBtnStyles,
                          }}
                        ></PauseCircleIcon>
                      </Tooltip>
                    )}
                    {isDeleteLoading ? (
                      <CircularProgress size={22} sx={{ color: "#ed4337" }} />
                    ) : (
                      <Tooltip title="Delete this company !!" arrow>
                        <DeleteIcon
                          onClick={() => {
                            if (isDeleteLoading) return;
                            setDeleteDialogBoxOpen(true);
                            setPickedCompanyToDelete({
                              id: company.id,
                              name: company.companyName,
                            });
                          }}
                          sx={{ color: "#ed4337", ...actionBtnStyles }}
                        />
                      </Tooltip>
                    )}
                    <Tooltip title="Subscription and Payments" arrow>
                      <CardMembershipIcon
                        onClick={() => {
                          setMembershipDialogOpen(true);
                          setPickedCompanyToMembership({
                            id: company.id,
                            name: company.companyName,
                            subscription: company.subscription,
                            renewalDate: company.renewalDate,
                            payments: company.payments,
                            adminEmail: company.adminEmail,
                          });
                        }}
                        sx={{ color: "#7da0fa", ...actionBtnStyles }}
                      />
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box
        sx={{
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "flex-start",
          padding: 4,
        }}
      >
        <Button
          variant="outlined"
          className="logout"
          sx={{
            borderColor: "#ed4337",
            color: "#ed4337",
            "&:hover": {
              borderColor: "#ed4337",
              color: "#ed4337",
            },
          }}
          onClick={() => {
            signOutUser()
              .then(() => {
                navigate("/login");
                window.location.reload();
              })
              .catch((error) => {
                console.error("[Auth] ", error.code);
                setSnackbarMessage(
                  "Something went wrong, please try again in a few minutes."
                );
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
              });
          }}
        >
          <LogoutIcon />
          Logout
        </Button>
      </Box>
      {/* Add Company Dialog Box Start*/}
      <Dialog
        open={addCompanyDialogOpen}
        onClose={() => setAddCompanyDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            backgroundColor: "#fff",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <AddBusinessOutlinedIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box color={"#f4a322"}>Add Company</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="company_name"
              label="Company Name"
              name="company_name"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
              }}
              value={companyName || ""}
              onChange={(e) => setCompanyName(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "14px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#a378ff",
                },
              }}
            />

            <TextField
              margin="normal"
              fullWidth
              id="admin_name"
              label="Admin Name"
              name="name"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
              }}
              value={adminName || ""}
              onChange={(e) => setAdminName(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "14px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#a378ff",
                },
              }}
            />

            <TextField
              margin="normal"
              fullWidth
              id="email"
              label="Admin Email Address"
              name="email"
              autoComplete="email"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
              }}
              value={adminEmail || ""}
              onChange={(e) => setAdminEmail(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "14px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#a378ff",
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCompanyName("");
              setAdminName("");
              setAdminEmail("");
              setAddCompanyDialogOpen(false);
            }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            onClick={handleAddCompany}
            sx={{
              width: "20%",
              borderRadius: "20px",
              backgroundColor: "#f4a322",
              ":hover": {
                backgroundColor: "#e38f09",
              },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Company Dialog Box End*/}

      {/* Pause/Unpause Dialog Box Start*/}
      <Dialog
        open={disableOrEnableDialogOpen}
        onClose={() => setDisableOrEnableDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            backgroundColor: "#fff",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            {changeStatusOfCompany.setDisabled ? (
              <PauseCircleIcon
                sx={{
                  color: "#ff9966",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            ) : (
              <PlayCircleIcon
                sx={{
                  color: "#74b581",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            )}
            <Box
              color={changeStatusOfCompany.setDisabled ? "#ff9966" : "#74b581"}
            >
              {`You are about to ${
                changeStatusOfCompany.setDisabled ? "disable" : "enable"
              } the company "${changeStatusOfCompany.companyName}"`}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="alert-dialog-description"
            sx={{ color: "#000", fontFamily: "'Open Sans', sans-serif" }}
          >
            {changeStatusOfCompany.setDisabled
              ? `Disabling this company will prevent its admin and employees from
            logging in.`
              : `Enabling this company will allow its admin and employees to use the platform again.`}
            <br /> <br />
            <i>{`Are you sure you want to ${
              changeStatusOfCompany.setDisabled ? "disable" : "enable"
            } this company ?`}</i>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableOrEnableDialogOpen(false)}>
            No
          </Button>
          <Button
            onClick={handleCompanyDisableOrEnable}
            sx={{
              color: changeStatusOfCompany.setDisabled ? "#ff9966" : "#74b581",
            }}
          >
            {changeStatusOfCompany.setDisabled ? "Disable" : "Enable"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Pause/Unpause Dialog Box End*/}

      {/* Delete Dialog Box Start*/}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogBoxOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            backgroundColor: "#fff",
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
            <Box color={"#ed4337"}>
              {`You are about to delete the company "${pickedCompanyToDelete.name}"`}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="alert-dialog-description"
            sx={{ color: "#000", fontFamily: "'Open Sans', sans-serif" }}
          >
            Deleting this company will delete all related data. <br />
            All empoyee details from this company will also be deleted. <br />
            <b>
              This action is not reversible, and there is no way to recover.
            </b>
            <br /> <br />
            <i>Are you sure you want to delete this company ?</i>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogBoxOpen(false)}>No</Button>
          <Button onClick={handleDeleteCompany} sx={{ color: "#ed4337" }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Dialog Box End*/}
      {/* Membership Dialog Box start*/}
      <Dialog
        open={membershipDialogOpen}
        onClose={() => {
          setMembershipDialogOpen(false);
          setMembershipChange({});
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="lg"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            backgroundColor: "#fff",
            width: "80vw",
            height: "90vh",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          {`Membership of "${pickedCompanyToMembership.name}"`}
        </DialogTitle>
        <DialogContent>
          {/*Change subscription*/}
          <Box
            sx={{
              backgroundColor: "#edf2fb",
              borderRadius: "12px",
              paddingBottom: "10px",
              paddingTop: "10px",
            }}
          >
            <div style={{ display: "flex", paddingTop: "10px" }}>
              <CardMembershipIcon
                style={{
                  marginLeft: "20px",
                  marginTop: "2px",
                  fontSize: "24px",
                  color: "#7da0fa",
                }}
              />
              <Typography
                variant="h6"
                style={{
                  fontWeight: "500",
                  marginLeft: "14px",
                  marginTop: "2px",
                  fontSize: "1rem",
                }}
              >
                Membership
              </Typography>
            </div>
            <Grid
              container
              style={{
                paddingBottom: "20px",
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: "10px",
              }}
              spacing={2}
            >
              <Grid item xs={12} md={6} lg={4}>
                <FormControl
                  size="small"
                  sx={{
                    width: isMobile ? "200px" : "320px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#a378ff",
                      },
                  }}
                >
                  <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                    Subscription
                  </InputLabel>
                  <Select
                    label="Subscription"
                    value={
                      membershipChange.subscription ||
                      pickedCompanyToMembership.subscription
                    }
                    onChange={(e) => {
                      setMembershipChange({
                        ...membershipChange,
                        subscription: e.target.value,
                      });
                    }}
                    sx={{ fontFamily: "'Open Sans', Arial" }}
                  >
                    <MenuItem value={"Basic"} key={"Basic"}>
                      {"Basic (6 users)"}
                    </MenuItem>
                    <MenuItem value={"Standard"} key={"Standard"}>
                      {"Standard (12 users)"}
                    </MenuItem>
                    <MenuItem value={"Premium"} key={"Premium"}>
                      {"Premium (24 users)"}
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      pickedCompanyToMembership.renewalDate !== null
                        ? dayjs(
                            pickedCompanyToMembership.renewalDate,
                            "DD-MM-YYYY"
                          )
                        : null
                    }
                    onChange={(value) => {
                      setMembershipChange({
                        ...membershipChange,
                        renewalDate: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    label="Next Renewal Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#f3887c",
                        },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                disabled={isMembershipChangeLoading}
                sx={{
                  backgroundColor: "#74b581",
                  width: "120px",
                  height: "35px",
                  textTransform: "none",
                  borderRadius: "18px",
                  fontFamily: "'Roboto', sans-serif",
                  ":hover": { backgroundColor: "#73a47c", color: "#000" },
                  marginRight: "25px",
                }}
                onClick={() => {
                  handleMembershipChange(pickedCompanyToMembership.id);
                }}
              >
                {isMembershipChangeLoading ? (
                  <CircularProgress size={24} sx={{ color: "#a378ff" }} />
                ) : (
                  <>
                    <SaveIcon
                      style={{ marginRight: "12px", fontSize: "24px" }}
                    />
                    Save
                  </>
                )}
              </Button>
            </Box>
          </Box>
          {/*Change subscription end*/}
          {/*Add Payments*/}
          <Box
            sx={{
              maxHeight: "70%",
              backgroundColor: "#edf2fb",
              margin: "10px 20px 10px 0",
              borderRadius: "12px",
              marginLeft: "auto",
              marginRight: "auto",
              paddingBottom: "10px",
              overflowX: "hidden",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", paddingTop: "10px" }}>
              <PaymentIcon
                style={{
                  marginLeft: "20px",
                  marginTop: "2px",
                  fontSize: "24px",
                  color: "#7da0fa",
                }}
              />
              <Typography
                variant="h6"
                style={{
                  fontWeight: "500",
                  marginLeft: "14px",
                  marginTop: "2px",
                  fontSize: "1rem",
                }}
              >
                Add Payment
              </Typography>
            </div>
            <Grid
              container
              style={{
                paddingBottom: "20px",
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: "10px",
              }}
              spacing={2}
            >
              <Grid item xs={12} md={6} lg={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      paymentDetails.paymentDate
                        ? dayjs(paymentDetails.paymentDate, "DD-MM-YYYY")
                        : dayjs()
                    }
                    onChange={(value) => {
                      setPaymentDetails({
                        ...paymentDetails,
                        paymentDate: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    label="Payment Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      width: "80%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#a378ff",
                        },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      paymentDetails.periodStart
                        ? dayjs(paymentDetails.periodStart, "DD-MM-YYYY")
                        : dayjs()
                    }
                    onChange={(value) => {
                      setPaymentDetails({
                        ...paymentDetails,
                        periodStart: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    label="Period Start Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      width: "80%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#74b581",
                        },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      paymentDetails.periodEnd
                        ? dayjs(paymentDetails.periodEnd, "DD-MM-YYYY")
                        : dayjs().add(1, "month")
                    }
                    onChange={(value) => {
                      setPaymentDetails({
                        ...paymentDetails,
                        periodEnd: dayjs(value).format("DD-MM-YYYY"),
                      });
                    }}
                    format="DD-MM-YYYY"
                    label="Period End Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      width: "80%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#f3887c",
                        },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  label="Amount"
                  variant="outlined"
                  size="small"
                  name="amount"
                  type="number"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  defaultValue={
                    pickedCompanyToMembership.subscription === "Basic"
                      ? "30"
                      : pickedCompanyToMembership.subscription === "Standard"
                      ? "50"
                      : pickedCompanyToMembership.subscription === "Premium"
                      ? "75"
                      : "0"
                  }
                  onChange={(e) => {
                    setPaymentDetails({
                      ...paymentDetails,
                      amount: e.target.value,
                    });
                  }}
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                      backgroundColor: "#7da0fa10",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
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
              </Grid>
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  label="Invoice"
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
                    setPaymentDetails({
                      ...paymentDetails,
                      file: e.target.files[0],
                    });
                  }}
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#Ffc85d",
                      },
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                disabled={isPaymentAddLoading}
                sx={{
                  backgroundColor: "#74b581",
                  width: "120px",
                  height: "35px",
                  textTransform: "none",
                  borderRadius: "18px",
                  fontFamily: "'Roboto', sans-serif",
                  ":hover": { backgroundColor: "#73a47c", color: "#000" },
                  marginRight: "25px",
                }}
                onClick={() => {
                  handleAddPayment(pickedCompanyToMembership.id);
                }}
              >
                {isPaymentAddLoading ? (
                  <CircularProgress size={24} sx={{ color: "#a378ff" }} />
                ) : (
                  <>
                    <SaveIcon
                      style={{ marginRight: "12px", fontSize: "24px" }}
                    />
                    Save
                  </>
                )}
              </Button>
            </Box>
          </Box>
          {/*Add Payments End*/}
          {/*All Payments*/}
          <Box
            sx={{
              maxHeight: "70%",
              backgroundColor: "#edf2fb",
              margin: "10px 20px 10px 0",
              borderRadius: "12px",
              marginLeft: "auto",
              marginRight: "auto",
              paddingBottom: "10px",
              overflow: "auto",
            }}
          >
            <div style={{ display: "flex", paddingTop: "10px" }}>
              <PaymentsIcon
                style={{
                  marginLeft: "20px",
                  marginTop: "2px",
                  fontSize: "24px",
                  color: "#7da0fa",
                }}
              />
              <Typography
                variant="h6"
                style={{
                  fontWeight: "500",
                  marginLeft: "14px",
                  marginTop: "2px",
                  fontSize: "1rem",
                }}
              >
                Payment History
              </Typography>
            </div>

            {pickedCompanyToMembership.payments &&
            pickedCompanyToMembership.payments.length === 0 ? (
              <Typography
                color="#a9a9a9"
                textAlign={"center"}
                marginTop={4}
                mb={2}
              >
                <i>No Payments Found</i>
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                sx={{ ...tableContainerStyles, width: "98%" }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell style={tableHeaderStyles}>
                        Subscription
                      </TableCell>
                      <TableCell style={tableHeaderStyles}>
                        Payment Date
                      </TableCell>
                      <TableCell style={tableHeaderStyles}>Period</TableCell>
                      <TableCell style={tableHeaderStyles}>Amount</TableCell>
                      <TableCell style={tableHeaderStyles}>Invoice</TableCell>
                      <TableCell style={tableHeaderStyles}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pickedCompanyToMembership.payments &&
                      pickedCompanyToMembership.payments.map((payment) => {
                        return (
                          <TableRow
                            key={payment.periodStart + payment.periodEnd}
                          >
                            <TableCell style={tableBodyStyles}>
                              {payment.subscription}
                            </TableCell>
                            <TableCell style={tableBodyStyles}>
                              {payment.paymentDate}
                            </TableCell>
                            <TableCell style={tableBodyStyles}>
                              <i>
                                {payment.periodStart +
                                  " - " +
                                  payment.periodEnd}
                              </i>
                            </TableCell>
                            <TableCell style={tableBodyStyles}>
                              £{payment.amount}
                            </TableCell>
                            <TableCell style={tableBodyStyles}>
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
                                  window.open(payment.invoice, "_blank");
                                }}
                                startIcon={<CloudDownloadIcon />}
                              ></Button>
                            </TableCell>
                            <TableCell style={tableBodyStyles}>
                              <DeleteIcon
                                onClick={() => {
                                  handleRemovePayment(
                                    pickedCompanyToMembership.id,
                                    payment.periodStart,
                                    payment.periodEnd
                                  );
                                }}
                                sx={{
                                  color: "#ed4337",
                                  ...actionBtnStyles,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
          {/*All Payments End*/}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMembershipDialogOpen(false);
              setMembershipChange({});
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* Membership Dialog Box end*/}
    </div>
  );
}

export default Sudo;
