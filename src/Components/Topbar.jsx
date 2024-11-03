import "./topbar.css";
import React, { useState, useEffect, useRef } from "react";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import Badge from "@mui/material/Badge";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import Avatar from "@mui/material/Avatar";
import { Button } from "@mui/material";
import KeyboardArrowRightOutlinedIcon from "@mui/icons-material/KeyboardArrowRightOutlined";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import { Skeleton } from "@mui/material";
import { firebaseDb } from "../firebase/baseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOutUser } from "../firebase/auth";

async function getNotifications(
  companyID,
  usrEmail,
  setIsNotificationsLoading,
  setNotifications,
  setUnreadNotificationsCount,
  setAllNotifications
) {
  const notisRef = collection(
    firebaseDb,
    "companies",
    companyID,
    "notifications"
  );
  const q = query(
    notisRef,
    where("to", "==", usrEmail),
    orderBy("time", "desc")
  );
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    let notifications = [];
    let unreadNotifications = [];
    let allNotifications = [];
    qSnap.forEach((doc) => {
      // Filtering unread notifications (to show on the dropdown)
      if (doc.data().isRead === false) {
        unreadNotifications.push({
          id: doc.id,
          title: doc.data().title,
          isRead: doc.data().isRead,
        });
      }
      // All notifications (to show on the popup)
      allNotifications.push({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().message,
        isRead: doc.data().isRead,
        time: doc.data().time,
      });
    });
    setAllNotifications(allNotifications);

    // Setting unread notifications count
    notifications = [...unreadNotifications];
    setUnreadNotificationsCount(unreadNotifications.length);
    if (notifications.length < 5) {
      // If there are less than 5 unread notifications, then fetch read notifications till the count becomes 5
      qSnap.forEach((doc) => {
        if (notifications.length >= 5) return;
        if (
          doc.data().isRead ||
          !unreadNotifications.some((n) => n.id === doc.id)
        ) {
          notifications.push({
            id: doc.id,
            title: doc.data().title,
            isRead: doc.data().isRead,
          });
        }
      });
    }
    setNotifications(notifications);
  } else {
    setNotifications([]);
  }
  setIsNotificationsLoading(false);
}

function Topbar({
  toggleSidebar,
  pageTitle,
  setOpenNotification,
  setOpenNotificationDialog,
  usrRole,
  companyID,
  usrName,
  usrPic,
  usrEmail,
  setAllNotifications,
  setUnreadNotificationsCount,
  unreadNotificationsCount,
}) {
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger notifications fetch once the basic details (companyID, etc.) are loaded
    if (companyID) {
      getNotifications(
        companyID,
        usrEmail,
        setIsNotificationsLoading,
        setNotifications,
        setUnreadNotificationsCount,
        setAllNotifications
      );
    }
  }, [companyID]);

  // Toggle notification panel and profile panel
  const toggleNotificationPanel = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const toggleProfilePanel = () => {
    setProfileOpen(!profileOpen);
  };

  useEffect(() => {
    const handleEvent = (event) => {
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleEvent);

    return () => {
      document.removeEventListener("mousedown", handleEvent);
    };
  }, [notificationsOpen, profileOpen]);

  return (
    <div className="topbar">
      <div className="page-details">
        <MenuRoundedIcon className="menu-icon" onClick={toggleSidebar} />
        {usrRole ? (
          <h2 className="page-title">{pageTitle}</h2>
        ) : (
          <Skeleton width={"130px"} height={"55px"} sx={{ ml: "24px" }} />
        )}
      </div>
      <div className="user-details">
        {isNotificationsLoading ? (
          <Skeleton
            variant="square"
            sx={{ width: "22px", height: "22px", mr: "4vw", borderRadius: 1 }}
          />
        ) : (
          <Badge
            badgeContent={unreadNotificationsCount}
            max={99}
            className="notifications-count"
            onClick={toggleNotificationPanel}
          >
            <NotificationsOutlinedIcon />
          </Badge>
        )}
        <div
          ref={notificationsRef}
          className={`notifications-dropdown ${
            notificationsOpen ? "open" : ""
          }`}
        >
          {notifications.length > 0 ? (
            <ul>
              {notifications.map((notification) => (
                <li
                  className={notification.isRead ? "" : "unread"}
                  onClick={() => {
                    setOpenNotification(notification.id);
                    setOpenNotificationDialog(true);
                    toggleNotificationPanel();
                    if (!notification.isRead) {
                      const notis = notifications.find(
                        (n) => n.id === notification.id
                      );
                      if (notis && !notis.isRead) {
                        notis.isRead = true;
                        setNotifications([...notifications]);
                      }
                    }
                  }}
                  key={notification.id}
                >
                  {notification.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-notifications">No notifications available.</p>
          )}
          <Button
            variant="text"
            className="read-all"
            onClick={() => {
              toggleNotificationPanel();
              setOpenNotification(null);
              setOpenNotificationDialog(true);
            }}
            disabled={notifications.length === 0}
          >
            READ ALL
            <KeyboardArrowRightOutlinedIcon />
          </Button>
        </div>
        {!usrRole ? (
          <Skeleton
            variant="circular"
            sx={{ width: "32px", height: "32px", mr: "8px" }}
          >
            <Avatar />
          </Skeleton>
        ) : (
          <Avatar
            alt={usrName}
            src={usrPic}
            className="avatar"
            onClick={toggleProfilePanel}
          >
            {usrPic == null && usrName.charAt(0)}
          </Avatar>
        )}
        {usrName !== null ? (
          <p className="user-name" onClick={toggleProfilePanel}>
            {usrName}
          </p>
        ) : (
          <Skeleton width={"80px"} height={"30px"} />
        )}
        <div
          ref={profileRef}
          className={`profile-dropdown ${profileOpen ? "open" : ""}`}
        >
          <h3 className="profile-name">{usrName}</h3>
          <p className="profile-role">{usrRole}</p>
          <Button
            variant="contained"
            className="profile-btn"
            onClick={() => {
              toggleProfilePanel();
              navigate("/profile");
            }}
          >
            <AccountCircleIcon />
            Profile
          </Button>
          <Button
            variant="outlined"
            className="logout"
            onClick={() => {
              toggleProfilePanel();
              signOutUser()
                .then(() => {
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
        </div>
      </div>
    </div>
  );
}

export default Topbar;
