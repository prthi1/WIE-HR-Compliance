import {
  Box,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Button,
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
} from "@mui/material";
import React, { useState, useEffect, useRef } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import PaymentsIcon from "@mui/icons-material/Payments";
import SaveIcon from "@mui/icons-material/Save";
import PaymentIcon from "@mui/icons-material/Payment";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DeleteIcon from "@mui/icons-material/Delete";
import { firebaseDb, firebaseStorage } from "../firebase/baseConfig";
import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
  Timestamp,
  collection,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { writeNotification } from "../firebase/notifications";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const tableContainerStyles = {
  borderRadius: "20px",
  width: isMobile ? "88vw" : isTablet ? "62vw" : "78vw",
  marginTop: "10px",
  marginBottom: "10px",
  maxHeight: "100vh",
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
};

const tableRowStyles = {
  textAlign: "center",
  fontFamily: "'Open Sans', sans-serif",
};

function deletePayslip(payslipID, companyID) {
  return new Promise(async (resolve, reject) => {
    const payslipColRef = collection(
      firebaseDb,
      "companies",
      companyID,
      "payslips"
    );
    await deleteDoc(doc(payslipColRef, payslipID))
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

function addPayslip(companyID, payslipData) {
  return new Promise(async (resolve, reject) => {
    try {
      const payslipColRef = collection(
        firebaseDb,
        "companies",
        companyID,
        "payslips"
      );
      const docRef = await addDoc(payslipColRef, payslipData);
      resolve(docRef.id);
    } catch (e) {
      reject(e);
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

async function getPayslips(
  companyID,
  isAdmin,
  usrEmail,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setPayslipsData
) {
  try {
    const payslipColRef = collection(
      firebaseDb,
      "companies",
      companyID,
      "payslips"
    );
    let payslipQuery = query(payslipColRef, orderBy("deleteTime", "desc"));
    if (!isAdmin) {
      payslipQuery = query(payslipColRef, where("to", "==", usrEmail));
    }

    const querySnapshot = await getDocs(payslipQuery);
    if (!querySnapshot.empty) {
      let payslips = [];
      querySnapshot.forEach((doc) => {
        payslips.push({ id: doc.id, ...doc.data() });
      });
      setPayslipsData(payslips);
    }
  } catch (e) {
    console.error("[DB] => Get Payslips: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage("Something went wrong. Please try again.");
    setSnackbarOpen(true);
  }
}

async function getEmployees(
  companyID,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setIsPageLoading,
  setEmployeesWithEmail
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const companyDocSnap = await getDoc(companyDocRef);
    if (companyDocSnap.exists()) {
      if (companyDocSnap.data().employees_brief) {
        let employees = [];
        Object.keys(companyDocSnap.data().employees_brief).forEach((key) => {
          const employeeName = companyDocSnap.data().employees_brief[key].name;
          const employeeEmail =
            companyDocSnap.data().employees_brief[key].email;
          employees.push(`${employeeName} (${employeeEmail})`);
        });
        setEmployeesWithEmail(employees);
      }
    }
    setIsPageLoading(false);
  } catch (e) {
    console.error("[DB] => Get Employees: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage("Something went wrong. Please try again.");
    setSnackbarOpen(true);
  }
}

function Payslips({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  usrEmail,
  companyName,
}) {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [employeesWithEmail, setEmployeesWithEmail] = useState([]);
  const [payslipsData, setPayslipsData] = useState([]);
  const [isPayslipsLoading, setIsPayslipsLoading] = useState(true);
  useEffect(() => {
    if (isAdmin) {
      getEmployees(
        companyID,
        setSnackbarOpen,
        setSnackbarMessage,
        setSnackbarSeverity,
        setIsPageLoading,
        setEmployeesWithEmail
      );
    } else {
      setIsPageLoading(false);
    }

    setIsPayslipsLoading(true);
    getPayslips(
      companyID,
      isAdmin,
      usrEmail,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setPayslipsData
    ).finally(() => setIsPayslipsLoading(false));
  }, [companyID]);
  const [searchTerm, setSearchTerm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    notes: "",
    totDays: "",
    totHours: "",
  });

  const handleSearchChange = (e) => {
    setSearchTerm({ ...searchTerm, [e.target.name]: e.target.value });
  };

  const filteredPayslips = payslipsData.filter((payslip) =>
    payslip.name.toLowerCase().includes(searchTerm.name.toLowerCase()) &&
    payslip.startDate
      .toLowerCase()
      .includes(searchTerm.startDate.toLowerCase()) &&
    payslip.endDate.toLowerCase().includes(searchTerm.endDate.toLowerCase()) &&
    payslip.notes
      ? payslip.notes.toLowerCase().includes(searchTerm.notes.toLowerCase())
      : true &&
        payslip.totDays
          .toLowerCase()
          .includes(searchTerm.totDays.toLowerCase()) &&
        payslip.totHours
          .toLowerCase()
          .includes(searchTerm.totHours.toLowerCase())
  );

  const [dialogBoxOpen, setDialogBoxOpen] = useState(false);

  const [payslip, setPayslip] = useState({});
  const [payslipAttachment, setPayslipAttachment] = useState(null);
  const attachmentRef = useRef(null);

  const [isSaveLoading, setIsSaveLoading] = useState(false);
  async function handleSave() {
    if (!payslip.name) {
      setSnackbarMessage("Please select an employee");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!payslip.startDate) {
      payslip.startDate = dayjs().add(-30, "day").format("DD-MM-YYYY");
    }
    if (payslip.startDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid start date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!payslip.endDate) {
      payslip.endDate = dayjs().format("DD-MM-YYYY");
    }
    if (payslip.endDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid end date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (payslip.notes && payslip.notes.length > 200) {
      setSnackbarMessage("Notes should be less than 200 characters");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!payslip.totDays) {
      setSnackbarMessage("Please enter total days");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!payslip.totHours) {
      setSnackbarMessage("Please enter total hours");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const startDate = dayjs(payslip.startDate, "DD-MM-YYYY");
    const endDate = dayjs(payslip.endDate, "DD-MM-YYYY");
    if (endDate.isBefore(startDate) || endDate.isSame(startDate)) {
      setSnackbarMessage("End date should be greater than start date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    payslip.deleteTime = Timestamp.fromDate(endDate.add(365, "day").toDate());

    const existingPayslip = payslipsData.find(
      (p) =>
        p.name.includes(payslip.name) &&
        p.startDate === payslip.startDate &&
        p.endDate === payslip.endDate
    );
    if (existingPayslip) {
      setSnackbarMessage(
        "Payslip for this period already exists for this employee"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const emailPattern = /\(([^)]+)\)/;
    const emailMatch = payslip.name.match(emailPattern);
    payslip.to = emailMatch[1];
    setIsSaveLoading(true);
    if (payslipAttachment !== null) {
      const fileName = `payslip_${payslip.startDate}_${
        payslip.endDate
      }.${payslipAttachment.name.split(".").pop()}`;
      await uploadFileAndGetUrl(
        payslipAttachment,
        fileName,
        companyID,
        payslip.to
      )
        .then((url) => {
          payslip.attachment = url;
          payslip.attachmentName = fileName;
          payslip.attachmentPath = `${companyID}/${payslip.to}/${fileName}`;
        })
        .catch((error) => {
          console.error("[Storage] => Upload Attachment: " + error);
          setSnackbarMessage("Failed to upload attachment.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        });
    }

    addPayslip(companyID, payslip)
      .then((docID) => {
        payslip.id = docID;
        setPayslipsData([payslip, ...payslipsData]);
        setSnackbarMessage("Payslip saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setPayslip({});
        setPayslipAttachment(null);
        attachmentRef.current.value = null;

        // Write notification
        writeNotification(
          companyID,
          [payslip.to],
          "New Payslip",
          `Your payslip for ${payslip.startDate} to ${payslip.endDate} is added.`,
          {
            title: `(${companyName}) New Payslip`,
            body: `Your payslip for ${payslip.startDate} to ${payslip.endDate} is added.\n
            To see additional details, visit www.hrcompliance.wie-solutions.co.uk/payslips`,
          }
        );
      })
      .catch((error) => {
        console.error("[DB] => Add Payslip: " + error);
        setSnackbarMessage("Failed to save payslip.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setIsSaveLoading(false);
      });
  }

  const [selectedPayslipToDelete, setSelectedPayslipToDelete] = useState(null);
  async function handlePayslipDelete() {
    setDialogBoxOpen(false);
    if (selectedPayslipToDelete.attachment) {
      await deleteFile(
        selectedPayslipToDelete.attachmentName,
        companyID,
        selectedPayslipToDelete.to
      )
        .then(() => {
          console.log("[Storage] => Attachment deleted.");
        })
        .catch((error) => {
          console.error("[Storage] => Delete Attachment: " + error);
          setSnackbarMessage("Failed to delete attachment.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        });
    }
    await deletePayslip(selectedPayslipToDelete.id, companyID)
      .then(() => {
        setPayslipsData(
          payslipsData.filter((p) => p.id !== selectedPayslipToDelete.id)
        );
        setSnackbarMessage("Payslip deleted successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setSelectedPayslipToDelete(null);
      })
      .catch((error) => {
        console.error("[DB] => Delete Payslip: " + error);
        setSnackbarMessage("Failed to delete payslip.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
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
      {isAdmin && (
        <Box
          sx={{
            width: isTablet ? "96%" : "98%",
            backgroundColor: "#fff",
            margin: "10px 20px 10px 0",
            borderRadius: "12px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div style={{ display: "flex", paddingTop: "10px" }}>
            <PaymentsIcon
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
              Add a Payslip
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
                <Skeleton width={340} height={"40px"} variant="rounded" />
              ) : (
                <Autocomplete
                  options={employeesWithEmail}
                  size="small"
                  value={payslip.name || null}
                  onChange={(event, newValue) => {
                    setPayslip({ ...payslip, name: newValue });
                  }}
                  sx={{
                    maxWidth: 340,
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
                  renderInput={(params) => (
                    <TextField {...params} label="Payslip To" />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={340} height={"40px"} variant="rounded" />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      payslip.startDate
                        ? dayjs(payslip.startDate, "DD-MM-YYYY")
                        : dayjs().add(-30, "day")
                    }
                    format="DD-MM-YYYY"
                    label="Start Date"
                    slotProps={{ textField: { size: "small" } }}
                    onChange={(value) =>
                      setPayslip({
                        ...payslip,
                        startDate: dayjs(value).format("DD-MM-YYYY"),
                      })
                    }
                    sx={{
                      width: 320,
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
                </LocalizationProvider>
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={340} height={"40px"} variant="rounded" />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      payslip.endDate
                        ? dayjs(payslip.endDate, "DD-MM-YYYY")
                        : dayjs()
                    }
                    format="DD-MM-YYYY"
                    label="End Date"
                    slotProps={{ textField: { size: "small" } }}
                    onChange={(value) =>
                      setPayslip({
                        ...payslip,
                        endDate: dayjs(value).format("DD-MM-YYYY"),
                      })
                    }
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
            <Grid item xs={9}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Notes"
                  variant="outlined"
                  size="small"
                  name="notes"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={payslip.notes || ""}
                  onChange={(e) =>
                    setPayslip({ ...payslip, notes: e.target.value })
                  }
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
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
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Total Days"
                  variant="outlined"
                  size="small"
                  name="days"
                  type="number"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={payslip.totDays || ""}
                  onChange={(e) =>
                    setPayslip({ ...payslip, totDays: e.target.value })
                  }
                  sx={{
                    width: "80%",
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
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Total Hours"
                  variant="outlined"
                  size="small"
                  name="hours"
                  type="number"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={payslip.totHours || ""}
                  onChange={(e) =>
                    setPayslip({ ...payslip, totHours: e.target.value })
                  }
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#7978e9",
                        backgroundColor: "#7978e910",
                      },
                  }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Attachment"
                  variant="outlined"
                  size="small"
                  name="attachment"
                  type="file"
                  inputProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                    ref: attachmentRef,
                  }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                    shrink: true,
                  }}
                  onChange={(e) => setPayslipAttachment(e.target.files[0])}
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#Ffc85d",
                        backgroundColor: "#Ffc85d10",
                      },
                  }}
                />
              )}
            </Grid>
          </Grid>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isSaveLoading}
              onClick={() => handleSave()}
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                textTransform: "none",
                borderRadius: "18px",
                marginTop: "16px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Roboto', sans-serif",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
            >
              {isSaveLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                  Save
                </>
              )}
            </Button>
          </div>
        </Box>
      )}
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "11px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            paddingTop: "10px",
          }}
        >
          <PaymentIcon
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
              marginTop: "4px",
            }}
          >
            Payslips
          </Typography>
        </div>
        {isPageLoading || isPayslipsLoading ? (
          <Skeleton
            width={isMobile ? "88vw" : isTablet ? "62vw" : "78vw"}
            height={"20vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                {isAdmin && (
                  <TableRow>
                    <TableCell>
                      <TextField
                        label="Search Employee"
                        variant="outlined"
                        size="small"
                        name="name"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.name}
                        onChange={handleSearchChange}
                      />
                    </TableCell>

                    <TableCell>
                      <TextField
                        label="Search Start Date"
                        variant="outlined"
                        size="small"
                        name="startDate"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.startDate}
                        onChange={handleSearchChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="Search End Date"
                        variant="outlined"
                        size="small"
                        name="endDate"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.endDate}
                        onChange={handleSearchChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="Search Notes"
                        variant="outlined"
                        size="small"
                        name="notes"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.notes}
                        onChange={handleSearchChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="Search Days"
                        variant="outlined"
                        size="small"
                        name="totDays"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.totDays}
                        onChange={handleSearchChange}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        label="Search Hours"
                        variant="outlined"
                        size="small"
                        name="totHours"
                        inputProps={{ style: { fontSize: 12 } }}
                        InputLabelProps={{ style: { fontSize: 14 } }}
                        value={searchTerm.totHours}
                        onChange={handleSearchChange}
                      />
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Employee</TableCell>
                  <TableCell style={tableHeaderStyles}>Start Date</TableCell>
                  <TableCell style={tableHeaderStyles}>End Date</TableCell>
                  <TableCell style={tableHeaderStyles}>Notes</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Total Working Days
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Total Working Hours
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>Attachment</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayslips.map((payslip) => (
                  <TableRow
                    key={payslip.name + payslip.startDate + payslip.endDate}
                    sx={tableRowStyles}
                  >
                    <TableCell style={tableBodyStyles}>
                      <Typography
                        style={{
                          fontWeight: "500",
                          fontSize: "0.9rem",
                        }}
                      >
                        {payslip.name}
                      </Typography>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {payslip.startDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {payslip.endDate}
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "center" }}
                    >
                      <i>{payslip.notes}</i>
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "center" }}
                    >
                      {payslip.totDays}
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "center" }}
                    >
                      {payslip.totHours}
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "center" }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!payslip.attachment}
                        onClick={() => {
                          window.open(payslip.attachment, "_blank");
                        }}
                        sx={{
                          backgroundColor: "#Ffc85d",
                          color: "#fff",
                          fontWeight: "500",
                          position: "relative",
                          height: "20px",
                          borderRadius: "10px",
                          "& .MuiButton-startIcon": { margin: "0px" },
                          ":hover": { backgroundColor: "#73a47c" },
                        }}
                        startIcon={<CloudDownloadIcon />}
                      ></Button>
                    </TableCell>
                    {isAdmin && (
                      <TableCell
                        style={{ ...tableBodyStyles, textAlign: "center" }}
                      >
                        <DeleteIcon
                          onClick={() => {
                            setDialogBoxOpen(true);
                            setSelectedPayslipToDelete(payslip);
                          }}
                          sx={{
                            cursor: "pointer",
                            color: "#ed4337",
                            borderRadius: "20%",
                            padding: "2px",
                            ":hover": { backgroundColor: "#a9a9a9" },
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
      <Dialog
        open={dialogBoxOpen}
        onClose={() => setDialogBoxOpen(false)}
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
            <Box>Delete Paylsip?</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this paylsip?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogBoxOpen(false)}>No</Button>
          <Button sx={{ color: "#ed4337" }} onClick={handlePayslipDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Payslips;
