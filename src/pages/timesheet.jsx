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
import PostAddIcon from "@mui/icons-material/PostAdd";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import SaveIcon from "@mui/icons-material/Save";
import SummarizeIcon from "@mui/icons-material/Summarize";
import DeleteIcon from "@mui/icons-material/Delete";

import { firebaseDb } from "../firebase/baseConfig";
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const timesheetBtnStyles = {
  backgroundColor: "inherit",
  color: "#000",
  boxShadow: "none",
  borderRadius: "26px",
  height: "30px",
  fontSize: "0.75rem",
  textTransform: "none",
  fontFamily: "'Opn Sans', Arial",
  border: "1.3px solid #f3887c",
  marginRight: "20px",
  lineHeight: "12px",
};

const tableContainerStyles = {
  borderRadius: "20px",
  width: isTablet ? "100%" : "98%",
  marginBottom: "10px",
  marginTop: "10px",
  overflow: "auto",

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

const MAX_TIMESHEET_COUNT = 319;

function updateTimeSheetData(
  action,
  companyID,
  email,
  timesheetDetailsToChange,
  currentTimeSheetData
) {
  return new Promise((resolve, reject) => {
    const timesheetDocRef = doc(
      firebaseDb,
      `companies/${companyID}/timesheets/${email}`
    );
    let timesheetsCount = currentTimeSheetData.length;
    let timesheetChange = [...currentTimeSheetData];
    if (action === "add") {
      timesheetsCount = timesheetsCount + 1;
      // Maintain Max Timesheet Count
      if (timesheetsCount > MAX_TIMESHEET_COUNT) {
        timesheetChange.splice(MAX_TIMESHEET_COUNT);
      }

      // Insert at right position based on date
      let inserted = false;
      for (let i = 0; i < timesheetChange.length; i++) {
        const thisTimesheetDate = dayjs(timesheetChange[i].date, "DD-MM-YYYY");
        if (
          dayjs(timesheetDetailsToChange.date, "DD-MM-YYYY").isAfter(
            thisTimesheetDate
          )
        ) {
          // Insert at this index
          timesheetChange.splice(i, 0, timesheetDetailsToChange);
          timesheetsCount = timesheetChange.length;
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        // Insert at end
        timesheetsCount = timesheetChange.push(timesheetDetailsToChange);
      }
    } else if (action === "delete") {
      timesheetsCount = timesheetsCount - 1;
      timesheetChange = currentTimeSheetData.filter(
        (timesheet) => timesheet.date != timesheetDetailsToChange.date
      );
    }

    const docData = {
      timesheetsCount: timesheetsCount,
      timesheets: timesheetChange,
    };
    const docOperation =
      action === "add" && timesheetsCount === 1
        ? setDoc(timesheetDocRef, docData)
        : action === "add" || timesheetsCount > 0
        ? updateDoc(timesheetDocRef, docData)
        : deleteDoc(timesheetDocRef);

    docOperation
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

async function getTimeSheetData(
  companyID,
  email,
  setIsTimeSheetLoading,
  setTimesheetData,
  setSnackbarMessage,
  setSnackbarSeverity,
  setSnackbarOpen
) {
  setIsTimeSheetLoading(true);
  try {
    const timesheetDocRef = doc(
      firebaseDb,
      `companies/${companyID}/timesheets/${email}`
    );
    const timesheetDocSnap = await getDoc(timesheetDocRef);
    if (timesheetDocSnap.exists()) {
      setTimesheetData(timesheetDocSnap.data().timesheets);
      setIsTimeSheetLoading(false);
    } else {
      setTimesheetData([]);
      setIsTimeSheetLoading(false);
    }
  } catch (e) {
    console.error("[DB] => Get Timesheet Data: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage("Failed to fetch timesheet data.");
    setSnackbarOpen(true);
    setTimesheetData([]);
    setIsTimeSheetLoading(false);
  }
}

async function getDetails(
  isAdmin,
  companyID,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setIsPageLoading,
  setProjects,
  setEmployeesWithEmail,
  setReportersWithEmail,
  usrEmail,
  setIsTimeSheetLoading,
  setTimesheetData
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const companyDocSnap = await getDoc(companyDocRef);
    if (companyDocSnap.exists()) {
      if (
        companyDocSnap.data().projects &&
        companyDocSnap.data().projects.length != 0
      ) {
        let projects = [];
        companyDocSnap.data().projects.forEach((project) => {
          projects.push(project["name"]);
        });
        setProjects(projects);
      } else {
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);
        setSnackbarMessage("Please configure projects in settings.");
      }

      if (companyDocSnap.data().employees_brief) {
        let employeesWithEmail = [];
        let reportersWithEmail = [];
        Object.keys(companyDocSnap.data().employees_brief).forEach((key) => {
          const employeeName = companyDocSnap.data().employees_brief[key].name;
          const employeeEmail =
            companyDocSnap.data().employees_brief[key].email;

          if (isAdmin) {
            employeesWithEmail.push(`${employeeName} (${employeeEmail})`);
          } else if (employeeEmail === usrEmail) {
            employeesWithEmail.push(`${employeeName} (${employeeEmail})`);
          }

          reportersWithEmail.push(`${employeeName} (${employeeEmail})`);
        });
        setEmployeesWithEmail(employeesWithEmail);
        setReportersWithEmail(reportersWithEmail);

        // Fetch Timesheet Data (inital Fetch)
        const emailPattern = /\(([^)]+)\)/;
        const email = employeesWithEmail[0].match(emailPattern)[1];
        getTimeSheetData(
          companyID,
          email,
          setIsTimeSheetLoading,
          setTimesheetData,
          setSnackbarMessage,
          setSnackbarSeverity,
          setSnackbarOpen
        );
      }
    }
    setIsPageLoading(false);
  } catch (e) {
    console.error("[DB] => Get Details: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage("Something went wrong. Please try again.");
    setSnackbarOpen(true);
  }
}

function calculateTotalHours(startTime, endTime) {
  let [startHour, startMinute] = startTime.split(":").map(Number);
  let [endHour, endMinute] = endTime.split(":").map(Number);

  let startDate = new Date(0, 0, 0, startHour, startMinute);
  let endDate = new Date(0, 0, 0, endHour, endMinute);

  let diff = endDate - startDate;

  let hours = diff / (1000 * 60 * 60);

  return hours;
}

function Timesheet({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  usrEmail,
}) {
  // Fetch Company Details
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [employeesWithEmail, setEmployeesWithEmail] = useState([]);
  const [reportersWithEmail, setReportersWithEmail] = useState([]);
  const [isTimeSheetLoading, setIsTimeSheetLoading] = useState(true);
  const [timesheetData, setTimesheetData] = useState([]);
  const [timesheetFilterEmployee, setTimesheetFilterEmployee] = useState(null);
  const [timesheetFilterDays, setTimesheetFilterDays] = useState(
    MAX_TIMESHEET_COUNT + 1
  );
  useEffect(() => {
    getDetails(
      isAdmin,
      companyID,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setIsPageLoading,
      setProjects,
      setEmployeesWithEmail,
      setReportersWithEmail,
      usrEmail,
      setIsTimeSheetLoading,
      setTimesheetData
    );
  }, [companyID]);

  //Calculate total hours based on days filter
  const [totalHours, setTotalHours] = useState(0);
  useEffect(() => {
    let totalHours = 0;
    timesheetData.slice(0, timesheetFilterDays).forEach((timesheet) => {
      totalHours += timesheet.totalHours;
    });
    setTotalHours(totalHours);
  }, [timesheetData, timesheetFilterDays]);

  const [dialogBoxOpen, setDialogBoxOpen] = useState(false);

  const [timesheetDetailsToSave, setTimesheetDetailsToSave] = useState({});
  useEffect(() => {
    setTimesheetFilterEmployee(employeesWithEmail[0]);
    setTimesheetDetailsToSave({
      ...timesheetDetailsToSave,
      employee: employeesWithEmail[0],
    });
  }, [employeesWithEmail]);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  function handleSave() {
    if (!timesheetDetailsToSave.employee) {
      setSnackbarMessage("Please select an employee");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!timesheetDetailsToSave.project) {
      setSnackbarMessage("Please select a project");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!timesheetDetailsToSave.reporter) {
      setSnackbarMessage("Please select a reporter");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!timesheetDetailsToSave.date) {
      timesheetDetailsToSave.date = dayjs().format("DD-MM-YYYY");
    }
    if (timesheetDetailsToSave.date == "Invalid Date") {
      setSnackbarMessage("Please select a valid date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const existingTimesheet = timesheetData.find(
      (timesheet) => timesheet.date === timesheetDetailsToSave.date
    );
    if (existingTimesheet) {
      setSnackbarMessage(
        `Timesheet for ${timesheetDetailsToSave.date} already exists.`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const datePicked = dayjs(timesheetDetailsToSave.date, "DD-MM-YYYY");
    const maxTimesheetDaysAgo = dayjs().subtract(MAX_TIMESHEET_COUNT, "day");
    if (datePicked.isBefore(maxTimesheetDaysAgo)) {
      setSnackbarMessage(
        `Cannot save timesheet for dates more than ${MAX_TIMESHEET_COUNT} days ago.`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (
      !timesheetDetailsToSave.startTime ||
      timesheetDetailsToSave.startTime == "Invalid Date"
    ) {
      setSnackbarMessage("Please select a valid start time");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (
      !timesheetDetailsToSave.endTime ||
      timesheetDetailsToSave.endTime == "Invalid Date"
    ) {
      setSnackbarMessage("Please select a valid end time");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let totalHours = calculateTotalHours(
      timesheetDetailsToSave.startTime,
      timesheetDetailsToSave.endTime
    );

    if (totalHours <= 0) {
      setSnackbarMessage("End time should be greater than start time");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    timesheetDetailsToSave.totalHours = totalHours;

    const emailPattern = /\(([^)]+)\)/;
    const email = timesheetDetailsToSave.employee.match(emailPattern)[1];

    setIsSaveLoading(true);
    updateTimeSheetData(
      "add",
      companyID,
      email,
      timesheetDetailsToSave,
      timesheetData
    )
      .then(() => {
        setSnackbarMessage("Timesheet saved successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        // Changing the local state (to avoid fetching again)
        let timesheetsCount = timesheetData.length + 1;
        if (timesheetsCount > MAX_TIMESHEET_COUNT) {
          // Maintain Max Timesheet Count
          setTimesheetData(timesheetData.splice(MAX_TIMESHEET_COUNT));
        }
        // Insert at right position based on date
        let inserted = false;
        for (let i = 0; i < timesheetData.length; i++) {
          if (
            dayjs(timesheetDetailsToSave.date, "DD-MM-YYYY").isAfter(
              dayjs(timesheetData[i].date, "DD-MM-YYYY")
            )
          ) {
            // Insert at index
            setTimesheetData([
              ...timesheetData.slice(0, i),
              timesheetDetailsToSave,
              ...timesheetData.slice(i),
            ]);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          // Insert at last
          setTimesheetData([...timesheetData, timesheetDetailsToSave]);
        }
        // Keeping the name
        setTimesheetDetailsToSave({
          employee: timesheetDetailsToSave.employee,
        });
        setIsSaveLoading(false);
      })
      .catch((e) => {
        console.error("[DB] => Add Timesheet: " + e);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsSaveLoading(false);
      });
  }

  const [selectedTimsheetToDelete, setSelectedTimsheetToDelete] =
    useState(null);
  const [isTimeSheetDeleteLoading, setIsTimeSheetDeleteLoading] =
    useState(false);

  function handleTimesheetFilterChange(employeeNameWithEmail) {
    // Fetch timesheet data on employee change
    if (employeeNameWithEmail) {
      const emailPattern = /\(([^)]+)\)/;
      const email = employeeNameWithEmail.match(emailPattern)[1];

      getTimeSheetData(
        companyID,
        email,
        setIsTimeSheetLoading,
        setTimesheetData,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen
      );
    }
  }

  function handleTimesheetDelete() {
    setDialogBoxOpen(false);
    setIsTimeSheetDeleteLoading(true);
    const emailPattern = /\(([^)]+)\)/;
    const email = timesheetFilterEmployee.match(emailPattern)[1];
    updateTimeSheetData(
      "delete",
      companyID,
      email,
      selectedTimsheetToDelete,
      timesheetData
    )
      .then(() => {
        setSnackbarMessage("Timesheet deleted successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setTimesheetData(
          timesheetData.filter(
            (timesheet) => timesheet.date != selectedTimsheetToDelete.date
          )
        );
        setSelectedTimsheetToDelete(null);
        setIsTimeSheetDeleteLoading(false);
      })
      .catch((e) => {
        console.error("[DB] => Delete Timesheet: " + e);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsTimeSheetDeleteLoading(false);
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
      {isAdmin && !isPageLoading && (
        <Autocomplete
          options={employeesWithEmail}
          value={timesheetFilterEmployee || null}
          onChange={(event, newValue) => {
            setTimesheetFilterEmployee(newValue);
            setTimesheetDetailsToSave({
              ...timesheetDetailsToSave,
              employee: newValue,
            });
            handleTimesheetFilterChange(newValue);
          }}
          sx={{
            width: 300,
            padding: "10px",
            alignSelf: "start",
            marginLeft: "10px",
            backgroundColor: "#fff",
            borderRadius: "16px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
            },
            "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4b49ac",
            },
          }}
          size="small"
          renderInput={(params) => (
            <TextField {...params} label="Filter By Employee" />
          )}
        />
      )}
      {isAdmin && (
        <Box
          sx={{
            width: isTablet ? "96%" : "98%",
            backgroundColor: "#fff",
            boxShadow: "0px 4px 4px #CCCCCC",
            margin: "10px 20px 10px 0",
            borderRadius: "12px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div style={{ display: "flex", paddingTop: "10px" }}>
            <PostAddIcon
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
              Add Timesheet
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
                <Autocomplete
                  options={employeesWithEmail}
                  value={timesheetDetailsToSave.employee || null}
                  onChange={(event, newValue) => {}}
                  sx={{
                    width: 320,
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
                  size="small"
                  disabled
                  renderInput={(params) => (
                    <TextField {...params} label="Employee" />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={320} height={"40px"} variant="rounded" />
              ) : (
                <Autocomplete
                  options={projects}
                  value={timesheetDetailsToSave.project || null}
                  onChange={(event, newValue) => {
                    setTimesheetDetailsToSave({
                      ...timesheetDetailsToSave,
                      project: newValue,
                    });
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
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Project" />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={320} height={"40px"} variant="rounded" />
              ) : (
                <Autocomplete
                  options={reportersWithEmail}
                  value={timesheetDetailsToSave.reporter || null}
                  onChange={(event, newValue) => {
                    setTimesheetDetailsToSave({
                      ...timesheetDetailsToSave,
                      reporter: newValue,
                    });
                  }}
                  sx={{
                    width: 320,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "20px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#c47562",
                        backgroundColor: "#c4756210",
                      },
                  }}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Reporter" />
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
                      timesheetDetailsToSave.date
                        ? dayjs(timesheetDetailsToSave.date, "DD-MM-YYYY")
                        : dayjs()
                    }
                    onChange={(value) => {
                      setTimesheetDetailsToSave({
                        ...timesheetDetailsToSave,
                        date: dayjs(value).format("DD-MM-YYYY"),
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
                          borderColor: "#Ffc85d",
                          backgroundColor: "#Ffc85d10",
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
                  <TimePicker
                    label="Start Time"
                    value={
                      timesheetDetailsToSave.startTime
                        ? dayjs(timesheetDetailsToSave.startTime, "HH:mm")
                        : null
                    }
                    onChange={(value) => {
                      setTimesheetDetailsToSave({
                        ...timesheetDetailsToSave,
                        startTime: dayjs(value).format("HH:mm"),
                      });
                    }}
                    ampm={false}
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      width: 320,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#63aceb",
                          backgroundColor: "#63aceb10",
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
                  <TimePicker
                    label="End Time"
                    value={
                      timesheetDetailsToSave.endTime
                        ? dayjs(timesheetDetailsToSave.endTime, "HH:mm")
                        : null
                    }
                    onChange={(value) => {
                      setTimesheetDetailsToSave({
                        ...timesheetDetailsToSave,
                        endTime: dayjs(value).format("HH:mm"),
                      });
                    }}
                    ampm={false}
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      width: 320,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                      },
                      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                        {
                          border: "2px solid",
                          borderColor: "#d4b293",
                          backgroundColor: "#d4b29310",
                        },
                    }}
                  />
                </LocalizationProvider>
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
              sx={{
                backgroundColor: "#74b581",
                width: "120px",
                height: "36px",
                fontSize: "0.90rem",
                textTransform: "none",
                borderRadius: "18px",
                marginTop: "16px",
                marginRight: isMobile ? "20px" : "40px",
                fontFamily: "'Opn Sans', Arial",
                fontWeight: "bold",
                ":hover": { backgroundColor: "#73a47c", color: "#000" },
              }}
              onClick={handleSave}
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
          borderRadius: "12px",
          boxShadow: "0px 4px 4px #CCCCCC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div
          style={{
            display: isTablet ? "block" : "flex",
            width: "100%",
            paddingTop: "10px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex" }}>
            <SummarizeIcon
              style={{
                fontSize: "30px",
                color: "#f4a322",
                marginLeft: "20px",
              }}
            />
            <Typography
              variant="h6"
              style={{
                fontWeight: "500",
                marginLeft: "14px",
              }}
            >
              Timesheet Summary
            </Typography>
          </div>
          <div
            style={{
              display: "flex",
              paddingLeft: "10px",
              paddingRight: "10px",
              marginTop: isTablet ? "6px" : 0,
            }}
          >
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setTimesheetFilterDays(7);
              }}
              disabled={isPageLoading || timesheetData.length === 0}
              style={{
                ...timesheetBtnStyles,
                backgroundColor:
                  timesheetFilterDays === 7 ? "#f3887c" : "inherit",
                color: timesheetFilterDays === 7 ? "#fff" : "#000",
              }}
            >
              Last 7 Entires
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setTimesheetFilterDays(14);
              }}
              disabled={isPageLoading || timesheetData.length === 0}
              style={{
                ...timesheetBtnStyles,
                backgroundColor:
                  timesheetFilterDays === 14 ? "#f3887c" : "inherit",
                color: timesheetFilterDays === 14 ? "#fff" : "#000",
              }}
            >
              Last 14 Entires
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setTimesheetFilterDays(30);
              }}
              disabled={isPageLoading || timesheetData.length === 0}
              style={{
                ...timesheetBtnStyles,
                backgroundColor:
                  timesheetFilterDays === 30 ? "#f3887c" : "inherit",
                color: timesheetFilterDays === 30 ? "#fff" : "#000",
              }}
            >
              Last 30 Entires
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setTimesheetFilterDays(MAX_TIMESHEET_COUNT + 1);
              }}
              disabled={isPageLoading || timesheetData.length === 0}
              style={{
                ...timesheetBtnStyles,
                backgroundColor:
                  timesheetFilterDays === MAX_TIMESHEET_COUNT + 1
                    ? "#f3887c"
                    : "inherit",
                color:
                  timesheetFilterDays === MAX_TIMESHEET_COUNT + 1
                    ? "#fff"
                    : "#000",
              }}
            >
              All {`(${timesheetData.length})`}
            </Button>
          </div>
        </div>
        {isPageLoading || isTimeSheetLoading ? (
          <Skeleton
            width={isMobile ? "93vw" : isTablet ? "65vw" : "78vw"}
            height={"20vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
            }}
          />
        ) : timesheetData.length === 0 ? (
          <Typography
            color="#a9a9a9"
            textAlign={"center"}
            marginTop={8}
            paddingBottom={4}
          >
            <i>No Timesheets Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Date</TableCell>
                  <TableCell style={tableHeaderStyles}>Project</TableCell>
                  <TableCell style={tableHeaderStyles}>Start Time</TableCell>
                  <TableCell style={tableHeaderStyles}>End Time</TableCell>
                  <TableCell style={tableHeaderStyles}>Total Hours</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {timesheetData
                  .slice(0, timesheetFilterDays)
                  .map((timesheet) => (
                    <TableRow key={timesheet.date}>
                      <TableCell style={tableBodyStyles}>
                        {timesheet.date}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        {timesheet.project}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        {timesheet.startTime}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        {timesheet.endTime}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        {timesheet.totalHours}
                      </TableCell>
                      {isAdmin && (
                        <TableCell
                          style={{ ...tableBodyStyles, textAlign: "center" }}
                        >
                          <DeleteIcon
                            onClick={() => {
                              if (!isTimeSheetDeleteLoading) {
                                setDialogBoxOpen(true);
                                setSelectedTimsheetToDelete(timesheet);
                              }
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
        <Typography
          sx={{
            marginTop: "10px",
            marginBottom: "10px",
            alignSelf: "flex-start",
            marginLeft: "20px",
            fontStyle: "italic",
            color: "#a9a9a9",
          }}
        >
          Total Hours:&nbsp;
          <span
            style={{
              fontWeight: "bold",
              fontStyle: "normal",
              color: "#a378ff",
            }}
          >
            {totalHours}
          </span>
        </Typography>
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
            <Box>Delete Timesheet?</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this timesheet?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogBoxOpen(false)}>No</Button>
          <Button sx={{ color: "#ed4337" }} onClick={handleTimesheetDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Timesheet;
