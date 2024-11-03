import { useEffect, useState, useRef } from "react";
import "./App.css";
import Sidebar from "./Components/Sidebar";
import Topbar from "./Components/Topbar";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Employees from "./pages/employees";
import Timesheet from "./pages/timesheet";
import Announcements from "./pages/announcements";
import Payslips from "./pages/payslips";
import Tasks from "./pages/tasks";
import Leave from "./pages/leave";
import Settings from "./pages/settings";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ForgotPassword from "./pages/forgotPassword";
import Profile from "./pages/profile";
import PageNotFound from "./pages/pageNotFound";
import Sudo from "./pages/sudo";
import Membership from "./pages/membership";
import {
  Snackbar,
  Slide,
  Alert,
  Dialog,
  DialogTitle,
  Box,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Skeleton,
} from "@mui/material";
import CircleNotificationsIcon from "@mui/icons-material/CircleNotifications";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { firebaseAuth, firebaseDb } from "./firebase/baseConfig";
import { doc, getDoc, collection, updateDoc } from "firebase/firestore";
import { signOutUser } from "./firebase/auth";
import dayjs from "dayjs";

function getBlockedStatus(companyID, setCompanyBlocked) {
  const companyDocRef = doc(firebaseDb, "companies", companyID);
  const compnayDoc = getDoc(companyDocRef);

  compnayDoc
    .then((doc) => {
      const isBlocked = doc.data().isDisabled;
      setCompanyBlocked(isBlocked);
      if (isBlocked) {
        setTimeout(() => {
          signOutUser(firebaseAuth).then(() => {
            window.location.reload();
          });
        }, 10000);
      }
    })
    .catch((error) => {
      console.error("[DB] => Get Blocked Status: ", error);
    });
}

function usePageTitle(isAdmin) {
  // Update page title (on topbar) based on the path
  const [pageTitle, setPageTitle] = useState("");
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      case "/":
        setPageTitle(isAdmin ? "Dashboard" : "Profile");
        break;
      case "/employees":
        setPageTitle("Employees");
        break;
      case "/timesheet":
        setPageTitle("Timesheet");
        break;
      case "/announcements":
        setPageTitle("Announcements");
        break;
      case "/payslips":
        setPageTitle("Payslips");
        break;
      case "/tasks":
        setPageTitle("Tasks");
        break;
      case "/leave":
        setPageTitle("Leave");
        break;
      case "/settings":
        setPageTitle("Settings");
        break;
      case "/profile":
        setPageTitle("Profile");
        break;
      case "/membership":
        setPageTitle("Membership");
        break;
    }
  }, [location.pathname, isAdmin]);

  return pageTitle;
}

function markNotificationsAsRead(companyID, notificationID) {
  // update the database to mark the notifications as read
  const notisRef = collection(
    firebaseDb,
    "companies",
    companyID,
    "notifications"
  );
  const notiRef = doc(notisRef, notificationID);
  updateDoc(notiRef, { isRead: true });
}

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyID, setCompanyID] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [usrRole, setUsrRole] = useState(null);
  const [usrName, setUsrName] = useState(null);
  const [usrPic, setUsrPic] = useState(null);
  const [usrEmail, setUsrEmail] = useState(null);
  const [companyBlocked, setCompanyBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialized = useRef(false); // initialized flag to prevent multiple fetches

  // Handle authentication state changes, and get basic data (company name, etc.)
  useEffect(() => {
    if (isInitialized.current) return; // If already initialized, do nothing
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      const publicPaths = ["/login", "/signup", "/forgot-password"];
      if (!user && !publicPaths.includes(location.pathname)) {
        // User not authenticated, trying to access a protected route, redirect to login
        navigate("/login");
      } else if (user && !publicPaths.includes(location.pathname)) {
        // User authenticated, trying to access a protected route, do not redirect
        user.getIdTokenResult().then((idTokenResult) => {
          const usrPosition = idTokenResult.claims.position;

          if (usrPosition === "SuperAdmin") {
            // SuperAdmin, redirect to sudo
            navigate("/sudo");
            isInitialized.current = true; // Mark as initialized
            return;
          } else {
            // Regular user
            setIsAdmin(usrPosition === "Administrator");
            const docRef = doc(firebaseDb, "users", user.email);
            getDoc(docRef)
              .then((docSnap) => {
                setCompanyID(docSnap.data().companyID);
                setUsrRole(docSnap.data().position);
                setCompanyName(docSnap.data().companyName);
                setUsrName(docSnap.data().name);
                setUsrPic(docSnap.data().profilePic);
                setUsrEmail(docSnap.data().email);
                getBlockedStatus(docSnap.data().companyID, setCompanyBlocked);
                isInitialized.current = true; // Mark as initialized
              })
              .catch((error) => {
                console.error(error);
              });
          }
        });
      }
    });
    return () => unsubscribe();
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      //Keep sidebar open on dektop
      isMobile ? setSidebarOpen(false) : setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  const pageTitle = usePageTitle(isAdmin);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  const showBars =
    location.pathname == "/" ||
    location.pathname == "/employees" ||
    location.pathname == "/timesheet" ||
    location.pathname == "/announcements" ||
    location.pathname == "/payslips" ||
    location.pathname == "/tasks" ||
    location.pathname == "/leave" ||
    location.pathname == "/settings" ||
    location.pathname == "/profile" ||
    location.pathname == "/membership";

  // Manage notifications
  const [allNotifications, setAllNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [openNotification, setOpenNotification] = useState(null);
  const handleNotificatonToggle = (id) => {
    setOpenNotification(openNotification === id ? null : id);
  };

  useEffect(() => {
    // Mark notification as read on openNotification
    if (openNotification) {
      const notification = allNotifications.find(
        (n) => n.id === openNotification
      );
      if (notification && !notification.isRead) {
        notification.isRead = true;
        setAllNotifications([...allNotifications]);
        setUnreadNotificationsCount(unreadNotificationsCount - 1);
        markNotificationsAsRead(companyID, openNotification);
      }
    }
  }, [openNotification]);

  return (
    <div className="App">
      {showBars && (
        <Sidebar
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isAdmin={isAdmin}
          companyName={companyName}
        />
      )}
      <div className="content">
        <div className="overlay" onClick={toggleSidebar}></div>
        {showBars && (
          <Topbar
            toggleSidebar={toggleSidebar}
            pageTitle={pageTitle}
            setOpenNotification={setOpenNotification}
            setOpenNotificationDialog={setOpenNotificationDialog}
            usrRole={usrRole}
            companyID={companyID}
            usrName={usrName}
            usrPic={usrPic}
            usrEmail={usrEmail}
            setAllNotifications={setAllNotifications}
            unreadNotificationsCount={unreadNotificationsCount}
            setUnreadNotificationsCount={setUnreadNotificationsCount}
          />
        )}

        <Routes>
          <Route
            path="/"
            index
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : isAdmin ? (
                <Dashboard companyID={companyID} />
              ) : (
                <Profile
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                />
              )
            }
          />
          <Route
            path="/employees"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Employees
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  companyName={companyName}
                />
              )
            }
          />
          <Route
            path="/timesheet"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Timesheet
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                />
              )
            }
          />
          <Route
            path="/announcements"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Announcements
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                  companyName={companyName}
                />
              )
            }
          />
          <Route
            path="/payslips"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Payslips
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                  companyName={companyName}
                />
              )
            }
          />
          <Route
            path="/tasks"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Tasks
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                />
              )
            }
          />
          <Route
            path="/leave"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Leave
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                  companyName={companyName}
                />
              )
            }
          />
          <Route
            path="/settings"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Settings
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                />
              )
            }
          />
          <Route
            path="/membership"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Membership
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                />
              )
            }
          />
          <Route
            path="/login"
            element={
              <Login
                setSnackbarOpen={setSnackbarOpen}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
              />
            }
          />
          <Route
            path="/signup"
            element={
              <Signup
                setSnackbarOpen={setSnackbarOpen}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
              />
            }
          />
          <Route
            path="/forgot-password"
            element={
              <ForgotPassword
                setSnackbarOpen={setSnackbarOpen}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
              />
            }
          />
          <Route
            path="/profile"
            element={
              companyName === null ? (
                <Skeleton
                  variant="rectangular"
                  width="95%"
                  height="95%"
                  sx={{ margin: "auto", borderRadius: "20px" }}
                />
              ) : (
                <Profile
                  isAdmin={isAdmin}
                  setSnackbarOpen={setSnackbarOpen}
                  setSnackbarMessage={setSnackbarMessage}
                  setSnackbarSeverity={setSnackbarSeverity}
                  companyID={companyID}
                  usrEmail={usrEmail}
                />
              )
            }
          />
          <Route
            path="/sudo"
            element={
              <Sudo
                setSnackbarOpen={setSnackbarOpen}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
              />
            }
          />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
      <Snackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        autoHideDuration={5000}
        TransitionComponent={Slide}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {/* Notifications Dialog start*/}
      <Dialog
        open={openNotificationDialog}
        onClose={() => {
          setOpenNotificationDialog(false);
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
            <CircleNotificationsIcon
              sx={{
                color: "#f4a322",
                marginRight: "10px",
                paddingBottom: "3px",
                fontSize: "1.8rem",
              }}
            />
            <Box>Notifications</Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {allNotifications.map((notification) => (
              <Box key={notification.id}>
                <ListItem
                  button
                  onClick={() => handleNotificatonToggle(notification.id)}
                >
                  <ListItemText
                    primary={
                      <span>
                        {notification.title} &nbsp;
                        <Box
                          component="span"
                          sx={{
                            fontStyle: "italic",
                            fontSize: "0.9rem",
                            fontWeight: "400",
                            color: "#a9a9a9",
                          }}
                        >
                          (
                          {dayjs(notification.time.toDate()).format(
                            "DD-MM-YYYY hh:mmA"
                          )}
                          )
                        </Box>
                      </span>
                    }
                    primaryTypographyProps={{
                      sx: {
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: "1rem",
                        fontWeight: notification.isRead ? "400" : "600",
                      },
                    }}
                  />
                  {openNotification === notification.id ? (
                    <ExpandLess
                      sx={{
                        color: "#f4a322",
                      }}
                    />
                  ) : (
                    <ExpandMore
                      sx={{
                        color: "#f4a322",
                      }}
                    />
                  )}
                </ListItem>
                <Collapse
                  in={openNotification === notification.id}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ pl: 4, pb: 2 }}>
                    <Box
                      sx={{
                        fontFamily: "'Open Sans', Arial",
                        fontWeight: "normal",
                        fontSize: "0.95rem",
                      }}
                    >
                      {notification.description}
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenNotificationDialog(false);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      {/* Notifications Dialog end*/}
      {/* Blocked Dialog start*/}
      <Dialog
        open={companyBlocked}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="sm"
        sx={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          "& .MuiDialog-paper": {
            borderRadius: "20px",
            textAlign: "center",
          },
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: "#f3887c" }}>
          Company Disabled
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              fontFamily: "'Open Sans', Arial",
              fontWeight: "normal",
              fontSize: "0.95rem",
            }}
          >
            <i>
              It seems that your company has been resticted from using the
              platform,
              {!isAdmin ? " Please contact your admin." : " Please contact us."}
              <br />
              <span style={{ color: "#a378ff", fontSize: "0.8rem" }}>
                You will be logged out shortly!
              </span>
            </i>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Blocked Dialog end*/}
    </div>
  );
}

export default App;
