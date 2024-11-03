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
import AddAlertIcon from "@mui/icons-material/AddAlert";
import PublishIcon from "@mui/icons-material/Publish";
import CampaignIcon from "@mui/icons-material/Campaign";
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

const tableContainerStyles = {
  borderRadius: "20px",
  width: isMobile ? "93vw" : isTablet ? "65vw" : "78vw",
  marginBottom: "10px",
  marginTop: "10px",
  overflow: "auto",
  maxHeight: "80vh",

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

async function deleteAnnouncement(companyID, announcementID) {
  return new Promise(async (resolve, reject) => {
    const announcementsColRef = collection(
      firebaseDb,
      "companies",
      companyID,
      "announcements"
    );
    await deleteDoc(doc(announcementsColRef, announcementID))
      .then(() => {
        resolve();
      })
      .catch((e) => {
        reject(e);
      });
  });
}

async function getAnnouncements(
  companyID,
  publishedTo,
  announcementsData,
  setAnnouncementsData,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  lastVisibleDoc,
  setLastVisibleDoc
) {
  try {
    const pageSize = 10;
    const announcementsColRef = collection(
      firebaseDb,
      "companies",
      companyID,
      "announcements"
    );
    let announcementsQuery = query(
      announcementsColRef,
      limit(pageSize),
      orderBy("deleteTime", "desc")
    );
    if (publishedTo !== "All") {
      announcementsQuery = query(
        announcementsColRef,
        where("recepient", "==", publishedTo),
        limit(pageSize)
      );
    }
    if (lastVisibleDoc) {
      announcementsQuery = query(
        announcementsQuery,
        startAfter(lastVisibleDoc)
      );
    }
    const announcementsSnapshot = await getDocs(announcementsQuery);
    if (!announcementsSnapshot.empty) {
      const announcements = [];
      announcementsSnapshot.forEach((doc) => {
        announcements.push({ ...doc.data(), id: doc.id });
        setLastVisibleDoc(doc);
      });
      if (lastVisibleDoc === null) {
        setAnnouncementsData(announcements);
      } else {
        setAnnouncementsData([...announcementsData, ...announcements]);
      }
    } else {
      if (lastVisibleDoc === null) {
        // Initial fetch and its empty
        setAnnouncementsData([]);
      } else {
        // No more data to fetch
        setSnackbarMessage("No more announcements to fetch");
        setSnackbarSeverity("info");
        setSnackbarOpen(true);
      }
    }
  } catch (e) {
    console.error("[DB] => Get Announcements: " + e);
    setSnackbarSeverity("error");
    setSnackbarMessage(
      "Something went wrong while fetching announcements. Please try again."
    );
    setSnackbarOpen(true);
  }
}

function createAnnouncement(companyID, announcement) {
  return new Promise(async (resolve, reject) => {
    try {
      const announcementsColRef = collection(
        firebaseDb,
        "companies",
        companyID,
        "announcements"
      );
      const docRef = await addDoc(announcementsColRef, announcement);
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

function Announcements({
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
  const [announcementsData, setAnnouncementsData] = useState([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(true);

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

    setIsAnnouncementsLoading(true);
    getAnnouncements(
      companyID,
      "All",
      announcementsData,
      setAnnouncementsData,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      lastVisibleDoc,
      setLastVisibleDoc
    ).finally(() => setIsAnnouncementsLoading(false), setIsPageLoading(false));
  }, [companyID]);

  const [announcementFilterEmployee, setAnnouncementFilterEmployee] =
    useState("All");
  const [dialogBoxOpen, setDialogBoxOpen] = useState(false);

  const [announcement, setAnnouncement] = useState({});
  const [isPublishLoading, setIsPublishLoading] = useState(false);

  function handlePublish() {
    if (!announcement.title || announcement.title.length < 4) {
      setSnackbarMessage("Title must be at least 4 characters long");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (
      !announcement.message ||
      announcement.message.length < 8 ||
      announcement.message.length > 500
    ) {
      setSnackbarMessage("Message must be between 8 and 500 characters long");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!announcement.publishTo) {
      setSnackbarMessage("Please select a recipient");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!announcement.publishDate) {
      announcement.publishDate = dayjs().format("DD-MM-YYYY");
    }
    if (announcement.publishDate == "Invalid Date") {
      setSnackbarMessage("Please select a valid publish date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!announcement.expireDate) {
      announcement.expireDate = dayjs().add(2, "day").format("DD-MM-YYYY");
    }
    if (announcement.expireDate == "Invalid Date") {
      setSnackbarMessage("Please select a valid expiration date");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (
      announcementsData.filter(
        (a) =>
          a.title === announcement.title &&
          a.publishDate === announcement.publishDate
      ).length > 0
    ) {
      setSnackbarMessage(
        "Announcement with same title already exists for this date."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const publishDate = dayjs(announcement.publishDate, "DD-MM-YYYY");
    const expireDate = dayjs(announcement.expireDate, "DD-MM-YYYY");
    if (expireDate.diff(publishDate, "day") > 30) {
      setSnackbarMessage(
        "Expiration date must be within 30 days of publish date"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const emailPattern = /\(([^)]+)\)/;
    const emailMatch = announcement.publishTo.match(emailPattern);
    if (emailMatch) {
      announcement.recepient = emailMatch[1];
    } else {
      announcement.recepient = "All";
    }
    announcement.deleteTime = Timestamp.fromDate(expireDate.toDate());

    setIsPublishLoading(true);
    createAnnouncement(companyID, announcement)
      .then((docID) => {
        // Save changes to local state (to avoid fetching data again)
        if (
          announcementFilterEmployee === announcement.publishTo ||
          announcementFilterEmployee === "All"
        ) {
          announcement.id = docID;
          setAnnouncementsData([announcement, ...announcementsData]);
          setLastVisibleDoc(announcement["deleteTime"]);
        }
        setSnackbarMessage("Announcement published successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsPublishLoading(false);

        // Write Notification
        let allEmails = [];
        if (announcement.recepient === "All") {
          employeesWithEmail.forEach((emailWithName) => {
            allEmails.push(emailWithName.match(emailPattern)[1]);
          });
        } else {
          allEmails = [announcement.recepient];
        }
        writeNotification(
          companyID,
          allEmails,
          "New Announcement",
          announcement.title,
          {
            title: `New Announcement from ${companyName}`,
            body: `Title: ${announcement.title}\nMessage: ${announcement.message}\nVist hrcompliance.wie-solutions.co.uk/announcements to view.`,
          }
        );
        setAnnouncement({});
      })
      .catch((e) => {
        console.error("[DB] => Create Announcement: " + e);
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsPublishLoading(false);
      });
  }

  const [selectedAnnouncementToDelete, setSelectedAnnouncementToDelete] =
    useState(null);
  function handleAnnouncementDelete() {
    deleteAnnouncement(companyID, selectedAnnouncementToDelete.id)
      .then(() => {
        // Save changes to local state (to avoid fetching data again)
        const index = announcementsData.findIndex(
          (a) => a.id === selectedAnnouncementToDelete.id
        );
        if (index === announcementsData.length - 1) {
          setLastVisibleDoc(announcementsData[index]["deleteTime"]);
        }
        setAnnouncementsData(
          announcementsData.filter(
            (a) => a.id !== selectedAnnouncementToDelete.id
          )
        );
        setSnackbarMessage("Announcement deleted successfully");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setSelectedAnnouncementToDelete(null);
        setDialogBoxOpen(false);
      })
      .catch((e) => {
        console.error("[DB] => Delete Announcement: " + e);
        setSnackbarMessage("Something went wrong. Please try again.");
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
            <AddAlertIcon
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
              Create Announcement
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
            <Grid item xs={7}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Title"
                  variant="outlined"
                  name="title"
                  size="small"
                  value={announcement.title || ""}
                  onChange={(e) =>
                    setAnnouncement({ ...announcement, title: e.target.value })
                  }
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
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
            <Grid item xs={12}>
              {isPageLoading ? (
                <Skeleton width={"80%"} height={"40px"} variant="rounded" />
              ) : (
                <TextField
                  label="Message"
                  variant="outlined"
                  size="small"
                  name="description"
                  multiline
                  maxRows={5}
                  value={announcement.message || ""}
                  onChange={(e) =>
                    setAnnouncement({
                      ...announcement,
                      message: e.target.value,
                    })
                  }
                  inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
                  InputLabelProps={{
                    style: { fontFamily: "'Open Sans', Arial" },
                  }}
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
                <Skeleton
                  width={320}
                  height={"40px"}
                  variant="rounded"
                  sx={{ marginTop: isTablet || isMobile ? "0" : "8px" }}
                />
              ) : (
                <Autocomplete
                  options={["All", ...employeesWithEmail]}
                  size="small"
                  value={announcement.publishTo || null}
                  onChange={(event, newValue) => {
                    setAnnouncement({
                      ...announcement,
                      publishTo: newValue,
                    });
                  }}
                  sx={{
                    width: 320,
                    marginTop: isTablet || isMobile ? "0" : "8px",
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
                    <TextField {...params} label="Publish To" />
                  )}
                />
              )}
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              {isPageLoading ? (
                <Skeleton
                  width={320}
                  height={"40px"}
                  variant="rounded"
                  sx={{ marginTop: isTablet || isMobile ? "0" : "8px" }}
                />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      announcement.publishDate
                        ? dayjs(announcement.publishDate, "DD-MM-YYYY")
                        : dayjs()
                    }
                    onChange={(value) =>
                      setAnnouncement({
                        ...announcement,
                        publishDate: dayjs(value).format("DD-MM-YYYY"),
                      })
                    }
                    format="DD-MM-YYYY"
                    disabled
                    label="Publish Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      marginTop: isTablet || isMobile ? "0" : "8px",
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
                <Skeleton
                  width={320}
                  height={"40px"}
                  variant="rounded"
                  sx={{ marginTop: isTablet || isMobile ? "0" : "8px" }}
                />
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={
                      announcement.expireDate
                        ? dayjs(announcement.expireDate, "DD-MM-YYYY")
                        : dayjs().add(2, "day")
                    }
                    onChange={(value) =>
                      setAnnouncement({
                        ...announcement,
                        expireDate: dayjs(value).format("DD-MM-YYYY"),
                      })
                    }
                    format="DD-MM-YYYY"
                    label="Expire Date"
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      marginTop: isTablet || isMobile ? "0" : "8px",
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
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              paddingBottom: "20px",
            }}
          >
            <Button
              variant="contained"
              disabled={isPageLoading || isPublishLoading}
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
              onClick={handlePublish}
            >
              {isPublishLoading ? (
                <CircularProgress size={24} sx={{ color: "#4b49ac" }} />
              ) : (
                <>
                  <PublishIcon
                    style={{ marginRight: "12px", fontSize: "24px" }}
                  />
                  Publish
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
            display: "flex",
            paddingTop: "14px",
            width: "99%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <CampaignIcon
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
              {isAdmin ? "All Announcements" : "Announcements"}
            </Typography>
          </div>

          {isPageLoading ? (
            <Skeleton
              width={isMobile ? 100 : 200}
              height={"40px"}
              variant="rounded"
              sx={{ marginRight: "20px" }}
            />
          ) : (
            <Autocomplete
              options={
                isAdmin ? ["All", ...employeesWithEmail] : ["All", "Myself"]
              }
              defaultValue={"All"}
              onChange={(event, newValue) => {
                if (newValue == null) return;
                let filter = newValue;
                if (filter != "All" && filter != "Myself") {
                  const emailPattern = /\(([^)]+)\)/;
                  const emailMatch = filter.match(emailPattern)[1];
                  filter = emailMatch;
                } else if (filter == "Myself") {
                  filter = usrEmail;
                }
                setAnnouncementFilterEmployee(newValue);
                setIsAnnouncementsLoading(true);
                setAnnouncementsData([]);
                setLastVisibleDoc(null);
                getAnnouncements(
                  companyID,
                  filter,
                  announcementsData,
                  setAnnouncementsData,
                  setSnackbarOpen,
                  setSnackbarMessage,
                  setSnackbarSeverity,
                  null,
                  setLastVisibleDoc
                ).finally(() => setIsAnnouncementsLoading(false));
              }}
              sx={{
                width: isMobile ? 100 : 200,
                marginRight: "20px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                },
                "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#4b49ac",
                },
              }}
              size="small"
              renderInput={(params) => (
                <TextField {...params} label="Filter By" />
              )}
            />
          )}
        </div>
        {isPageLoading || isAnnouncementsLoading ? (
          <Skeleton
            width={isMobile ? "93vw" : isTablet ? "65vw" : "78vw"}
            height={"20vh"}
            variant="rounded"
            sx={{
              marginTop: "16px",
              marginBottom: "16px",
            }}
          />
        ) : announcementsData.length === 0 ? (
          <Typography
            color="#a9a9a9"
            textAlign={"center"}
            marginTop={8}
            paddingBottom={4}
          >
            <i>No Announcements Found</i>
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={tableContainerStyles}>
            <Table aria-label="simple table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Date</TableCell>
                  <TableCell style={tableHeaderStyles}>Title</TableCell>
                  <TableCell style={tableHeaderStyles}>Message</TableCell>
                  <TableCell style={tableHeaderStyles}>Expires</TableCell>
                  <TableCell style={tableHeaderStyles}>To</TableCell>
                  {isAdmin && (
                    <TableCell style={tableHeaderStyles}>Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {announcementsData.map((announcements) => (
                  <TableRow
                    key={announcements.publishDate + announcements.title}
                  >
                    <TableCell style={tableBodyStyles}>
                      {announcements.publishDate}
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "left" }}
                    >
                      {announcements.title}
                    </TableCell>
                    <TableCell
                      style={{ ...tableBodyStyles, textAlign: "left" }}
                    >
                      {announcements.message}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      {announcements.expireDate}
                    </TableCell>
                    <TableCell style={tableBodyStyles}>
                      <div
                        style={{
                          backgroundColor:
                            announcements.to === "All" ? "#74b581" : "#f3887c",
                          color: "#fff",
                          fontWeight: "500",
                          position: "relative",
                          borderRadius: "14px",
                          padding: "2px 6px 2px 6px",
                        }}
                      >
                        {announcements.publishTo}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell
                        style={{ ...tableBodyStyles, textAlign: "center" }}
                      >
                        <DeleteIcon
                          onClick={() => {
                            setDialogBoxOpen(true);
                            setSelectedAnnouncementToDelete(announcements);
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
        {announcementsData.length === 0 ? null : isPaginationLoading ? (
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
              let filter = announcementFilterEmployee;
              if (
                announcementFilterEmployee != "All" &&
                announcementFilterEmployee != "Myself"
              ) {
                const emailPattern = /\(([^)]+)\)/;
                const emailMatch =
                  announcementFilterEmployee.match(emailPattern)[1];
                filter = emailMatch;
              } else if (announcementFilterEmployee == "Myself") {
                filter = usrEmail;
              }
              getAnnouncements(
                companyID,
                filter,
                announcementsData,
                setAnnouncementsData,
                setSnackbarOpen,
                setSnackbarMessage,
                setSnackbarSeverity,
                lastVisibleDoc,
                setLastVisibleDoc
              ).finally(() => setIsPaginationLoading(false));
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
            <Box>Delete Announcement?</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this announcement?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogBoxOpen(false)}>No</Button>
          <Button sx={{ color: "#ed4337" }} onClick={handleAnnouncementDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Announcements;
