import React, { useState, useEffect } from "react";

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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import RateReviewIcon from "@mui/icons-material/RateReview";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import SaveIcon from "@mui/icons-material/Save";
import SendIcon from "@mui/icons-material/Send";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import EditIcon from "@mui/icons-material/Edit";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CancelIcon from "@mui/icons-material/Cancel";
import EditNoteIcon from "@mui/icons-material/EditNote";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";

import { firebaseDb } from "../firebase/baseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { writeNotification } from "../firebase/notifications";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const leaveBtnStyles = {
  backgroundColor: "inherit",
  color: "#000",
  boxShadow: "none",
  borderRadius: "26px",
  height: "30px",
  fontSize: "0.75rem",
  textTransform: "none",
  fontFamily: "'Opn Sans', Arial",
  border: "1.3px solid",
  marginRight: "20px",
  lineHeight: "12px",
};
const tableContainerStyles = {
  borderRadius: "20px",
  width: isMobile ? "88vw" : isTablet ? "62vw" : "78vw",
  height: "85%",
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
  textAlign: "center",
};

async function getAllowedLeavesCount(companyID) {
  const compDocRef = doc(firebaseDb, `companies/${companyID}`);
  const compDetails = await getDoc(compDocRef);
  if (compDetails.exists() && compDetails.data().leavesAllowed) {
    return compDetails.data().leavesAllowed;
  } else {
    return {};
  }
}

function updateLeaveBalanceData(companyID, email, balanceChanges) {
  return new Promise((resolve, reject) => {
    const leaveDocRef = doc(firebaseDb, `companies/${companyID}/leaves`, email);
    updateDoc(leaveDocRef, balanceChanges)
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

function updateLeaveListData(companyID, email, leaveData) {
  return new Promise((resolve, reject) => {
    const leaveDocRef = doc(firebaseDb, `companies/${companyID}/leaves`, email);
    updateDoc(leaveDocRef, {
      leavesData: leaveData,
    })
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

async function getDetails(
  isAdmin,
  companyID,
  usrEmail,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setIsPageLoading,
  setLeaveListData,
  setEmployeesWithEmail,
  setLeaveBalanceData,
  setLeaveAllowances
) {
  try {
    setIsPageLoading(true);
    let employeesWithEmail = [];
    let leaveBalanceData = [];
    let leaveData = [];
    if (isAdmin) {
      // Get all employees leaves
      const leavesColRef = collection(
        firebaseDb,
        `companies/${companyID}/leaves`
      );
      const leavesSnapshot = await getDocs(leavesColRef);
      if (leavesSnapshot.empty) {
        setSnackbarSeverity("error");
        setSnackbarMessage("Leave data not found, Please contact support.");
        setSnackbarOpen(true);
        return;
      }
      leavesSnapshot.forEach((doc) => {
        employeesWithEmail.push(doc.data().name);
        const leaveBalData = {
          employee: doc.data().name,
          //duration: `${doc.data().durStartDate} - ${doc.data().durEndDate}`,
          duration: `31-03-2024 - 01-04-2025`,
          annualLeavesBalance: doc.data().annualLeavesBalance,
          sickLeavesBalance: doc.data().sickLeavesBalance,
        };
        leaveBalanceData.push(leaveBalData);
        if (doc.data().leavesData) {
          doc.data().leavesData.forEach((leave) => {
            leave.employee = doc.data().name;
            leaveData.push(leave);
          });
        }
      });
      setLeaveListData(leaveData);
      setEmployeesWithEmail(employeesWithEmail);
      setLeaveBalanceData(leaveBalanceData);
      const leaveAllowances = await getAllowedLeavesCount(companyID);
      setLeaveAllowances(leaveAllowances);
      setIsPageLoading(false);
    } else {
      // Get specific employees leaves
      const empLeaveDocRef = doc(
        firebaseDb,
        `companies/${companyID}/leaves/${usrEmail}`
      );
      const empLeaveDocSnap = await getDoc(empLeaveDocRef);
      if (empLeaveDocSnap.exists()) {
        employeesWithEmail.push(empLeaveDocSnap.data().name);
        const leaveBalData = {
          employee: empLeaveDocSnap.data().name,
          duration: `${empLeaveDocSnap.data().durStartDate} - ${
            empLeaveDocSnap.data().durEndDate
          }`,
          annualLeavesBalance: empLeaveDocSnap.data().annualLeavesBalance,
          sickLeavesBalance: empLeaveDocSnap.data().sickLeavesBalance,
        };
        if (empLeaveDocSnap.data().leavesData) {
          empLeaveDocSnap.data().leavesData.forEach((leave) => {
            leave.employee = empLeaveDocSnap.data().name;
            leaveData.push(leave);
          });
        }
        leaveBalanceData.push(leaveBalData);
        setLeaveListData(leaveData);
        setEmployeesWithEmail(employeesWithEmail);
        setLeaveBalanceData(leaveBalanceData);
        setIsPageLoading(false);
      } else {
        setSnackbarSeverity("error");
        setSnackbarMessage("Leave data not found, Please contact admin.");
        setSnackbarOpen(true);
      }
    }
  } catch (e) {
    console.error("[DB] => Get Details: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage("Something went wrong. Please try again.");
    setSnackbarOpen(true);
  }
}

function calculateTotalDays(
  startDate,
  endDate,
  setSnackbarMessage,
  setSnackbarSeverity,
  setSnackbarOpen,
  setLeaveTotDays
) {
  const leaveStart = dayjs(startDate, "DD-MM-YYYY");
  const leaveEnd = dayjs(endDate, "DD-MM-YYYY");
  if (leaveEnd.isBefore(leaveStart) || leaveEnd.isSame(leaveStart)) {
    setSnackbarMessage("End date must be after start date");
    setSnackbarSeverity("warning");
    setSnackbarOpen(true);
    setLeaveTotDays("error");
    return;
  }
  const totalDays = leaveEnd.diff(leaveStart, "day");
  setLeaveTotDays(totalDays);
}

function Leave({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  usrEmail,
  companyName,
}) {
  // Fetch Company Details
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [leaveListData, setLeaveListData] = useState([]);
  const [employeesWithEmail, setEmployeesWithEmail] = useState([]);
  const [leaveBalanceData, setLeaveBalanceData] = useState([]);
  const [leaveAllowances, setLeaveAllowances] = useState({});
  useEffect(() => {
    getDetails(
      isAdmin,
      companyID,
      usrEmail,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setIsPageLoading,
      setLeaveListData,
      setEmployeesWithEmail,
      setLeaveBalanceData,
      setLeaveAllowances
    );
  }, [companyID]);

  const [isLeaveListDialogOpen, setIsLeaveListDialogOpen] = useState(false);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);

  // Handle leave actions click
  const [leaveListDialogTitle, setLeaveListDialogTitle] = useState("");
  const [leaveListDialogText, setLeaveListDialogText] = useState("");
  const [leaveListDialogAction, setLeaveListDialogAction] = useState("approve");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isLeaveActionLoading, setIsLeaveActionLoading] = useState(false);
  async function handleLeaveAction() {
    setIsLeaveListDialogOpen(false);
    let selectedLeaveData = {
      ...leaveListData.find(
        (leave) =>
          leave.employee === selectedLeave.employee &&
          leave.startsOn === selectedLeave.startsOn &&
          leave.endsOn === selectedLeave.endsOn &&
          leave.type === selectedLeave.type
      ),
    };
    const emailPattern = /\(([^)]+)\)/;
    const email = selectedLeave.employee.match(emailPattern)[1];
    // Remove the employee key from the selectedLeaveData object (it's not available in the DB)
    const selectedEmployee = selectedLeaveData.employee;
    delete selectedLeaveData.employee;

    setIsLeaveActionLoading(true);
    if (leaveListDialogAction === "approve") {
      let updatedLeaveListData = [];
      // Remove selected leave from list
      await updateLeaveListData(
        companyID,
        email,
        arrayRemove(selectedLeaveData)
      )
        .then(() => {
          // Save changes to local state (to avoid fetching data again)
          const listAfterObjRemoved = leaveListData.filter(
            (leave) =>
              !(
                leave.employee === selectedEmployee &&
                leave.startsOn === selectedLeave.startsOn &&
                leave.endsOn === selectedLeave.endsOn &&
                leave.type === selectedLeave.type
              )
          );
          updatedLeaveListData = listAfterObjRemoved;
        })
        .catch((e) => {
          console.error("[DB] => Leave Remove: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
          return;
        });

      // Append the selected leave to the list with status 'Approved'
      selectedLeaveData.status = "Approved";
      await updateLeaveListData(companyID, email, arrayUnion(selectedLeaveData))
        .then(() => {
          // Set the employee key back, it's required in the local state
          selectedLeaveData.employee = selectedEmployee;
          // Save changes to local state (to avoid fetching data again)
          updatedLeaveListData.push(selectedLeaveData);
          setLeaveListData(updatedLeaveListData);
          setSnackbarMessage("Leave approved successfully");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
        })
        .catch((e) => {
          console.error("[DB] => Leave Add: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
          return;
        });

      // Reduce employee balance
      let balanceFieldName = "";
      if (selectedLeaveData.type === "Sick Leave") {
        balanceFieldName = "sickLeavesBalance";
      } else if (selectedLeaveData.type === "Annual Leave") {
        balanceFieldName = "annualLeavesBalance";
      }
      const employeeBalanceData = leaveBalanceData.find(
        (emp) => emp.employee === selectedEmployee
      );
      const balanceValue = employeeBalanceData[balanceFieldName];
      const balanceAfterApproval = balanceValue - selectedLeaveData.days;

      await updateLeaveBalanceData(companyID, email, {
        [balanceFieldName]: balanceAfterApproval,
      })
        .then(() => {
          // Save changes to local state (to avoid fetching data again)
          const selectedEmployeeBalance = leaveBalanceData.find(
            (emp) => emp.employee === selectedEmployee
          );
          selectedEmployeeBalance[balanceFieldName] = balanceAfterApproval;
          setLeaveBalanceData((prevBalanceData) => {
            const updatedBalanceData = [...prevBalanceData];
            const index = updatedBalanceData.findIndex(
              (emp) => emp.employee === selectedEmployee
            );
            updatedBalanceData[index] = selectedEmployeeBalance;
            return updatedBalanceData;
          });
          setIsLeaveActionLoading(false);
        })
        .catch((e) => {
          console.error("[DB] => Leave Balance Update: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
        });

      // Write Notification
      writeNotification(
        companyID,
        [email],
        "Leave Approved",
        `Your leave for ${selectedLeaveData.type} on ${selectedLeaveData.startsOn} to ${selectedLeaveData.endsOn} has been approved.`,
        {
          title: `(${companyName}) Leave Approved`,
          body: `Your leave for ${selectedLeaveData.type} on ${selectedLeaveData.startsOn} to ${selectedLeaveData.endsOn} has been approved.\n
          Visit www.hrcompliance.wie-solutions.co.uk/leave to view your leave history.`,
        }
      );
    } else if (leaveListDialogAction === "reject") {
      // Remove selected leave from list
      updateLeaveListData(companyID, email, arrayRemove(selectedLeaveData))
        .then(() => {
          // Save changes to local state (to avoid fetching data again)
          const updatedLeaveListData = leaveListData.filter(
            (leave) =>
              !(
                leave.employee === selectedEmployee &&
                leave.startsOn === selectedLeave.startsOn &&
                leave.endsOn === selectedLeave.endsOn &&
                leave.type === selectedLeave.type
              )
          );
          setLeaveListData(updatedLeaveListData);
          setSnackbarMessage("Leave rejected successfully");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
        })
        .catch((e) => {
          console.error("[DB] => Leave Remove: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
          return;
        });

      // Write Notification
      writeNotification(
        companyID,
        [email],
        "Leave Rejected",
        `Your leave for ${selectedLeaveData.type} on ${selectedLeaveData.startsOn} to ${selectedLeaveData.endsOn} has been rejected. Please contact your admin for further details.`,
        {
          title: `(${companyName}) Leave Rejected`,
          body: `Your leave for ${selectedLeaveData.type} on ${selectedLeaveData.startsOn} to ${selectedLeaveData.endsOn} has been rejected. Please contact your admin for further details.\n
          Visit www.hrcompliance.wie-solutions.co.uk/leave to view your leave history.`,
        }
      );
    } else if (leaveListDialogAction === "delete") {
      // Remove selected leave from list
      updateLeaveListData(companyID, email, arrayRemove(selectedLeaveData))
        .then(() => {
          // Save changes to local state (to avoid fetching data again)
          const updatedLeaveListData = leaveListData.filter(
            (leave) =>
              !(
                leave.employee === selectedEmployee &&
                leave.startsOn === selectedLeave.startsOn &&
                leave.endsOn === selectedLeave.endsOn &&
                leave.type === selectedLeave.type
              )
          );
          setLeaveListData(updatedLeaveListData);
          setSnackbarMessage("Leave deleted successfully");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
        })
        .catch((e) => {
          console.error("[DB] => Leave Delete: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
          return;
        });
      // Increase employee Balance
      let balanceFieldName = "";
      if (selectedLeaveData.type === "Sick Leave") {
        balanceFieldName = "sickLeavesBalance";
      } else if (selectedLeaveData.type === "Annual Leave") {
        balanceFieldName = "annualLeavesBalance";
      }
      const employeeBalanceData = leaveBalanceData.find(
        (emp) => emp.employee === selectedEmployee
      );
      const balanceValue = employeeBalanceData[balanceFieldName];
      const balanceAfterDelete = balanceValue + selectedLeaveData.days;
      await updateLeaveBalanceData(companyID, email, {
        [balanceFieldName]: balanceAfterDelete,
      })
        .then(() => {
          // Save changes to local state (to avoid fetching data again)
          const selectedEmployeeBalance = leaveBalanceData.find(
            (emp) => emp.employee === selectedEmployee
          );
          selectedEmployeeBalance[balanceFieldName] = balanceAfterDelete;
          setLeaveBalanceData((prevBalanceData) => {
            const updatedBalanceData = [...prevBalanceData];
            const index = updatedBalanceData.findIndex(
              (emp) => emp.employee === selectedEmployee
            );
            updatedBalanceData[index] = selectedEmployeeBalance;
            return updatedBalanceData;
          });
          setIsLeaveActionLoading(false);
        })
        .catch((e) => {
          console.error("[DB] => Leave Balance Update: " + e);
          setSnackbarMessage("Something went wrong. Please try again.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLeaveActionLoading(false);
        });
    }
  }

  // Handle Add Leave
  const [leaveTotDays, setLeaveTotDays] = useState("1");
  const [aplyLeave, setAplyLeave] = useState({});
  useEffect(() => {
    setAplyLeave({
      ...aplyLeave,
      employee: employeesWithEmail[0],
    });
  }, [employeesWithEmail]);
  const [isApplyLeaveLoading, setIsApplyLeaveLoading] = useState(false);
  function handleAddLeave() {
    if (!aplyLeave.employee) {
      setSnackbarMessage("Please select an employee");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!aplyLeave.type) {
      setSnackbarMessage("Please select a leave type");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!aplyLeave.startsOn) {
      aplyLeave.startsOn = dayjs().format("DD-MM-YYYY");
    }
    if (!aplyLeave.startsOn == "Invalid Date") {
      setSnackbarMessage("Please select a valid start date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!aplyLeave.endsOn) {
      aplyLeave.endsOn = dayjs().add(1, "day").format("DD-MM-YYYY");
    }
    if (!aplyLeave.endsOn == "Invalid Date") {
      setSnackbarMessage("Please select a valid end date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!aplyLeave.reason) {
      setSnackbarMessage("Please enter a reason");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (aplyLeave.reason.length < 10 || aplyLeave.reason.length > 120) {
      setSnackbarMessage("Reason must be between 10 and 120 characters");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const leaveStart = dayjs(aplyLeave.startsOn, "DD-MM-YYYY");
    const leaveEnd = dayjs(aplyLeave.endsOn, "DD-MM-YYYY");
    if (leaveEnd.isBefore(leaveStart) || leaveEnd.isSame(leaveStart)) {
      setSnackbarMessage("End date must be after start date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const emailPattern = /\(([^)]+)\)/;
    const email = aplyLeave.employee.match(emailPattern)[1];

    const totalDays = leaveEnd.diff(leaveStart, "day");
    // Validate leave balance
    const leaveTypeField =
      aplyLeave.type === "Sick Leave"
        ? "sickLeavesBalance"
        : "annualLeavesBalance";
    const employeBalance = leaveBalanceData.find(
      (emp) => emp.employee === aplyLeave.employee
    );
    if (employeBalance[leaveTypeField] < totalDays) {
      setSnackbarMessage(
        "Not enough leave balance, contact admin to increase balance."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Validate if leave is already applied
    const leaveListDataFiltered = leaveListData.filter(
      (leave) =>
        leave.employee === aplyLeave.employee &&
        leave.type === aplyLeave.type &&
        leave.startsOn === aplyLeave.startsOn &&
        leave.endsOn === aplyLeave.endsOn
    );
    if (leaveListDataFiltered.length > 0) {
      setSnackbarMessage("Leave already applied!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const objectToSave = {
      startsOn: aplyLeave.startsOn,
      endsOn: aplyLeave.endsOn,
      type: aplyLeave.type,
      reason: aplyLeave.reason,
      days: totalDays,
      status: "Pending",
    };
    setIsApplyLeaveLoading(true);
    updateLeaveListData(companyID, email, arrayUnion(objectToSave))
      .then(() => {
        // Save changes to local state (to avoid fetching data again)
        const leavesData = {
          ...objectToSave,
          employee: aplyLeave.employee,
        };
        setLeaveListData([...leaveListData, leavesData]);
        setSnackbarMessage(
          isAdmin
            ? "Leave saved successfully"
            : "Leave applied successfully, you will be notified once it is approved or rejected."
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setAplyLeave({
          employee: employeesWithEmail[0],
        });
        setLeaveTotDays("1");
        setIsApplyLeaveLoading(false);
      })
      .catch((e) => {
        console.error("[DB] => Add Leave:" + e);
        setSnackbarMessage("Something went wrong, please try again later!");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsApplyLeaveLoading(false);
        return;
      });

    // Write Notification
    if (!isAdmin) {
      writeNotification(
        companyID,
        ["admin"],
        "Leave Application by " + aplyLeave.employee,
        `${aplyLeave.employee} has applied for ${aplyLeave.type} leave from ${aplyLeave.startsOn} to ${aplyLeave.endsOn}. Please review and approve or reject.`,
        {
          title: `Leave Application by ${aplyLeave.employee}`,
          body: `${aplyLeave.employee} has applied for ${aplyLeave.type} leave from ${aplyLeave.startsOn} to ${aplyLeave.endsOn}.
          \n Reason: ${aplyLeave.reason}
          \n Please review and approve or reject, visit www.hrcompliance.wie-solutions.co.uk/leave to view, approve or reject the application.`,
        }
      );
    }
  }

  // Handle leave balance save
  const [isLeaveBalanceLoading, setIsLeaveBalanceLoading] = useState(false);
  const [selectedLeaveBalanceToEdit, setSelectedLeaveBalanceToEdit] = useState({
    annualLeavesBalance: null,
    sickLeavesBalance: null,
  });
  const [editedLeaveBalance, setEditedLeaveBalance] = useState({
    annualLeavesBalance: null,
    sickLeavesBalance: null,
  });
  function handleLeaveBalanceSave() {
    if (
      editedLeaveBalance.annualLeavesBalance === null &&
      editedLeaveBalance.sickLeavesBalance === null
    ) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }

    if (
      editedLeaveBalance.annualLeavesBalance >
        leaveAllowances.annualLeavesAllowed ||
      editedLeaveBalance.sickLeavesBalance > leaveAllowances.sickLeavesAllowed
    ) {
      setSnackbarMessage(
        "Remaining values cannot be greater than allowed, Check settings."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    setIsBalanceDialogOpen(false);

    const emailPattern = /\(([^)]+)\)/;
    const email = selectedLeaveBalanceToEdit.employee.match(emailPattern)[1];
    setIsLeaveBalanceLoading(true);

    let objectToSave = {
      annualLeavesBalance: editedLeaveBalance.annualLeavesBalance,
      sickLeavesBalance: editedLeaveBalance.sickLeavesBalance,
    };

    updateLeaveBalanceData(companyID, email, objectToSave)
      .then(() => {
        // Save changes to local state (to avoid fetching data again)
        const employeeIndex = leaveBalanceData.findIndex(
          (employee) =>
            employee.employee === selectedLeaveBalanceToEdit.employee
        );
        if (employeeIndex !== -1) {
          leaveBalanceData[employeeIndex] = {
            ...leaveBalanceData[employeeIndex],
            annualLeavesBalance: editedLeaveBalance.annualLeavesBalance,
            sickLeavesBalance: editedLeaveBalance.sickLeavesBalance,
          };
          setLeaveBalanceData([...leaveBalanceData]);
        }
        setSnackbarMessage("Leave balance updated successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsLeaveBalanceLoading(false);
      })
      .catch((e) => {
        console.error("[DB] => Update Leave Balance:" + e);
        setSnackbarMessage("Something went wrong, please try again later!");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsLeaveBalanceLoading(false);
      });

    setEditedLeaveBalance({
      annualLeavesBalance: null,
      sickLeavesBalance: null,
    });
  }

  // Leave list filter
  const [leaveListFilter, setLeaveListFilter] = useState("All");
  const [leaveListAfterFilter, setLeaveListAfterFilter] = useState([]);
  useEffect(() => {
    leaveListFilter === "All" && setLeaveListAfterFilter(leaveListData);
    leaveListFilter === "Pending" &&
      setLeaveListAfterFilter(
        leaveListData.filter((leave) => {
          return leave.status === "Pending";
        })
      );
    leaveListFilter === "Approved" &&
      setLeaveListAfterFilter(
        leaveListData.filter((leave) => {
          return leave.status === "Approved";
        })
      );
  }, [leaveListData, leaveListFilter]);

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
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          maxHeight: "70%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingBottom: "10px",
        }}
      >
        <div
          style={{
            display: isTablet ? "block" : "flex",
            paddingTop: "10px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <RateReviewIcon
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
              }}
            >
              Leave List
            </Typography>
          </div>
          <div
            style={{
              marginLeft: isTablet ? "10px" : "20vw",
              marginTop: isTablet ? "10px" : "0",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => setLeaveListFilter("All")}
              style={{
                ...leaveBtnStyles,
                borderColor: "#a378ff",
                backgroundColor:
                  leaveListFilter === "All" ? "#a378ff" : "inherit",
                color: leaveListFilter === "All" ? "#fff" : "#000",
              }}
            >
              All
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => setLeaveListFilter("Pending")}
              style={{
                ...leaveBtnStyles,
                borderColor: "#Ffc85d",
                backgroundColor:
                  leaveListFilter === "Pending" ? "#Ffc85d" : "inherit",
                color: leaveListFilter === "Pending" ? "#fff" : "#000",
              }}
            >
              Waiting For Approval
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => setLeaveListFilter("Approved")}
              style={{
                ...leaveBtnStyles,
                borderColor: "#74b581",
                backgroundColor:
                  leaveListFilter === "Approved" ? "#74b581" : "inherit",
                color: leaveListFilter === "Approved" ? "#fff" : "#000",
              }}
            >
              Approved
            </Button>
          </div>
        </div>
        {isPageLoading ? (
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
        ) : leaveListAfterFilter.length === 0 ? (
          <Typography
            color="#a9a9a9"
            textAlign={"center"}
            marginTop={6}
            paddingBottom={4}
          >
            <i>No Leave Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Employee</TableCell>
                  )}
                  <TableCell style={tableHeaderStyles}>Type</TableCell>
                  <TableCell style={tableHeaderStyles}>Start On</TableCell>
                  <TableCell style={tableHeaderStyles}>End On</TableCell>
                  <TableCell style={tableHeaderStyles}>Days</TableCell>
                  <TableCell style={tableHeaderStyles}>Reason</TableCell>
                  <TableCell style={tableHeaderStyles}>Status</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveListAfterFilter.map((leave) => (
                  <TableRow
                    key={
                      leave.employee +
                      leave.type +
                      leave.startsOn +
                      leave.endsOn
                    }
                  >
                    {isAdmin && (
                      <TableCell
                        style={{
                          ...tableBodyStyles,
                          fontWeight: "500",
                          fontSize: "0.9rem",
                        }}
                      >
                        {leave.employee}
                      </TableCell>
                    )}
                    <TableCell style={tableBodyStyles}>{leave.type}</TableCell>
                    <TableCell style={tableBodyStyles}>
                      {leave.startsOn}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {leave.endsOn}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>{leave.days}</TableCell>
                    <TableCell style={tableBodyStyles}>
                      <i>{leave.reason}</i>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <div
                        style={{
                          backgroundColor:
                            leave.status === "Pending" ? "#Ffc85d" : "#74b581",
                          position: "relative",
                          borderRadius: "14px",
                          padding: "1px",
                        }}
                      >
                        {leave.status}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell style={tableBodyStyles}>
                        {leave.status === "Pending" && (
                          <>
                            <CheckCircleIcon
                              onClick={() => {
                                if (isLeaveActionLoading) {
                                  return;
                                }
                                setSelectedLeave(leave);
                                setLeaveListDialogTitle("Approve Leave");
                                setLeaveListDialogText(
                                  "Are you sure you want to approve this leave?"
                                );
                                setLeaveListDialogAction("approve");
                                setIsLeaveListDialogOpen(true);
                              }}
                              sx={{
                                cursor: isLeaveActionLoading
                                  ? "default"
                                  : "pointer",
                                color: "#74b581",
                                borderRadius: "20%",
                                padding: "2px",
                                ":hover": {
                                  backgroundColor: isLeaveActionLoading
                                    ? "none"
                                    : "#dcdcdc",
                                },
                              }}
                            />
                            <CloseIcon
                              onClick={() => {
                                if (isLeaveActionLoading) {
                                  return;
                                }
                                setSelectedLeave(leave);
                                setLeaveListDialogTitle("Reject Leave");
                                setLeaveListDialogText(
                                  "Are you sure you want to reject this leave?"
                                );
                                setLeaveListDialogAction("reject");
                                setIsLeaveListDialogOpen(true);
                              }}
                              sx={{
                                cursor: isLeaveActionLoading
                                  ? "default"
                                  : "pointer",
                                color: "#ed4337",
                                borderRadius: "20%",
                                padding: "2px",
                                ":hover": {
                                  backgroundColor: isLeaveActionLoading
                                    ? "none"
                                    : "#a9a9a9",
                                },
                              }}
                            />
                          </>
                        )}
                        {leave.status === "Approved" && (
                          <>
                            <DeleteIcon
                              onClick={() => {
                                if (isLeaveActionLoading) {
                                  return;
                                }
                                setSelectedLeave(leave);
                                setLeaveListDialogTitle("Delete Leave");
                                setLeaveListDialogText(
                                  "Are you sure you want to delete this leave?"
                                );
                                setLeaveListDialogAction("delete");
                                setIsLeaveListDialogOpen(true);
                              }}
                              sx={{
                                cursor: !isLeaveActionLoading && "pointer",
                                color: "#ed4337",
                                borderRadius: "20%",
                                padding: "2px",
                                ":hover": !isLeaveActionLoading && {
                                  backgroundColor: "#a9a9a9",
                                },
                              }}
                            />
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          maxHeight: "60%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <NoteAddIcon
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
            {isAdmin ? "Add Leave" : "Apply Leave"}
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
                value={aplyLeave.employee || null}
                disabled={!isAdmin}
                onChange={(_, value) => {
                  if (isAdmin) {
                    setAplyLeave({ ...aplyLeave, employee: value });
                  }
                }}
                sx={{
                  maxWidth: 340,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Employee" />
                )}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={340} height={"40px"} variant="rounded" />
            ) : (
              <Autocomplete
                options={["Annual Leave", "Sick Leave"]}
                size="small"
                onChange={(_, value) =>
                  setAplyLeave({ ...aplyLeave, type: value })
                }
                value={aplyLeave.type || null}
                sx={{
                  maxWidth: 340,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Leave Type" />
                )}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={320} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  value={
                    aplyLeave.startsOn
                      ? dayjs(aplyLeave.startsOn, "DD-MM-YYYY")
                      : dayjs()
                  }
                  format="DD-MM-YYYY"
                  label="Starts On"
                  slotProps={{ textField: { size: "small" } }}
                  onChange={(value) => {
                    setAplyLeave({
                      ...aplyLeave,
                      startsOn: dayjs(value).format("DD-MM-YYYY"),
                    }),
                      calculateTotalDays(
                        dayjs(value).format("DD-MM-YYYY"),
                        aplyLeave.endsOn
                          ? aplyLeave.endsOn
                          : dayjs().add(1, "day").format("DD-MM-YYYY"),
                        setSnackbarMessage,
                        setSnackbarSeverity,
                        setSnackbarOpen,
                        setLeaveTotDays
                      );
                  }}
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
              <Skeleton width={320} height={"40px"} variant="rounded" />
            ) : (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Tooltip title="Weekends count towards the total days!" arrow>
                  <div>
                    <DatePicker
                      value={
                        aplyLeave.endsOn
                          ? dayjs(aplyLeave.endsOn, "DD-MM-YYYY")
                          : dayjs().add(1, "day")
                      }
                      format="DD-MM-YYYY"
                      label="Ends On"
                      slotProps={{ textField: { size: "small" } }}
                      onChange={(value) => {
                        setAplyLeave({
                          ...aplyLeave,
                          endsOn: dayjs(value).format("DD-MM-YYYY"),
                        });
                        calculateTotalDays(
                          aplyLeave.startsOn
                            ? aplyLeave.startsOn
                            : dayjs().format("DD-MM-YYYY"),
                          dayjs(value).format("DD-MM-YYYY"),
                          setSnackbarMessage,
                          setSnackbarSeverity,
                          setSnackbarOpen,
                          setLeaveTotDays
                        );
                      }}
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
                  </div>
                </Tooltip>
              </LocalizationProvider>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={8}>
            {isPageLoading ? (
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Reason"
                variant="outlined"
                size="small"
                name="reason"
                value={aplyLeave.reason || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                onChange={(e) =>
                  setAplyLeave({ ...aplyLeave, reason: e.target.value })
                }
                sx={{
                  width: "80%",
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
          <Grid item xs={12} md={6} lg={8}>
            {isPageLoading ? (
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <Typography
                sx={{
                  width: "80%",
                  height: "40px",
                  fontFamily: "'Open Sans', Arial",
                  fontStyle: "italic",
                  fontSize: "0.9rem",
                  marginTop: "10px",
                }}
              >
                Total days: &nbsp;
                <span
                  style={{
                    fontWeight: "bold",
                    fontStyle: "normal",
                    fontSize: "1.1rem",
                    color: "#a378ff",
                  }}
                >
                  {leaveTotDays}
                </span>
              </Typography>
            )}
          </Grid>
        </Grid>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingBottom: "14px",
          }}
        >
          <Button
            variant="contained"
            disabled={isPageLoading || isApplyLeaveLoading}
            onClick={() => handleAddLeave()}
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
            {isApplyLeaveLoading ? (
              <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
            ) : (
              <>
                {isAdmin ? (
                  <SaveIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                ) : (
                  <SendIcon style={{ marginRight: "12px", fontSize: "24px" }} />
                )}
                {isAdmin ? "Save" : "Apply"}
              </>
            )}
          </Button>
        </div>
      </Box>
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          maxHeight: "70%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "20px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <IndeterminateCheckBoxIcon
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
            Leave Balance
          </Typography>
        </div>
        {isPageLoading ? (
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
        ) : leaveBalanceData.length === 0 ? (
          <Typography
            color="#a9a9a9"
            textAlign={"center"}
            marginTop={6}
            paddingBottom={4}
          >
            <i>Leave Balance Data Not Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Employee</TableCell>
                  <TableCell style={tableHeaderStyles}>Duration</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Annual Leave Remaining
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Sick Leave Remaining
                  </TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveBalanceData.map((balance) => (
                  <TableRow key={balance.employee}>
                    <TableCell
                      style={{
                        ...tableBodyStyles,
                        fontWeight: "500",
                        fontSize: "0.9rem",
                      }}
                    >
                      {balance.employee}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {balance.duration}
                    </TableCell>
                    <TableCell
                      style={{
                        ...tableBodyStyles,
                        fontWeight: "700",
                        color: "#f3887c",
                      }}
                    >
                      {balance.annualLeavesBalance}
                    </TableCell>
                    <TableCell
                      style={{
                        ...tableBodyStyles,
                        fontWeight: "700",
                        color: "#f3887c",
                      }}
                    >
                      {balance.sickLeavesBalance}
                    </TableCell>
                    {isAdmin && (
                      <TableCell style={tableBodyStyles}>
                        <EditIcon
                          onClick={() => {
                            if (isLeaveBalanceLoading) {
                              return;
                            }
                            setSelectedLeaveBalanceToEdit(balance);
                            setIsBalanceDialogOpen(true);
                          }}
                          sx={{
                            cursor: isLeaveBalanceLoading
                              ? "default"
                              : "pointer",
                            color: "#a378ff",
                            borderRadius: "20%",
                            padding: "2px",
                            ":hover": {
                              backgroundColor: isLeaveBalanceLoading
                                ? "none"
                                : "#dcdcdc",
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
      {/* Leave List Dialog */}
      <Dialog
        open={isLeaveListDialogOpen}
        onClose={() => setIsLeaveListDialogOpen(false)}
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
            {leaveListDialogTitle == "Approve Leave" && (
              <CheckBoxIcon
                sx={{
                  color: "#74b581",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            )}
            {leaveListDialogTitle == "Reject Leave" && (
              <CancelIcon
                sx={{
                  color: "#ed4337",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            )}
            {leaveListDialogTitle == "Delete Leave" && (
              <DeleteIcon
                sx={{
                  color: "#ed4337",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            )}
            <Box>{leaveListDialogTitle}</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {leaveListDialogText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLeaveListDialogOpen(false)}>Close</Button>
          <Button
            sx={{
              color:
                leaveListDialogAction === "reject" ||
                leaveListDialogAction === "delete"
                  ? "#ed4337"
                  : "#74b581",
            }}
            onClick={handleLeaveAction}
          >
            {leaveListDialogAction === "reject"
              ? "Reject"
              : leaveListDialogAction === "delete"
              ? "Delete"
              : "Approve"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Leave Balance Dialog */}

      {/* Leave Balance Dialog */}
      <Dialog
        open={isBalanceDialogOpen}
        onClose={() => {
          setIsBalanceDialogOpen(false),
            setEditedLeaveBalance({
              annualLeavesBalance: null,
              sickLeavesBalance: null,
            });
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            <EditNoteIcon
              sx={{
                color: "#a378ff",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box>Edit Leave Balance</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            <TextField
              id="AnnualLeaveBalance"
              label="Annual Leave Remaining"
              type="number"
              variant="outlined"
              size="small"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
              }}
              defaultValue={selectedLeaveBalanceToEdit.annualLeavesBalance}
              sx={{
                marginTop: "10px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#f3887c",
                  backgroundColor: "#f3887c10",
                },
              }}
              onChange={(e) => {
                setEditedLeaveBalance({
                  annualLeavesBalance: Number(e.target.value),
                  sickLeavesBalance: !editedLeaveBalance.sickLeavesBalance
                    ? selectedLeaveBalanceToEdit.sickLeavesBalance
                    : editedLeaveBalance.sickLeavesBalance,
                });
              }}
            />
            <TextField
              id="SickLeaveBalance"
              label="Sick Leave Remaining"
              type="number"
              variant="outlined"
              size="small"
              inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
              InputLabelProps={{
                style: { fontFamily: "'Open Sans', Arial" },
              }}
              defaultValue={selectedLeaveBalanceToEdit.sickLeavesBalance}
              sx={{
                marginTop: "10px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  border: "2px solid",
                  borderColor: "#Ffc85d",
                  backgroundColor: "#Ffc85d10",
                },
              }}
              onChange={(e) => {
                setEditedLeaveBalance({
                  sickLeavesBalance: Number(e.target.value),
                  annualLeavesBalance: !editedLeaveBalance.annualLeavesBalance
                    ? selectedLeaveBalanceToEdit.annualLeavesBalance
                    : editedLeaveBalance.annualLeavesBalance,
                });
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsBalanceDialogOpen(false),
                setEditedLeaveBalance({
                  annualLeavesBalance: null,
                  sickLeavesBalance: null,
                });
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleLeaveBalanceSave}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Leave Balance Dialog */}
    </div>
  );
}
export default Leave;
