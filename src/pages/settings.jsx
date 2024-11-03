import React, { useState, useEffect } from "react";

import {
  Box,
  Grid,
  Typography,
  TextField,
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
import BusinessIcon from "@mui/icons-material/Business";
import SaveIcon from "@mui/icons-material/Save";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import BadgeIcon from "@mui/icons-material/Badge";
import WarningIcon from "@mui/icons-material/Warning";
import Tooltip from "@mui/material/Tooltip";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import { useNavigate } from "react-router-dom";
import { firebaseDb } from "../firebase/baseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  collection,
} from "firebase/firestore";

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
  textAlign: "center",
};

/**
 * When Admin changes the number of leaves allowed, this func updates the leaves reamining for each employee
 */
async function updateLeaveBalances(diffAnnual, diffSick, resetDate, companyID) {
  return new Promise((resolve, reject) => {
    const allEmpLeaves = getDocs(
      collection(firebaseDb, "companies", companyID, "leaves")
    );
    allEmpLeaves
      .then((querySnapshot) => {
        const promises = [];
        querySnapshot.docs.forEach((leave) => {
          const leaveData = leave.data();
          const leaveDocRef = doc(
            firebaseDb,
            "companies",
            companyID,
            "leaves",
            leave.id
          );
          const updateData = {
            annualLeavesBalance: leaveData.annualLeavesBalance + diffAnnual,
            sickLeavesBalance: leaveData.sickLeavesBalance + diffSick,
          };

          if (resetDate != "") {
            updateData.resetDate = resetDate;
          }

          promises.push(updateDoc(leaveDocRef, updateData));
        });
        return Promise.all(promises);
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function updateDetails(changedData, companyID) {
  return new Promise((resolve, reject) => {
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    updateDoc(companyDocRef, changedData)
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

async function getCompanyDetails(
  companyID,
  setIsPageLoading,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setSavedCompanyDetails,
  setPositionData,
  setLocationData,
  setProjectData,
  setLeavesAllowedData
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const compSnap = await getDoc(companyDocRef);
    if (compSnap.exists()) {
      setSavedCompanyDetails({
        companyName: compSnap.data().companyName
          ? compSnap.data().companyName
          : null,
        companyEmail: compSnap.data().companyEmail
          ? compSnap.data().companyEmail
          : null,
        companyPhone: compSnap.data().companyPhone
          ? compSnap.data().companyPhone
          : null,
        companyAddress: compSnap.data().companyAddress
          ? compSnap.data().companyAddress
          : null,
        companyAddress2: compSnap.data().companyAddress2
          ? compSnap.data().companyAddress2
          : null,
        companyCity: compSnap.data().companyCity
          ? compSnap.data().companyCity
          : null,
        companyCountry: compSnap.data().companyCountry
          ? compSnap.data().companyCountry
          : null,
        companyState: compSnap.data().companyState
          ? compSnap.data().companyState
          : null,
        companyPostcode: compSnap.data().companyPostcode
          ? compSnap.data().companyPostcode
          : null,
      });
      compSnap.data().positions && setPositionData(compSnap.data().positions);
      compSnap.data().locations && setLocationData(compSnap.data().locations);
      compSnap.data().projects && setProjectData(compSnap.data().projects);
      compSnap.data().leavesAllowed &&
        setLeavesAllowedData(compSnap.data().leavesAllowed);
      setIsPageLoading(false);
    } else {
      setSnackbarMessage("Company details not found.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  } catch (e) {
    console.error("[DB] ", e);
    setSnackbarMessage("Something went wrong. Please try again later.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
}

function Settings({
  isAdmin,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  companyID,
}) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
    }
  }, [isAdmin, navigate]);

  // Saved details of company from DB
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [savedCompanyDetails, setSavedCompanyDetails] = useState({});
  const [positionData, setPositionData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [leavesAllowedData, setLeavesAllowedData] = useState({});
  useEffect(() => {
    getCompanyDetails(
      companyID,
      setIsPageLoading,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSavedCompanyDetails,
      setPositionData,
      setLocationData,
      setProjectData,
      setLeavesAllowedData
    );
  }, [companyID]);

  // Handle company save clicks
  const [companyDetails, setCompanyDetails] = useState({});
  useEffect(() => {
    setCompanyDetails({ ...savedCompanyDetails });
  }, [savedCompanyDetails]);
  const [isSaveLoading, setIsSaveLoading] = useState(false);

  function handleCompanyDetailsSave() {
    const updatedDetails = {};
    if (companyDetails.companyEmail !== savedCompanyDetails.companyEmail) {
      updatedDetails.companyEmail = companyDetails.companyEmail;
    }
    if (companyDetails.companyPhone !== savedCompanyDetails.companyPhone) {
      updatedDetails.companyPhone = companyDetails.companyPhone;
    }
    if (companyDetails.companyAddress !== savedCompanyDetails.companyAddress) {
      updatedDetails.companyAddress = companyDetails.companyAddress;
    }
    if (
      companyDetails.companyAddress2 !== savedCompanyDetails.companyAddress2
    ) {
      updatedDetails.companyAddress2 = companyDetails.companyAddress2;
    }
    if (companyDetails.companyCity !== savedCompanyDetails.companyCity) {
      updatedDetails.companyCity = companyDetails.companyCity;
    }
    if (companyDetails.companyCountry !== savedCompanyDetails.companyCountry) {
      updatedDetails.companyCountry = companyDetails.companyCountry;
    }
    if (companyDetails.companyState !== savedCompanyDetails.companyState) {
      updatedDetails.companyState = companyDetails.companyState;
    }
    if (
      companyDetails.companyPostcode !== savedCompanyDetails.companyPostcode
    ) {
      updatedDetails.companyPostcode = companyDetails.companyPostcode;
    }
    if (Object.keys(updatedDetails).length === 0) {
      setSnackbarMessage("No changes were made.");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    setIsSaveLoading(true);
    updateDetails(updatedDetails, companyID)
      .then(() => {
        setSavedCompanyDetails({ ...savedCompanyDetails, ...updatedDetails });
        setSnackbarMessage("Company details saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsSaveLoading(false);
      })
      .catch((error) => {
        setSavedCompanyDetails({ ...savedCompanyDetails });
        console.error("[DB] => Company Details Update: " + error);
        setSnackbarMessage("Failed to save company details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsSaveLoading(false);
      });
  }

  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);
  const [isPositionsLoading, setIsPositionsLoading] = useState(false);

  // Delete Dialog Box
  const [deleteDialogBoxOpen, setDeleteDialogBoxOpen] = useState(false);
  const [deleteDialogBoxTitle, setDeleteDialogBoxTitle] = useState("");
  const [deleteDialogBoxContent, setDeleteDialogBoxContent] = useState("");
  const [pickedItemToDelete, setPickedItemToDelete] = useState(null);

  function handleDeleteClick() {
    setDeleteDialogBoxOpen(false);
    if (deleteDialogBoxTitle === "Delete Project?") {
      let objectToUpdate = { projects: arrayRemove(pickedItemToDelete) };
      setIsProjectsLoading(true);
      updateDetails(objectToUpdate, companyID)
        .then(() => {
          setProjectData(
            projectData.filter((project) => project !== pickedItemToDelete)
          );
          setSnackbarMessage("Project deleted successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsProjectsLoading(false);
        })
        .catch((error) => {
          console.error("[DB] => Project Delete: " + error);
          setSnackbarMessage("Failed to delete project.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsProjectsLoading(false);
        });
      objectToUpdate = {};
    }
    if (deleteDialogBoxTitle === "Delete Location?") {
      let objectToUpdate = { locations: arrayRemove(pickedItemToDelete) };
      setIsLocationsLoading(true);
      updateDetails(objectToUpdate, companyID)
        .then(() => {
          setLocationData(
            locationData.filter((location) => location !== pickedItemToDelete)
          );
          setSnackbarMessage("Location deleted successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsLocationsLoading(false);
        })
        .catch((error) => {
          console.error("[DB] => Location Delete: " + error);
          setSnackbarMessage("Failed to delete location.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsLocationsLoading(false);
        });
      objectToUpdate = {};
    }
    if (deleteDialogBoxTitle === "Delete Position?") {
      let objectToUpdate = { positions: arrayRemove(pickedItemToDelete) };
      setIsPositionsLoading(true);
      updateDetails(objectToUpdate, companyID)
        .then(() => {
          setPositionData(
            positionData.filter((position) => position !== pickedItemToDelete)
          );
          setSnackbarMessage("Position deleted successfully.");
          setSnackbarSeverity("success");
          setSnackbarOpen(true);
          setIsPositionsLoading(false);
        })
        .catch((error) => {
          console.error("[DB] => Position Delete: " + error);
          setSnackbarMessage("Failed to delete position.");
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          setIsPositionsLoading(false);
        });
      objectToUpdate = {};
    }
  }

  //Add New Project Dialog
  const [addNewProjectDialogBoxOpen, setAddNewProjectDialogBoxOpen] =
    useState(false);
  const [newProject, setNewProject] = useState({});

  function handleAddNewProject() {
    if (!newProject.name) {
      setSnackbarMessage("Please enter project name");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const projectExists = projectData.find(
      (project) => project.name === newProject.name
    );
    if (projectExists) {
      setSnackbarMessage(
        "Project already exists! Please choose a different name."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (newProject.startDate) {
      if (!newProject.startDate.isValid()) {
        setSnackbarMessage("Please select a valid start date");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    } else {
      newProject.startDate = dayjs();
    }
    if (newProject.endDate) {
      if (!newProject.endDate.isValid()) {
        setSnackbarMessage("Please select a valid end date");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }
    } else {
      newProject.endDate = dayjs().add(1, "month");
    }
    newProject.startDate = newProject.startDate.format("DD-MM-YYYY");
    newProject.endDate = newProject.endDate.format("DD-MM-YYYY");
    let objectToUpdate = { projects: arrayUnion(newProject) };
    setIsProjectsLoading(true);
    updateDetails(objectToUpdate, companyID)
      .then(() => {
        setProjectData([...projectData, newProject]);
        setSnackbarMessage("Project details saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsProjectsLoading(false);
      })
      .catch((error) => {
        console.error("[DB] => Project Details Update: " + error);
        setSnackbarMessage("Failed to save project details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsProjectsLoading(false);
      });
    setNewProject({});
    setAddNewProjectDialogBoxOpen(false);
  }

  //Add New Location Dialog
  const [addNewLocationDialogBoxOpen, setAddNewLocationDialogBoxOpen] =
    useState(false);
  const [newLocation, setNewLocation] = useState({});

  function handleAddNewLocation() {
    if (!newLocation.name) {
      setSnackbarMessage("Please enter location name");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const locationExists = locationData.find(
      (location) => location.name === newLocation.name
    );
    if (locationExists) {
      setSnackbarMessage(
        "Location already exists! Please choose a different name."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!newLocation.desc) {
      setSnackbarMessage("Please enter location description");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let objectToUpdate = { locations: arrayUnion(newLocation) };
    setIsLocationsLoading(true);
    updateDetails(objectToUpdate, companyID)
      .then(() => {
        setLocationData([...locationData, newLocation]);
        setSnackbarMessage("Location details saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsLocationsLoading(false);
      })
      .catch((error) => {
        console.error("[DB] => Location Details Update: " + error);
        setSnackbarMessage("Failed to save location details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsLocationsLoading(false);
      });
    setNewLocation({});
    setAddNewLocationDialogBoxOpen(false);
  }

  //Add New position Dialog
  const [addNewPositionDialogBoxOpen, setAddNewPositionDialogBoxOpen] =
    useState(false);
  const [newPosition, setNewPosition] = useState({});

  function handleAddNewPosition() {
    if (!newPosition.name) {
      setSnackbarMessage("Please enter position name");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    const positionExists = positionData.find(
      (position) => position.name === newPosition.name
    );
    if (positionExists) {
      setSnackbarMessage(
        "Position already exists! Please choose a different name."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (!newPosition.desc) {
      setSnackbarMessage("Please enter position description");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    let objectToUpdate = { positions: arrayUnion(newPosition) };
    setIsPositionsLoading(true);
    updateDetails(objectToUpdate, companyID)
      .then(() => {
        setPositionData([...positionData, newPosition]);
        setSnackbarMessage("Position details saved successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsPositionsLoading(false);
      })
      .catch((error) => {
        console.error("[DB] => Position Details Update: " + error);
        setSnackbarMessage("Failed to save position details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsPositionsLoading(false);
      });
    setNewPosition({});
    setAddNewPositionDialogBoxOpen(false);
  }

  // Leaves Allowed
  const [newLeavesAllowedData, setNewLeavesAllowedData] = useState({});
  const [newLeaveYear, setNewLeaveYear] = useState();
  const [openChangeLeaveYearDialog, setOpenChangeLeaveYearDialog] =
    useState(false);
  const [isLeavesAllowedSaveLoading, setIsLeavesAllowedSaveLoading] =
    useState(false);
  function handleLeavesAllowedChange(isYearChanged) {
    if (
      !newLeavesAllowedData.annualLeavesAllowed &&
      !newLeavesAllowedData.sickLeavesAllowed &&
      !isYearChanged
    ) {
      setSnackbarMessage("No changes were made!");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }
    if (
      newLeavesAllowedData.annualLeavesAllowed < 1 ||
      newLeavesAllowedData.sickLeavesAllowed < 1
    ) {
      setSnackbarMessage("Allowed leaves can't be less than 1");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    if (isYearChanged) {
      newLeavesAllowedData.leaveYear = dayjs(newLeaveYear).format("DD-MM-YYYY");
      // Year is changed but leaves allowed are not changed, so set the previous values from DB
      if (!newLeavesAllowedData.annualLeavesAllowed) {
        newLeavesAllowedData.annualLeavesAllowed =
          leavesAllowedData.annualLeavesAllowed;
      }
      if (!newLeavesAllowedData.sickLeavesAllowed) {
        newLeavesAllowedData.sickLeavesAllowed =
          leavesAllowedData.sickLeavesAllowed;
      }
    } else {
      // Year is not changed, so set the previous values from DB
      newLeavesAllowedData.leaveYear = leavesAllowedData.leaveYear;
    }
    setIsLeavesAllowedSaveLoading(true);
    const objectToUpdate = { leavesAllowed: newLeavesAllowedData };
    updateDetails(objectToUpdate, companyID)
      .then(() => {
        const diffAnnual =
          newLeavesAllowedData.annualLeavesAllowed -
          leavesAllowedData.annualLeavesAllowed;
        const diffSick =
          newLeavesAllowedData.sickLeavesAllowed -
          leavesAllowedData.sickLeavesAllowed;

        // Change reset date of leaves
        var resetDate = "";
        if (isYearChanged) {
          resetDate = dayjs(newLeavesAllowedData.leaveYear, "DD-MM-YYYY")
            .add(1, "year")
            .set("hour", 0)
            .set("minute", 0)
            .set("second", 0)
            .set("millisecond", 0)
            .toDate();
        }
        updateLeaveBalances(diffAnnual, diffSick, resetDate, companyID)
          .then(() => {
            setSnackbarMessage("Leave allowance saved successfully.");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
            setIsLeavesAllowedSaveLoading(false);

            // Presist to local var
            setLeavesAllowedData(newLeavesAllowedData);
          })
          .catch((error) => {
            console.error("[DB] => updateLeaveBalances: " + error);
            setSnackbarMessage(
              "Failed to update remaining leave of employees."
            );
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setIsLeavesAllowedSaveLoading(false);
          });
      })
      .catch((error) => {
        console.error("[DB] => Leave Allowance Update: " + error);
        setSnackbarMessage("Failed to save leave details.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsLeavesAllowedSaveLoading(false);
      });
    setNewLeavesAllowedData({});
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
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "20px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div style={{ display: "flex", paddingTop: "10px" }}>
          <BusinessIcon
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
            Company
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Company Name"
                variant="outlined"
                name="company_name"
                size="small"
                value={savedCompanyDetails.companyName || ""}
                disabled
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <Tooltip
                title="All admin-related notifications will be sent to this email."
                arrow
              >
                <TextField
                  label="Company Email"
                  variant="outlined"
                  name="email"
                  size="small"
                  value={companyDetails.companyEmail || ""}
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial", shrink: true },
                  }}
                  onChange={(e) =>
                    setCompanyDetails({
                      ...companyDetails,
                      companyEmail: e.target.value,
                    })
                  }
                  sx={{
                    width: "80%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "14px",
                    },
                    "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline":
                      {
                        border: "2px solid",
                        borderColor: "#74b581",
                      },
                  }}
                />
              </Tooltip>
            )}
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            {isPageLoading ? (
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Contact Number"
                variant="outlined"
                name="phone"
                size="small"
                value={companyDetails.companyPhone || ""}
                type="tel"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyPhone: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Address 1"
                variant="outlined"
                name="address_1"
                size="small"
                value={companyDetails.companyAddress || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyAddress: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Address 2"
                variant="outlined"
                name="address_2"
                size="small"
                value={companyDetails.companyAddress2 || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyAddress2: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="City"
                variant="outlined"
                name="city"
                size="small"
                value={companyDetails.companyCity || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyCity: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#f3887c",
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
                label="Country"
                variant="outlined"
                name="country"
                size="small"
                value={companyDetails.companyCountry || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyCountry: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="State/Province"
                variant="outlined"
                name="state"
                size="small"
                value={companyDetails.companyState || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyState: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
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
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Zip Code"
                variant="outlined"
                name="zip"
                size="small"
                value={companyDetails.companyPostcode || ""}
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                onChange={(e) =>
                  setCompanyDetails({
                    ...companyDetails,
                    companyPostcode: e.target.value,
                  })
                }
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#7da0fa",
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
            onClick={handleCompanyDetailsSave}
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
            <AccountTreeIcon
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
              Projects/Works
            </Typography>
          </div>
          <Button
            variant="contained"
            disabled={isPageLoading || isProjectsLoading}
            onClick={() => setAddNewProjectDialogBoxOpen(true)}
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
            Project
          </Button>
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
        ) : projectData.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4}>
            <i>No Projects/Works Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Project Name</TableCell>
                  <TableCell style={tableHeaderStyles}>Project Code</TableCell>
                  <TableCell style={tableHeaderStyles}>Start Date</TableCell>
                  <TableCell style={tableHeaderStyles}>End Date</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Project Information
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectData.map((project) => (
                  <TableRow key={project.name}>
                    <TableCell style={tableBodyStyles}>
                      {project.name}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {project.code}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {project.startDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {project.endDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <i>{project.info}</i>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <DeleteIcon
                        disabled
                        onClick={() => {
                          if (!isProjectsLoading) {
                            setDeleteDialogBoxOpen(true);
                            setDeleteDialogBoxTitle("Delete Project?");
                            setDeleteDialogBoxContent(
                              'Are you sure you want to delete "' +
                                project.name +
                                '"?'
                            );
                            setPickedItemToDelete(project);
                          }
                        }}
                        sx={{
                          cursor: !isProjectsLoading && "pointer",
                          color: "#ed4337",
                          borderRadius: "20%",
                          padding: "2px",
                          ":hover": !isProjectsLoading && {
                            backgroundColor: "#a9a9a9",
                          },
                        }}
                      />
                    </TableCell>
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
            <LocationCityIcon
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
              Locations
            </Typography>
          </div>
          <Button
            variant="contained"
            disabled={isPageLoading || isLocationsLoading}
            onClick={() => {
              setAddNewLocationDialogBoxOpen(true);
            }}
            sx={{
              backgroundColor: "#Ffc85d",
              color: "#000",
              width: "120px",
              height: "36px",
              textTransform: "none",
              borderRadius: "18px",
              marginRight: isMobile ? "20px" : "40px",
              fontFamily: "'Roboto', sans-serif",
              ":hover": { backgroundColor: "#eda71f" },
            }}
          >
            <AddIcon style={{ marginRight: "12px", fontSize: "24px" }} />
            Location
          </Button>
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
        ) : locationData.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4}>
            <i>No Locations Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Location Name</TableCell>
                  <TableCell style={tableHeaderStyles}>Location Code</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Location Description
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {locationData.map((location) => (
                  <TableRow key={location.name}>
                    <TableCell style={tableBodyStyles}>
                      {location.name}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {location.code}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <i>{location.desc}</i>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <DeleteIcon
                        onClick={() => {
                          if (!isLocationsLoading) {
                            setDeleteDialogBoxOpen(true);
                            setDeleteDialogBoxTitle("Delete Location?");
                            setDeleteDialogBoxContent(
                              'Are you sure you want to delete "' +
                                location.name +
                                '"?'
                            );
                            setPickedItemToDelete(location);
                          }
                        }}
                        sx={{
                          cursor: !isLocationsLoading && "pointer",
                          color: "#ed4337",
                          borderRadius: "20%",
                          padding: "2px",
                          ":hover": !isLocationsLoading && {
                            backgroundColor: "#a9a9a9",
                          },
                        }}
                      />
                    </TableCell>
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
              Positions
            </Typography>
          </div>
          <Button
            variant="contained"
            disabled={isPageLoading || isPositionsLoading}
            onClick={() => {
              setAddNewPositionDialogBoxOpen(true);
            }}
            sx={{
              backgroundColor: "#f3887c",
              width: "120px",
              height: "36px",
              textTransform: "none",
              borderRadius: "18px",
              marginRight: isMobile ? "20px" : "40px",
              fontFamily: "'Roboto', sans-serif",
              ":hover": { backgroundColor: "#ba5c52" },
            }}
          >
            <AddIcon style={{ marginRight: "12px", fontSize: "24px" }} />
            Position
          </Button>
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
        ) : positionData.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4}>
            <i>No Positions Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Position Name</TableCell>
                  <TableCell style={tableHeaderStyles}>Position Code</TableCell>
                  <TableCell style={tableHeaderStyles}>
                    Position Description
                  </TableCell>
                  <TableCell style={tableHeaderStyles}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positionData.map((position) => (
                  <TableRow key={position.name}>
                    <TableCell style={tableBodyStyles}>
                      {position.name}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {position.code}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <i>{position.desc}</i>
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {position.name !== "Administrator" && (
                        <DeleteIcon
                          onClick={() => {
                            if (!isPositionsLoading) {
                              setDeleteDialogBoxOpen(true);
                              setDeleteDialogBoxTitle("Delete Position?");
                              setDeleteDialogBoxContent(
                                'Are you sure you want to delete "' +
                                  position.name +
                                  '"?'
                              );
                              setPickedItemToDelete(position);
                            }
                          }}
                          sx={{
                            cursor: !isPositionsLoading && "pointer",
                            color: "#ed4337",
                            borderRadius: "20%",
                            padding: "2px",
                            ":hover": !isPositionsLoading && {
                              backgroundColor: "#a9a9a9",
                            },
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
      <Box
        sx={{
          width: isTablet ? "96%" : "98%",
          backgroundColor: "#fff",
          margin: "10px 20px 10px 0",
          borderRadius: "12px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingBottom: "16px",
        }}
      >
        <div style={{ display: "flex", paddingTop: "14px" }}>
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
            Leaves Allowed
          </Typography>
        </div>
        <Grid
          container
          style={{
            margin: "10px",
            width: "100%",
          }}
          spacing={2}
        >
          <Grid item xs={12} md={8} paddingBottom={2}>
            {isPageLoading ? (
              <Skeleton width={"55%"} height={"40px"} variant="rounded" />
            ) : (
              <Tooltip
                title="Leave Year A.K.A Leave Duration. (End Date automatically calculated - 1 year)"
                arrow
              >
                <div>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      defaultValue={dayjs(
                        leavesAllowedData.leaveYear,
                        "DD-MM-YYYY"
                      )}
                      format="DD-MM-YYYY"
                      label="Leave Year Start Date"
                      slotProps={{ textField: { size: "small" } }}
                      onChange={(value) => {
                        setNewLeaveYear(value);
                      }}
                      sx={{
                        width: "55%",
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
                </div>
              </Tooltip>
            )}
          </Grid>
          <Grid item xs={8} md={6}>
            {isPageLoading ? (
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Annual Leaves Allowed"
                variant="outlined"
                name="annual_leaves_allowed"
                size="small"
                type="number"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                defaultValue={leavesAllowedData.annualLeavesAllowed}
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#f3887c",
                  },
                }}
                onChange={(e) => {
                  setNewLeavesAllowedData({
                    annualLeavesAllowed: Number(e.target.value),
                    sickLeavesAllowed: !newLeavesAllowedData.sickLeavesAllowed
                      ? leavesAllowedData.sickLeavesAllowed
                      : newLeavesAllowedData.sickLeavesAllowed,
                  });
                }}
              />
            )}
          </Grid>
          <Grid item xs={8} md={6}>
            {isPageLoading ? (
              <Skeleton width={"80%"} height={"40px"} variant="rounded" />
            ) : (
              <TextField
                label="Sick Leaves Allowed"
                variant="outlined"
                name="sick_leaves_allowed"
                size="small"
                type="number"
                inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                InputLabelProps={{
                  style: { fontFamily: "'Open Sans', Arial", shrink: true },
                }}
                defaultValue={leavesAllowedData.sickLeavesAllowed}
                sx={{
                  width: "80%",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "14px",
                  },
                  "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                    border: "2px solid",
                    borderColor: "#Ffc85d",
                  },
                }}
                onChange={(e) => {
                  setNewLeavesAllowedData({
                    sickLeavesAllowed: Number(e.target.value),
                    annualLeavesAllowed:
                      !newLeavesAllowedData.annualLeavesAllowed
                        ? leavesAllowedData.annualLeavesAllowed
                        : newLeavesAllowedData.annualLeavesAllowed,
                  });
                }}
              />
            )}
          </Grid>
        </Grid>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: "12px",
            paddingBottom: "6px",
          }}
        >
          <Button
            variant="contained"
            disabled={isPageLoading || isLeavesAllowedSaveLoading}
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
            onClick={() => {
              if (newLeaveYear) {
                if (!dayjs(newLeaveYear, "DD-MM-YYYY", true).isValid()) {
                  setSnackbarMessage("Please select a valid leave year");
                  setSnackbarSeverity("error");
                  setSnackbarOpen(true);
                } else {
                  //show warning dialog
                  setOpenChangeLeaveYearDialog(true);
                }
              } else {
                handleLeavesAllowedChange(false);
              }
            }}
          >
            {isLeavesAllowedSaveLoading ? (
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
          <Button sx={{ color: "#ed4337" }} onClick={handleDeleteClick}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Delete Dialog Box */}

      {/* Add New Project Dialog Box */}
      <Dialog
        open={addNewProjectDialogBoxOpen}
        onClose={() => {
          setAddNewProjectDialogBoxOpen(false);
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
            <AccountTreeIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box> Add New Project/Work</Box>
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
            <Grid item xs={12} md={6}>
              <TextField
                id="ProjectName"
                label="Project Name"
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
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
                onChange={(e) => {
                  setNewProject({ ...newProject, name: e.target.value });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                id="ProjectCode"
                label="Project Code"
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
                  setNewProject({ ...newProject, code: e.target.value });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  defaultValue={dayjs()}
                  format="DD-MM-YYYY"
                  label="Start Date"
                  slotProps={{ textField: { size: "small" } }}
                  onChange={(value) => {
                    setNewProject({ ...newProject, startDate: value });
                  }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
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
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  defaultValue={dayjs().add(1, "month")}
                  format="DD-MM-YYYY"
                  label="End Date"
                  slotProps={{ textField: { size: "small" } }}
                  onChange={(value) => {
                    setNewProject({ ...newProject, endDate: value });
                  }}
                  sx={{
                    width: "100%",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "12px",
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
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="ProjectInfo"
                label="Project Information"
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
                  setNewProject({ ...newProject, info: e.target.value });
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddNewProjectDialogBoxOpen(false);
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleAddNewProject}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Add New Project Dialog Box */}
      {/* Add New Location Dialog Box */}
      <Dialog
        open={addNewLocationDialogBoxOpen}
        onClose={() => {
          setAddNewLocationDialogBoxOpen(false);
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
            <LocationCityIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box> Add New Location</Box>
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
            <Grid item xs={12} md={6}>
              <TextField
                id="LocationName"
                label="Location Name"
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
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
                onChange={(e) => {
                  setNewLocation({ ...newLocation, name: e.target.value });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                id="LocationCode"
                label="Location Code"
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
                  setNewLocation({ ...newLocation, code: e.target.value });
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                id="LocationDesc"
                label="Location Description"
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
                  setNewLocation({ ...newLocation, desc: e.target.value });
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddNewLocationDialogBoxOpen(false);
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleAddNewLocation}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Add New Location Dialog Box */}
      {/* Add New Position Dialog Box */}
      <Dialog
        open={addNewPositionDialogBoxOpen}
        onClose={() => {
          setAddNewPositionDialogBoxOpen(false);
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
            <BadgeIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box> Add New Position</Box>
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
            <Grid item xs={12} md={6}>
              <TextField
                id="PositionName"
                label="Position Name"
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
                    borderColor: "#Ffc85d",
                    backgroundColor: "#Ffc85d10",
                  },
                }}
                onChange={(e) => {
                  setNewPosition({ ...newPosition, name: e.target.value });
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                id="PositionCode"
                label="Position Code"
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
                  setNewPosition({ ...newPosition, code: e.target.value });
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                id="PositionDesc"
                label="Position Description"
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
                  setNewPosition({ ...newPosition, desc: e.target.value });
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddNewPositionDialogBoxOpen(false);
            }}
          >
            Close
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={handleAddNewPosition}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Add New Position Dialog Box */}
      {/* Start of Change Leave Year Dialog Box */}
      <Dialog
        open={openChangeLeaveYearDialog}
        onClose={() => setOpenChangeLeaveYearDialog(false)}
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
            <WarningIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
              }}
            />
            <Box>Change Leave Year</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Changing the leave year start date <b>will not</b> recalculate the
            remaining leave of employees. You may need to manually change them
            in the leave page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenChangeLeaveYearDialog(false);
            }}
          >
            Cancel
          </Button>
          <Button
            sx={{
              color: "#74b581",
            }}
            onClick={() => {
              setOpenChangeLeaveYearDialog(false);
              handleLeavesAllowedChange(true);
            }}
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
      {/* End of Change Leave Year Dialog Box */}
    </div>
  );
}

export default Settings;
