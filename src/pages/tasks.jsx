import React, { useState, useEffect } from "react";

import {
  Box,
  Grid,
  Typography,
  TextField,
  InputLabel,
  MenuItem,
  Select,
  FormControl,
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
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import AddTaskIcon from "@mui/icons-material/AddTask";
import SaveIcon from "@mui/icons-material/Save";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DeleteIcon from "@mui/icons-material/Delete";
import { firebaseDb } from "../firebase/baseConfig";
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
  limit,
  startAfter,
  orderBy,
} from "firebase/firestore";
import { writeNotification } from "../firebase/notifications";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const tasksBtnStyles = {
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

async function deleteTask(companyID, taskID) {
  return new Promise(async (resolve, reject) => {
    const tasksColRef = collection(firebaseDb, "companies", companyID, "tasks");
    await deleteDoc(doc(tasksColRef, taskID))
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

async function getTasks(
  companyID,
  isAdmin,
  usrEmail,
  priority,
  taskData,
  setTaskData,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  lastVisibleDoc,
  setLastVisibleDoc
) {
  try {
    const pageSize = 10;
    const tasksColRef = collection(firebaseDb, "companies", companyID, "tasks");
    let tasksQuery = query(
      tasksColRef,
      orderBy("deleteTime", "desc"),
      limit(pageSize)
    );
    if (!isAdmin && priority !== "All") {
      // An employee is trying to get Low, Medium, High priority tasks
      tasksQuery = query(
        tasksColRef,
        where("assignedTo", "==", usrEmail),
        where("priority", "==", priority)
      );
    } else if (!isAdmin) {
      // An employee is getting All tasks
      tasksQuery = query(tasksColRef, where("assignedTo", "==", usrEmail));
    } else if (priority !== "All") {
      // Admin is trying to get Low, Medium, High priority tasks
      tasksQuery = query(tasksColRef, where("priority", "==", priority));
    }
    if (lastVisibleDoc) {
      tasksQuery = query(tasksQuery, startAfter(lastVisibleDoc));
    }
    const tasksSnapshot = await getDocs(tasksQuery);
    if (!tasksSnapshot.empty) {
      const tasks = [];
      tasksSnapshot.forEach((doc) => {
        tasks.push({ ...doc.data(), id: doc.id });
        setLastVisibleDoc(doc);
      });
      if (lastVisibleDoc === null) {
        setTaskData(tasks);
      } else {
        setTaskData([...taskData, ...tasks]);
      }
    } else {
      if (lastVisibleDoc === null) {
        // Initial fetch and its empty
        setTaskData([]);
      } else {
        // No more data to fetch
        setSnackbarMessage("No more tasks to fetch");
        setSnackbarSeverity("info");
        setSnackbarOpen(true);
      }
    }
  } catch (e) {
    console.error("[DB] => Get Tasks: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage(
      "Something went wrong while fetching tasks. Please try again."
    );
    setSnackbarOpen(true);
  }
}

function addTask(companyID, taskData) {
  return new Promise(async (resolve, reject) => {
    try {
      const tasksColRef = collection(
        firebaseDb,
        "companies",
        companyID,
        "tasks"
      );
      const docRef = await addDoc(tasksColRef, taskData);
      resolve(docRef.id);
    } catch (e) {
      reject(e);
    }
  });
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

function Tasks({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  usrEmail,
}) {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [employeesWithEmail, setEmployeesWithEmail] = useState([]);
  const [taskData, setTaskData] = useState([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);

  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
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
    }

    setIsTasksLoading(true);
    getTasks(
      companyID,
      isAdmin,
      usrEmail,
      "All",
      taskData,
      setTaskData,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      lastVisibleDoc,
      setLastVisibleDoc
    ).finally(() => {
      setIsTasksLoading(false);
      setIsPageLoading(false);
    });
  }, [companyID]);

  const [dialogBoxOpen, setDialogBoxOpen] = useState(false);

  const [task, setTask] = useState({});

  const [isSaveLoading, setIsSaveLoading] = useState(false);
  function handleSave() {
    if (!task.name || task.name.length < 3) {
      setSnackbarMessage("Task name must be at least 3 characters long");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!task.assignee) {
      setSnackbarMessage("Please select an assignee");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!task.startDate) {
      task.startDate = dayjs().format("DD-MM-YYYY");
    }
    if (task.startDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid start date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!task.endDate) {
      task.endDate = dayjs().add(7, "day").format("DD-MM-YYYY");
    }
    if (task.endDate === "Invalid Date") {
      setSnackbarMessage("Please select a valid end date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (task.info && task.info.length > 500) {
      setSnackbarMessage("Task info must be less than 500 characters long");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!task.priority) {
      task.priority = "Low";
    }

    if (taskData.some((t) => t.name === task.name)) {
      setSnackbarMessage("A task with this name already exists");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const startDate = dayjs(task.startDate, "DD-MM-YYYY");
    const endDate = dayjs(task.endDate, "DD-MM-YYYY");
    if (startDate.isAfter(endDate)) {
      setSnackbarMessage("Start date must be before the end date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    task.deleteTime = Timestamp.fromDate(endDate.toDate());

    const emailPattern = /\(([^)]+)\)/;
    const emailMatch = task.assignee.match(emailPattern);
    if (emailMatch) {
      task.assignedTo = emailMatch[1];
    }

    setIsSaveLoading(true);
    addTask(companyID, task)
      .then((docID) => {
        if (tasksFilter === task.priority || tasksFilter === "All") {
          task.id = docID;
          setTaskData([task, ...taskData]);
          setLastVisibleDoc(task["deleteTime"]);
        }
        setSnackbarMessage("Task added successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setTask({});

        // Write Notification
        writeNotification(
          companyID,
          [task.assignedTo],
          "You have been assigned a new task",
          task.name
        );
      })
      .catch((e) => {
        console.error("[DB] => AddTask: " + e);
        setSnackbarSeverity("error");
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarOpen(true);
      })
      .finally(() => {
        setIsSaveLoading(false);
      });
  }

  const [selectedTaskToDelete, setSelectedTaskToDelete] = useState(null);
  function handleTaskDelete() {
    setDialogBoxOpen(false);
    deleteTask(companyID, selectedTaskToDelete.id)
      .then(() => {
        // Save changes to local state (to avoid fetching data again)
        const index = taskData.findIndex(
          (t) => t.id === selectedTaskToDelete.id
        );
        if (index === taskData.length - 1) {
          setLastVisibleDoc(taskData[index]["deleteTime"]);
        }
        setTaskData(taskData.filter((t) => t.id !== selectedTaskToDelete.id));
        setSnackbarMessage("Task deleted successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setSelectedTaskToDelete(null);
        setDialogBoxOpen(false);
      })
      .catch((e) => {
        console.error("[DB] => Delete Task: " + e);
        setSnackbarSeverity("error");
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarOpen(true);
      });
  }

  const [tasksFilter, setTasksFilter] = useState("All");
  function handleFilterChange(filter) {
    setIsTasksLoading(true);
    setLastVisibleDoc(null);
    setTaskData([]);
    getTasks(
      companyID,
      isAdmin,
      usrEmail,
      filter,
      taskData,
      setTaskData,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      null,
      setLastVisibleDoc
    ).finally(() => {
      setIsTasksLoading(false);
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
            <AddTaskIcon
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
              Add a Task
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
            <Grid item xs={12} md={7}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Task Name"
                  variant="outlined"
                  name="task_name"
                  size="small"
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={task.name || ""}
                  onChange={(e) => setTask({ ...task, name: e.target.value })}
                  sx={{
                    width: "80%",
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
            <Grid item xs={12} md={4}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <FormControl
                  fullWidth
                  size="small"
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
                >
                  <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                    Priority
                  </InputLabel>
                  <Select
                    value={task.priority || "Low"}
                    label="priority"
                    onChange={(e) => {
                      setTask({ ...task, priority: e.target.value });
                    }}
                    sx={{ fontFamily: "'Open Sans', Arial" }}
                  >
                    <MenuItem value={"Low"}>Low</MenuItem>
                    <MenuItem value={"Medium"}>Medium</MenuItem>
                    <MenuItem value={"High"}>High</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton width={320} height={"40px"} variant="rounded" />
              ) : (
                <Autocomplete
                  options={employeesWithEmail}
                  value={task.assignee || null}
                  onChange={(event, newValue) => {
                    setTask({ ...task, assignee: newValue });
                  }}
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
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Assignee" />
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
                      task.startDate
                        ? dayjs(task.startDate, "DD-MM-YYYY")
                        : dayjs()
                    }
                    format="DD-MM-YYYY"
                    label="Start Date"
                    slotProps={{ textField: { size: "small" } }}
                    onChange={(value) =>
                      setTask({
                        ...task,
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
                          borderColor: "#7da0fa",
                          backgroundColor: "#7da0fa10",
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
                  <DatePicker
                    value={
                      task.endDate
                        ? dayjs(task.endDate, "DD-MM-YYYY")
                        : dayjs().add(7, "day")
                    }
                    format="DD-MM-YYYY"
                    label="End Date"
                    slotProps={{ textField: { size: "small" } }}
                    onChange={(value) =>
                      setTask({
                        ...task,
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
            <Grid item xs={12}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Task Information"
                  variant="outlined"
                  size="small"
                  name="description"
                  multiline
                  maxRows={5}
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
                  value={task.info || ""}
                  onChange={(e) => setTask({ ...task, info: e.target.value })}
                  sx={{
                    width: "80%",
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
          borderRadius: "12px",
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
            paddingTop: "10px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <AssignmentIcon
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
              All Tasks
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
              onClick={() => {
                setTasksFilter("All");
                handleFilterChange("All");
              }}
              style={{
                ...tasksBtnStyles,
                borderColor: "#a378ff",
                backgroundColor: tasksFilter === "All" ? "#a378ff" : "inherit",
                color: tasksFilter === "All" ? "#fff" : "#000",
              }}
            >
              All
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => {
                setTasksFilter("Low");
                handleFilterChange("Low");
              }}
              style={{
                ...tasksBtnStyles,
                borderColor: "#74b581",
                backgroundColor: tasksFilter === "Low" ? "#74b581" : "inherit",
                color: tasksFilter === "Low" ? "#fff" : "#000",
              }}
            >
              Low
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => {
                setTasksFilter("Medium");
                handleFilterChange("Medium");
              }}
              style={{
                ...tasksBtnStyles,
                borderColor: "#7da0fa",
                backgroundColor:
                  tasksFilter === "Medium" ? "#7da0fa" : "inherit",
                color: tasksFilter === "Medium" ? "#fff" : "#000",
              }}
            >
              Medium
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={isPageLoading}
              onClick={() => {
                setTasksFilter("High");
                handleFilterChange("High");
              }}
              style={{
                ...tasksBtnStyles,
                borderColor: "#f3887c",
                backgroundColor: tasksFilter === "High" ? "#f3887c" : "inherit",
                color: tasksFilter === "High" ? "#fff" : "#000",
              }}
            >
              High
            </Button>
          </div>
        </div>
        {isPageLoading || isTasksLoading ? (
          <Skeleton
            width={isMobile ? "88vw" : isTablet ? "62vw" : "78vw"}
            height={"20vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
            }}
          />
        ) : taskData.length === 0 ? (
          <Typography
            color="#a9a9a9"
            textAlign={"center"}
            marginTop={8}
            paddingBottom={4}
          >
            <i>No Tasks Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Name</TableCell>
                  <TableCell style={tableHeaderStyles}>Priority</TableCell>
                  <TableCell style={tableHeaderStyles}>Assignee</TableCell>
                  <TableCell style={tableHeaderStyles}>Start Date</TableCell>
                  <TableCell style={tableHeaderStyles}>End Date</TableCell>
                  <TableCell style={tableHeaderStyles}>Information</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {taskData.map((task) => (
                  <TableRow key={task.name}>
                    <TableCell style={tableBodyStyles}>{task.name}</TableCell>
                    <TableCell style={tableBodyStyles}>
                      <div
                        style={{
                          backgroundColor:
                            task.priority === "High"
                              ? "#f3887c"
                              : task.priority === "Medium"
                              ? "#7da0fa"
                              : "#74b581",
                          color: "#fff",
                          position: "relative",
                          borderRadius: "14px",
                          padding: "1px 2px 1px 2px",
                        }}
                      >
                        {task.priority}
                      </div>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {task.assignee}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {task.startDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {task.endDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <i>{task.info}</i>
                    </TableCell>
                    {isAdmin && (
                      <TableCell style={tableBodyStyles}>
                        <DeleteIcon
                          onClick={() => {
                            setDialogBoxOpen(true);
                            setSelectedTaskToDelete(task);
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
        {taskData.length === 0 ? null : isPaginationLoading ? (
          <CircularProgress size="1.2rem" sx={{ color: "#a378ff" }} />
        ) : (
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "0.8rem",
              fontStyle: "italic",
              color: "#a378ff",
              cursor: "pointer",
            }}
            onClick={() => {
              setIsPaginationLoading(true);
              getTasks(
                companyID,
                isAdmin,
                usrEmail,
                tasksFilter,
                taskData,
                setTaskData,
                setSnackbarOpen,
                setSnackbarMessage,
                setSnackbarSeverity,
                lastVisibleDoc,
                setLastVisibleDoc
              ).finally(() => {
                setIsPaginationLoading(false);
              });
            }}
          >
            Load More...
          </Typography>
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
            <Box>Delete Task?</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this task?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogBoxOpen(false)}>No</Button>
          <Button sx={{ color: "#ed4337" }} onClick={handleTaskDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Tasks;
