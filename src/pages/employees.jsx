import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Checkbox,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import EditIcon from "@mui/icons-material/Edit";
import { useNavigate } from "react-router-dom";
import { firebaseDb } from "../firebase/baseConfig";
import { doc, getDoc, updateDoc, setDoc, Timestamp } from "firebase/firestore";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const tableContainerStyles = {
  borderRadius: "20px",
  width: isMobile ? "96vw" : isTablet ? "66vw" : "80vw",
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
  cursor: "pointer",
  textAlign: "center",
  fontFamily: "'Open Sans', sans-serif",

  "&:hover": {
    backgroundColor: "#98BDFF25",
  },
};

const PERCENTAGE_PER_FIELD = 2.06;

/**
 * When the start date of an employee is edited, the same date needs to be updated in the leaves document (durEndDate, durStartDate, resetDate).
 * This function updates these dates.
 */
async function updateLeavesDates(companyID, employeeEmail, editedDate) {
  return new Promise(async (resolve, reject) => {
    const usersLeaveDocRef = doc(
      firebaseDb,
      `companies/${companyID}/leaves/${employeeEmail}`
    );
    const oneYearFromEditedDate = dayjs(editedDate, "DD-MM-YYYY")
      .add(1, "year")
      .format("DD-MM-YYYY");
    const oneYearFromEditedDateTimestamp = Timestamp.fromDate(
      dayjs(editedDate, "DD-MM-YYYY").add(1, "year").toDate()
    );

    try {
      await updateDoc(usersLeaveDocRef, {
        durEndDate: oneYearFromEditedDate,
        durStartDate: editedDate,
        resetDate: oneYearFromEditedDateTimestamp,
      });
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function addNewEmployee(
  employeeEmail,
  companyID,
  companyName,
  employeeData,
  employeeBrief,
  leavesAllowedData
) {
  return new Promise(async (resolve, reject) => {
    const usersDocRef = doc(firebaseDb, `users/${employeeEmail}`);
    // Check if a docID with the email already exists
    try {
      await getDoc(usersDocRef);
    } catch (err) {
      /*If permison denied, user already exists*/
      if (err.code === "permission-denied") {
        reject("EMAIL_ALREADY_EXIST");
      } else {
        console.error("Error checking email: ", err);
        reject("Error");
      }
      return;
    }

    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const employeeDocRef = doc(
      firebaseDb,
      `companies/${companyID}/employees/${employeeEmail}`
    );
    const leavesDocRef = doc(
      firebaseDb,
      `companies/${companyID}/leaves/${employeeEmail}`
    );
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
    try {
      // Update employees_brief on company document
      await updateDoc(companyDocRef, employeeBrief);
      // Create employee document
      await setDoc(employeeDocRef, employeeData);
      // Create leaves document
      await setDoc(leavesDocRef, {
        name: `${employeeData.name} (${employeeData.email})`,
        durStartDate: formattedDate,
        durEndDate: formattedDateOneYear,
        annualLeavesBalance: leavesAllowedData.annualLeavesAllowed,
        sickLeavesBalance: leavesAllowedData.sickLeavesAllowed,
        resetDate: Timestamp.fromDate(oneYearFromNow),
      });
      // Create user document
      const userDocDetail = {
        companyID: companyID,
        companyName: companyName,
        email: employeeData.email,
        name: employeeData.name,
        position: employeeData.position,
      };
      await setDoc(usersDocRef, userDocDetail);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

function updateEmployee(
  employeeEmail,
  companyID,
  changedData,
  empBriefToUpdate
) {
  return new Promise(async (resolve, reject) => {
    const usersDocRef = doc(firebaseDb, `users/${employeeEmail}`);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const employeeDocRef = doc(
      firebaseDb,
      `companies/${companyID}/employees`,
      employeeEmail
    );
    const fieldsToUpdate = Object.keys(changedData);
    try {
      if (
        fieldsToUpdate.includes("name") ||
        fieldsToUpdate.includes("position")
      ) {
        // Update user profile
        const data = {
          ...(changedData.name && { name: changedData.name }),
          ...(changedData.position && { position: changedData.position }),
        };
        await updateDoc(usersDocRef, data);
      }

      // Update employees_brief on company document
      await updateDoc(companyDocRef, empBriefToUpdate);

      // Update employee document
      await updateDoc(employeeDocRef, changedData);
      resolve();
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
  setEmplyoeesData,
  setPositionData,
  setLocationData,
  setProjectData,
  setSubscription,
  setLeavesAllowedData
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const compSnap = await getDoc(companyDocRef);
    const currentDate = new Date();
    if (compSnap.exists()) {
      let employees = [];
      Object.entries(compSnap.data().employees_brief).forEach(
        ([email, employee]) => {
          let name = employee.name;
          let position = employee.position;
          let startDate = employee.startDate;
          let location = employee.location || "-";
          let isSponsored = employee.isSponsored;
          let sponsored = employee.isSponsored ? "Yes" : "No";
          let passport = "-";
          if (employee.passportExpiry) {
            const [day, month, year] = employee.passportExpiry.split("-");
            const expirationDate = new Date(`${year}-${month}-${day}`);
            const timeDifference = expirationDate - currentDate;
            const daysRemaining = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            passport = daysRemaining.toString() + " Days";
          }
          let visa = "-";
          if (employee.visaExpiry) {
            const [day, month, year] = employee.visaExpiry.split("-");
            const expirationDate = new Date(`${year}-${month}-${day}`);
            const timeDifference = expirationDate - currentDate;
            const daysRemaining = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            visa = daysRemaining.toString() + " Days";
          }
          let cos = "-";
          if (employee.cosExpiry) {
            const [day, month, year] = employee.cosExpiry.split("-");
            const expirationDate = new Date(`${year}-${month}-${day}`);
            const timeDifference = expirationDate - currentDate;
            const daysRemaining = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            cos = daysRemaining.toString() + " Days";
          }
          let rtw = "-";
          if (employee.rtwExpiry) {
            const [day, month, year] = employee.rtwExpiry.split("-");
            const expirationDate = new Date(`${year}-${month}-${day}`);
            const timeDifference = expirationDate - currentDate;
            const daysRemaining = Math.ceil(
              timeDifference / (1000 * 60 * 60 * 24)
            );
            rtw = daysRemaining.toString() + " Days";
          }
          let contactNumber = employee.contactNumber;
          let project = employee.project;
          let nationalInsuranceNumber = employee.nationalInsuranceNumber;
          let socNumber = employee.socNumber;
          let weeklyWorkingHours = employee.weeklyWorkingHours;
          let profilePercentage = employee.profilePercentage;
          employees.push({
            name: name,
            position: position,
            location: location,
            email: employee.email,
            isSponsored: isSponsored,
            sponsored: sponsored,
            passport: passport,
            visa: visa,
            cos: cos,
            rtw: rtw,
            startDate: startDate,
            contactNumber: contactNumber,
            project: project,
            nationalInsuranceNumber: nationalInsuranceNumber,
            socNumber: socNumber,
            weeklyWorkingHours: weeklyWorkingHours,
            profilePercentage: profilePercentage,
          });
        }
      );
      setEmplyoeesData(employees);
      if (compSnap.data().positions) {
        let positions = [];
        Object.entries(compSnap.data().positions).forEach(([key, position]) => {
          positions.push(position["name"]);
        });

        setPositionData(positions);
      }
      if (compSnap.data().locations) {
        let locations = [];
        Object.entries(compSnap.data().locations).forEach(([key, location]) => {
          locations.push(location["name"]);
        });
        setLocationData(locations);
      }
      if (compSnap.data().projects) {
        let projects = [];
        Object.entries(compSnap.data().projects).forEach(([key, project]) => {
          projects.push(project["name"]);
        });
        setProjectData(projects);
      }
      setSubscription(compSnap.data().subscription);
      setLeavesAllowedData(compSnap.data().leavesAllowed);
      setIsPageLoading(false);
    }
  } catch (error) {
    console.error("[DB] ", error);
    setSnackbarMessage("Something went wrong. Please try again later.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
}

const Employees = ({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
  companyName,
}) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
    }
  }, [isAdmin, navigate]);

  // Saved Company Details
  const [positionsData, setPositionData] = useState([]);
  const [locationsData, setLocationData] = useState([]);
  const [projectsData, setProjectData] = useState([]);
  const [subscription, setSubscription] = useState();
  const [leavesAllowedData, setLeavesAllowedData] = useState({});
  // Saved details of employees from DB
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [employeesData, setEmplyoeesData] = useState([]);
  useEffect(() => {
    getEmployees(
      companyID,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setIsPageLoading,
      setEmplyoeesData,
      setPositionData,
      setLocationData,
      setProjectData,
      setSubscription,
      setLeavesAllowedData
    );
  }, [companyID]);

  // Table search
  const [searchTerm, setSearchTerm] = useState({
    name: "",
    position: "",
    location: "",
    email: "",
    sponsored: "",
    passport: "",
    visa: "",
    cos: "",
    rtw: "",
    startDate: "",
  });

  const handleSearchChange = (e) => {
    setSearchTerm({ ...searchTerm, [e.target.name]: e.target.value });
  };

  const filteredEmployees = employeesData.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.name.toLowerCase()) &&
      employee.position
        .toLowerCase()
        .includes(searchTerm.position.toLowerCase()) &&
      employee.location
        .toLowerCase()
        .includes(searchTerm.location.toLowerCase()) &&
      employee.email.toLowerCase().includes(searchTerm.email.toLowerCase()) &&
      employee.sponsored
        .toLowerCase()
        .includes(searchTerm.sponsored.toLowerCase()) &&
      employee.passport
        .toLowerCase()
        .includes(searchTerm.passport.toLowerCase()) &&
      employee.visa.toLowerCase().includes(searchTerm.visa.toLowerCase()) &&
      employee.cos.toLowerCase().includes(searchTerm.cos.toLowerCase()) &&
      employee.rtw.toLowerCase().includes(searchTerm.rtw.toLowerCase()) &&
      employee.startDate
        .toLowerCase()
        .includes(searchTerm.startDate.toLowerCase())
  );

  const [isEmployeeTableLoading, setIsEmployeeTableLoading] = useState(false);

  // Add new employee
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [addEmployeeDialogType, setAddEmployeeDialogType] = useState("add");
  const [pickedEmployeeToEdit, setPickedEmployeeToEdit] = useState(null);
  const [employeeFieldData, setEmployeeFieldData] = useState({});
  function handleAddNewEmployeeDataChange() {
    const maxUsersBySubscription = {
      Basic: 6,
      Standard: 12,
      Premium: 24,
    };

    if (employeesData.length >= maxUsersBySubscription[subscription]) {
      setSnackbarOpen(true);
      setSnackbarMessage(
        "You have reached the maximum number of users for this subscription."
      );
      setSnackbarSeverity("error");
      return;
    }

    if (!employeeFieldData.startDate) {
      employeeFieldData.startDate = dayjs().format("DD-MM-YYYY");
    }
    if (!employeeFieldData.name || employeeFieldData.name.trim().length < 3) {
      setSnackbarOpen(true);
      setSnackbarMessage("Name must be at least 3 characters long.");
      setSnackbarSeverity("error");
      return;
    }
    if (/[^\w\s]/.test(employeeFieldData.name)) {
      setSnackbarOpen(true);
      setSnackbarMessage("Name cannot contain special characters.");
      setSnackbarSeverity("error");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(employeeFieldData.email)) {
      setSnackbarOpen(true);
      setSnackbarMessage("Invalid email address.");
      setSnackbarSeverity("error");
      return;
    }
    employeeFieldData.email = employeeFieldData.email.toLocaleLowerCase();
    const employeeExists = employeesData.find(
      (employee) => employee.email === employeeFieldData.email
    );
    if (employeeExists) {
      setSnackbarOpen(true);
      setSnackbarMessage("Employee with this email already exists.");
      setSnackbarSeverity("error");
      return;
    }
    if (!employeeFieldData.position) {
      setSnackbarOpen(true);
      setSnackbarMessage("Please select a position.");
      setSnackbarSeverity("error");
      return;
    }
    if (!employeeFieldData.contactNumber) {
      setSnackbarOpen(true);
      setSnackbarMessage("Contact number cannot be empty.");
      setSnackbarSeverity("error");
      return;
    }
    if (!employeeFieldData.location) {
      setSnackbarOpen(true);
      setSnackbarMessage("Please select a work location.");
      setSnackbarSeverity("error");
      return;
    }
    if (employeeFieldData.startDate === "Invalid Date") {
      setSnackbarOpen(true);
      setSnackbarMessage("Please select a valid start date.");
      setSnackbarSeverity("error");
      return;
    }
    if (!employeeFieldData.project) {
      setSnackbarOpen(true);
      setSnackbarMessage("Please select a project.");
      setSnackbarSeverity("error");
      return;
    }

    let empBrief = {};
    for (const [key, value] of Object.entries(employeeFieldData)) {
      empBrief[
        `employees_brief.${employeeFieldData.email.replace(
          /\./g,
          "(dot)"
        )}.${key}`
      ] = value;
    }
    setIsEmployeeTableLoading(true);
    // Calculate profile percentage
    let proPercentage = 0;
    if (
      employeeFieldData.isSponsored === false ||
      typeof employeeFieldData.isSponsored === "undefined"
    ) {
      // Employee is not sponsored so add default percentage for COS (13.51%)
      proPercentage =
        Object.keys(employeeFieldData).length * PERCENTAGE_PER_FIELD + 13.51;
    } else {
      proPercentage =
        Object.keys(employeeFieldData).length * PERCENTAGE_PER_FIELD;
    }

    empBrief[
      `employees_brief.${employeeFieldData.email.replace(
        /\./g,
        "(dot)"
      )}.profilePercentage`
    ] = Math.round(proPercentage);
    addNewEmployee(
      employeeFieldData.email,
      companyID,
      companyName,
      employeeFieldData,
      empBrief,
      leavesAllowedData
    )
      .then(() => {
        // The below details will not be saved in DB, setting it to "defaults" to display in the local table
        employeeFieldData.sponsored = employeeFieldData.isSponsored
          ? "Yes"
          : "No";
        employeeFieldData.passport = "-";
        employeeFieldData.visa = "-";
        employeeFieldData.cos = "-";
        employeeFieldData.rtw = "-";
        employeeFieldData.profilePercentage = Math.round(proPercentage);
        //Update the table locally
        setEmplyoeesData([...employeesData, employeeFieldData]);
        setSnackbarMessage("Employee added successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsEmployeeTableLoading(false);
      })
      .catch((error) => {
        console.error("[DB] => Add Employee: " + error);
        if (error === "EMAIL_ALREADY_EXIST") {
          setSnackbarMessage(
            "Employee email is already registered by another company."
          );
        } else {
          setSnackbarMessage("Failed to add employee.");
        }
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsEmployeeTableLoading(false);
      });
    setEmployeeFieldData({});
    setIsAddEmployeeDialogOpen(false);
  }

  // Edit employee
  function handleEditEmployeeDataChange() {
    const updatedSpecificEmployeeDetails = {};
    if (
      employeeFieldData.name &&
      employeeFieldData.name !== pickedEmployeeToEdit.name
    ) {
      updatedSpecificEmployeeDetails.name = employeeFieldData.name;
    }
    if (
      employeeFieldData.position &&
      employeeFieldData.position !== pickedEmployeeToEdit.position
    ) {
      updatedSpecificEmployeeDetails.position = employeeFieldData.position;
    }
    if (
      employeeFieldData.contactNumber &&
      employeeFieldData.contactNumber !== pickedEmployeeToEdit.contactNumber
    ) {
      updatedSpecificEmployeeDetails.contactNumber =
        employeeFieldData.contactNumber;
    }
    if (
      employeeFieldData.location &&
      employeeFieldData.location !== pickedEmployeeToEdit.location
    ) {
      updatedSpecificEmployeeDetails.location = employeeFieldData.location;
    }
    if (
      employeeFieldData.startDate &&
      employeeFieldData.startDate !== pickedEmployeeToEdit.startDate
    ) {
      updatedSpecificEmployeeDetails.startDate = employeeFieldData.startDate;
    }
    if (
      employeeFieldData.project &&
      employeeFieldData.project !== pickedEmployeeToEdit.project
    ) {
      updatedSpecificEmployeeDetails.project = employeeFieldData.project;
    }
    if (
      employeeFieldData.nationalInsuranceNumber &&
      employeeFieldData.nationalInsuranceNumber !==
        pickedEmployeeToEdit.nationalInsuranceNumber
    ) {
      updatedSpecificEmployeeDetails.nationalInsuranceNumber =
        employeeFieldData.nationalInsuranceNumber;
    }
    if (
      employeeFieldData.socNumber &&
      employeeFieldData.socNumber !== pickedEmployeeToEdit.socNumber
    ) {
      updatedSpecificEmployeeDetails.socNumber = employeeFieldData.socNumber;
    }
    if (
      employeeFieldData.weeklyWorkingHours &&
      employeeFieldData.weeklyWorkingHours !==
        pickedEmployeeToEdit.weeklyWorkingHours
    ) {
      updatedSpecificEmployeeDetails.weeklyWorkingHours =
        employeeFieldData.weeklyWorkingHours;
    }
    if (
      employeeFieldData.isSponsored !== null &&
      employeeFieldData.isSponsored !== pickedEmployeeToEdit.isSponsored
    ) {
      updatedSpecificEmployeeDetails.isSponsored =
        employeeFieldData.isSponsored;
    }
    if (Object.keys(updatedSpecificEmployeeDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }

    if (
      Object.keys(updatedSpecificEmployeeDetails).includes("startDate") &&
      updatedSpecificEmployeeDetails.startDate === "Invalid Date"
    ) {
      setSnackbarMessage("Please select a valid start date.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Prevent admin's start date from being changed
    if (
      Object.keys(updatedSpecificEmployeeDetails).includes("startDate") &&
      pickedEmployeeToEdit.position === "Administrator"
    ) {
      setSnackbarMessage("Adminstrator's start date cannot be changed.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Calculate profile percentage
    let proPercentage = pickedEmployeeToEdit.profilePercentage;
    const emptyKeysInPickedEmployeeToEdit = Object.entries(pickedEmployeeToEdit)
      .filter(([key, value]) => typeof value === "undefined")
      .map(([key]) => key);
    const newlyAddedKeysCount = emptyKeysInPickedEmployeeToEdit.filter((key) =>
      Object.keys(updatedSpecificEmployeeDetails).includes(key)
    ).length;
    if (newlyAddedKeysCount > 0) {
      proPercentage += newlyAddedKeysCount * PERCENTAGE_PER_FIELD;
    }
    if (
      typeof updatedSpecificEmployeeDetails.isSponsored !== "undefined" &&
      updatedSpecificEmployeeDetails.isSponsored !=
        pickedEmployeeToEdit.isSponsored
    ) {
      // Sponsored type changed
      if (updatedSpecificEmployeeDetails.isSponsored) {
        // Sponsored enabled, decrease profile percentage by 13.51%
        proPercentage -= 13.51;
      } else {
        // Sponsored disabled, increase profile percentage by 13.51%
        proPercentage += 13.51;
      }
    }

    let empBriefToUpdate = {};
    for (const [key, value] of Object.entries(updatedSpecificEmployeeDetails)) {
      empBriefToUpdate[
        `employees_brief.${pickedEmployeeToEdit.email.replace(
          /\./g,
          "(dot)"
        )}.${key}`
      ] = value;
    }
    empBriefToUpdate[
      `employees_brief.${pickedEmployeeToEdit.email.replace(
        /\./g,
        "(dot)"
      )}.profilePercentage`
    ] = Math.round(proPercentage);

    setIsEmployeeTableLoading(true);
    updateEmployee(
      pickedEmployeeToEdit.email,
      companyID,
      updatedSpecificEmployeeDetails,
      empBriefToUpdate
    )
      .then(() => {
        //Update the table locally
        setEmplyoeesData(
          employeesData.map((employee) => {
            if (employee.email === pickedEmployeeToEdit.email) {
              if (
                typeof updatedSpecificEmployeeDetails.isSponsored !==
                "undefined"
              ) {
                // Adding "Yes" or "No" to `sponsored` key (it is not need to be saved on DB)
                updatedSpecificEmployeeDetails.sponsored =
                  updatedSpecificEmployeeDetails.isSponsored ? "Yes" : "No";
              }
              updatedSpecificEmployeeDetails.profilePercentage =
                Math.round(proPercentage);
              return {
                ...employee,
                ...updatedSpecificEmployeeDetails,
              };
            }
            return employee;
          })
        );

        // Update leaves dates
        if (Object.keys(updatedSpecificEmployeeDetails).includes("startDate")) {
          updateLeavesDates(
            companyID,
            pickedEmployeeToEdit.email,
            updatedSpecificEmployeeDetails.startDate
          )
            .then(() => {
              setSnackbarMessage("Employee details updated.");
              setSnackbarSeverity("success");
              setSnackbarOpen(true);
              setIsEmployeeTableLoading(false);
            })
            .catch((error) => {
              console.error("[DB] => UpdateLeavesDates: " + error);
              setSnackbarMessage("Dates in Leave table could not be updated.");
              setSnackbarSeverity("error");
              setSnackbarOpen(true);
              setIsEmployeeTableLoading(false);
            });
        } else {
          setSnackbarMessage("Employee details updated.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsEmployeeTableLoading(false);
        }
      })
      .catch((error) => {
        console.error("[DB] => Update Employee: " + error);
        setSnackbarMessage("Failed to update employee details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsEmployeeTableLoading(false);
      });
    setEmployeeFieldData({});
    setIsAddEmployeeDialogOpen(false);
  }
  return (
    <div
      style={{
        overflow: "auto",
        height: isTablet ? "94%" : "92%",
        marginLeft: isTablet ? "0px" : "12px",
      }}
    >
      <div
        style={{
          marginRight: isMobile ? "8px" : isTablet ? "14px" : "20px",
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "10px",
          marginBottom: "14px",
        }}
      >
        <Button
          variant="contained"
          disabled={isPageLoading || isEmployeeTableLoading}
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
            if (
              positionsData.length === 0 ||
              locationsData.length === 0 ||
              projectsData.length === 0
            ) {
              setSnackbarMessage(
                "Please configure positions, locations and projects in the settings."
              );
              setSnackbarSeverity("warning");
              setSnackbarOpen(true);
            }
            setAddEmployeeDialogType("add");
            setIsAddEmployeeDialogOpen(true);
          }}
        >
          <PersonAddAlt1Icon
            style={{
              marginRight: "12px",
              fontSize: "24px",
            }}
          />
          Employee
        </Button>
      </div>
      {isPageLoading ? (
        <Box
          sx={{
            height: "30%",
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
      ) : (
        <TableContainer component={Paper} sx={tableContainerStyles}>
          <Table aria-label="simple table" stickyHeader>
            <TableHead>
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
                    label="Search Position"
                    variant="outlined"
                    size="small"
                    name="position"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.position}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    label="Search Location"
                    variant="outlined"
                    size="small"
                    name="location"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.location}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    label="Search Email"
                    variant="outlined"
                    size="small"
                    name="email"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.email}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="sponsored"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.sponsored}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="passport"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.passport}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="visa"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.visa}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="cos"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.cos}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="rtw"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.rtw}
                    onChange={handleSearchChange}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="startDate"
                    inputProps={{ style: { fontSize: 12 } }}
                    InputLabelProps={{ style: { fontSize: 14 } }}
                    value={searchTerm.startDate}
                    onChange={handleSearchChange}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell style={tableHeaderStyles}>Employee</TableCell>
                <TableCell style={tableHeaderStyles}>Position</TableCell>
                <TableCell style={tableHeaderStyles}>Work Location</TableCell>
                <TableCell style={tableHeaderStyles}>Email</TableCell>
                <TableCell style={tableHeaderStyles}>
                  Sponsored Employee
                </TableCell>
                <TableCell style={tableHeaderStyles}>Passport</TableCell>
                <TableCell style={tableHeaderStyles}>Visa</TableCell>
                <TableCell style={tableHeaderStyles}>COS</TableCell>
                <TableCell style={tableHeaderStyles}>RTW</TableCell>
                <TableCell style={tableHeaderStyles}>Start Date</TableCell>
                <TableCell style={tableHeaderStyles}>
                  Profile Completion
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.email}
                  sx={tableRowStyles}
                  onClick={() => {
                    if (
                      positionsData.length === 0 ||
                      locationsData.length === 0 ||
                      projectsData.length === 0
                    ) {
                      setSnackbarMessage(
                        "Please configure positions, locations and projects in the settings."
                      );
                      setSnackbarSeverity("warning");
                      setSnackbarOpen(true);
                      return;
                    }
                    if (!isEmployeeTableLoading) {
                      setPickedEmployeeToEdit(employee);
                      setEmployeeFieldData(employee);
                      setAddEmployeeDialogType("edit");
                      setIsAddEmployeeDialogOpen(true);
                    }
                  }}
                >
                  <TableCell style={tableBodyStyles}>
                    <Box display="flex" alignItems="center">
                      <Avatar
                        style={{
                          backgroundColor: "#f4a322",
                          height: "2.2rem",
                          width: "2.2rem",
                        }}
                      >
                        {employee.name.charAt(0)}
                      </Avatar>
                      <Box ml={2}>
                        <Typography
                          style={{
                            fontWeight: "500",
                            fontSize: "0.9rem",
                          }}
                        >
                          {employee.name.split(" ")[0]}
                        </Typography>
                        <Typography variant="body2">
                          {employee.name.split(" ")[1]}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell style={tableBodyStyles}>
                    {employee.position}
                  </TableCell>
                  <TableCell style={tableBodyStyles}>
                    {employee.location}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    <i>{employee.email}</i>
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    <div
                      style={{
                        backgroundColor:
                          employee.sponsored === "Yes" ? "#74b581" : "#f3887c",
                        color: "#fff",
                        fontWeight: "500",
                        position: "relative",
                        width: "38px",
                        height: "20px",
                        left: "50%",
                        transform: "translate(-50%)",
                        borderRadius: "10px",
                      }}
                    >
                      {employee.sponsored}
                    </div>
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    {employee.passport}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    {employee.visa}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    {employee.cos}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    {employee.rtw}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    {employee.startDate}
                  </TableCell>
                  <TableCell
                    style={{ ...tableBodyStyles, textAlign: "center" }}
                  >
                    <Box sx={{ position: "relative", display: "inline-flex" }}>
                      <CircularProgress
                        variant="determinate"
                        value={
                          employee.profilePercentage > 100
                            ? 100
                            : employee.profilePercentage
                        }
                        sx={{
                          color:
                            employee.profilePercentage < 25
                              ? "#f3887c"
                              : employee.profilePercentage < 50
                              ? "#ffc107"
                              : employee.profilePercentage < 75
                              ? "#74b581"
                              : "#219653",
                        }}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: "absolute",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="caption" component="div">
                          {employee.profilePercentage > 100
                            ? 100
                            : employee.profilePercentage}
                          %
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Add New Employee Dialog Box */}
      <Dialog
        open={isAddEmployeeDialogOpen}
        onClose={() => {
          setIsAddEmployeeDialogOpen(false);
          setEmployeeFieldData({});
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="md"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "20px",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title">
          <Box display="flex" alignItems="center">
            {addEmployeeDialogType == "add" ? (
              <PersonAddAlt1Icon
                sx={{
                  color: "#f4a322",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            ) : (
              <EditIcon
                sx={{
                  color: "#f4a322",
                  marginRight: "10px",
                  paddingBottom: "3px",
                }}
              />
            )}
            <Box>
              {addEmployeeDialogType == "add"
                ? "Add New Employee"
                : "Edit Employee"}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid
            container
            style={{
              marginTop: "10px",
              width: "100%",
            }}
            spacing={2}
          >
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                id="EmployeeName"
                label="Employee Name"
                variant="outlined"
                size="small"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.name || ""}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
                    backgroundColor: "#74b58110",
                  },
                }}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    name: e.target.value,
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                id="WorkEmail"
                label="Work Email"
                variant="outlined"
                size="small"
                disabled={addEmployeeDialogType == "edit"}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.email || ""}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                    backgroundColor: "#4b49ac10",
                  },
                }}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    email: e.target.value,
                  });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl
                fullWidth
                size="small"
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#4b49ac10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                  },
                }}
              >
                <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                  Position
                </InputLabel>
                <Select
                  disabled={employeeFieldData.position === "Administrator"}
                  label="Position"
                  value={employeeFieldData.position || ""}
                  onChange={(e) => {
                    setEmployeeFieldData({
                      ...employeeFieldData,
                      position: e.target.value,
                    });
                  }}
                  sx={{ fontFamily: "'Open Sans', Arial" }}
                >
                  {positionsData.map((position) => (
                    <MenuItem
                      value={position}
                      key={position}
                      disabled={position === "Administrator"}
                    >
                      {position}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                label="Contact Number"
                variant="outlined"
                size="small"
                name="contactNumber"
                type="number"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.contactNumber || ""}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    contactNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "100%",
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
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl
                fullWidth
                size="small"
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
              >
                <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                  Work Location
                </InputLabel>
                <Select
                  label="Work Location"
                  value={
                    employeeFieldData.location === "-"
                      ? ""
                      : employeeFieldData.location || ""
                  }
                  onChange={(e) => {
                    setEmployeeFieldData({
                      ...employeeFieldData,
                      location: e.target.value,
                    });
                  }}
                  sx={{ fontFamily: "'Open Sans', Arial" }}
                >
                  {locationsData.map((location) => (
                    <MenuItem value={location} key={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  defaultValue={
                    employeeFieldData.startDate
                      ? dayjs(employeeFieldData.startDate, "DD-MM-YYYY")
                      : dayjs()
                  }
                  format="DD-MM-YYYY"
                  label="Start Date"
                  slotProps={{ textField: { size: "small" } }}
                  onChange={(value) => {
                    setEmployeeFieldData({
                      ...employeeFieldData,
                      startDate: dayjs(value).format("DD-MM-YYYY"),
                    });
                  }}
                  sx={{
                    width: "100%",
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
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl
                fullWidth
                size="small"
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#4b49ac10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#4b49ac",
                  },
                }}
              >
                <InputLabel sx={{ fontFamily: "'Open Sans', Arial" }}>
                  Project
                </InputLabel>
                <Select
                  label="Project"
                  value={employeeFieldData.project || ""}
                  onChange={(e) => {
                    setEmployeeFieldData({
                      ...employeeFieldData,
                      project: e.target.value,
                    });
                  }}
                  sx={{ fontFamily: "'Open Sans', Arial" }}
                >
                  {projectsData.map((project) => (
                    <MenuItem value={project} key={project}>
                      {project}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                label="National Insurance Number"
                variant="outlined"
                size="small"
                name="nationalInsuranceNumber"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.nationalInsuranceNumber || ""}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    nationalInsuranceNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "100%",
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
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                label="SOC Number"
                variant="outlined"
                size="small"
                name="socNumber"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.socNumber || ""}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    socNumber: e.target.value,
                  });
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#Ffc85d10",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                label="Weekly Working Hours"
                variant="outlined"
                size="small"
                name="weeklyWorkingHours"
                type="number"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial" },
                }}
                value={employeeFieldData.weeklyWorkingHours || ""}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    weeklyWorkingHours: e.target.value,
                  });
                }}
                sx={{
                  width: "100%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    backgroundColor: "#74b58110",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#74b581",
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
            <Grid
              item
              xs={12}
              md={6}
              lg={4}
              sx={{
                display: "flex",
                justifyContent: "felx-end",
                alignItems: "center",
                paddingLeft: "10vw",
              }}
            >
              <Checkbox
                sx={{
                  color: "#74b581",
                  "&.Mui-checked": {
                    color: "#74b581",
                  },
                }}
                onChange={(e) => {
                  setEmployeeFieldData({
                    ...employeeFieldData,
                    isSponsored: e.target.checked,
                  });
                }}
                inputProps={{ "aria-label": "primary checkbox" }}
                checked={employeeFieldData.isSponsored ?? false}
              />
              <Typography
                variant="p"
                style={{ fontFamily: "'Roboto', sans-serif" }}
              >
                Sponsored Employee
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
          <div>
            {addEmployeeDialogType === "edit" && (
              <Button
                variant="outlined"
                sx={{
                  color: "#f4a322",
                  borderRadius: "12px",
                  borderColor: "#f4a322",
                  textTransform: "none",
                }}
                onClick={() => {
                  navigate(`/profile?email=${pickedEmployeeToEdit.email}`);
                }}
              >
                View Full Profile
              </Button>
            )}
          </div>
          <div>
            <Button
              onClick={() => {
                setIsAddEmployeeDialogOpen(false);
                setEmployeeFieldData({});
              }}
            >
              Close
            </Button>
            <Button
              sx={{
                color: "#74b581",
              }}
              onClick={() => {
                if (addEmployeeDialogType === "add") {
                  handleAddNewEmployeeDataChange();
                } else if (addEmployeeDialogType === "edit") {
                  handleEditEmployeeDataChange();
                }
              }}
            >
              {addEmployeeDialogType === "add" ? "Add Employee" : "Update"}
            </Button>
          </div>
        </DialogActions>
      </Dialog>
      {/* End of Add New Employee Dialog Box */}
    </div>
  );
};

export default Employees;
