import React, { useState, useEffect, useRef } from "react";
import "./sidebar.css";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CardMembershipOutlinedIcon from "@mui/icons-material/CardMembershipOutlined";
import { Link, useLocation } from "react-router-dom";
import { Skeleton } from "@mui/material";
const linkStyles = {
  textDecoration: "inherit",
  color: "inherit",
  display: "inherit",
  alignItems: "inherit",
  width: "100%",
  height: "100%",
};

const iconStyles = { fontSize: 22, marginRight: 14, marginLeft: 14 };

function Sidebar({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  isAdmin,
  companyName,
}) {
  const location = useLocation();
  const [activeNavItem, setActiveNavItem] = useState(location.pathname);
  useEffect(() => {
    setActiveNavItem(location.pathname);
  }, [location]);

  const handleNavItemClick = (navItem) => {
    setActiveNavItem(navItem);
    //Close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      {companyName ? (
        <h1 className="title">{companyName}</h1>
      ) : (
        <Skeleton width={"85%"} height={"55px"} sx={{ margin: "auto" }} />
      )}

      <ul className="list">
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          isAdmin && (
            <li
              className={activeNavItem === "/" ? "active" : ""}
              onClick={() => {
                handleNavItemClick("/");
              }}
            >
              <Link to="/" style={linkStyles}>
                <DashboardOutlinedIcon style={iconStyles} />
                Dashboard
              </Link>
            </li>
          )
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          isAdmin && (
            <li
              className={activeNavItem === "/employees" ? "active" : ""}
              onClick={() => handleNavItemClick("/employees")}
            >
              <Link to="/employees" style={linkStyles}>
                <PeopleOutlinedIcon style={iconStyles} />
                Employees
              </Link>
            </li>
          )
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          <li
            className={activeNavItem === "/timesheet" ? "active" : ""}
            onClick={() => handleNavItemClick("/timesheet")}
          >
            <Link to="/timesheet" style={linkStyles}>
              <EventNoteOutlinedIcon style={iconStyles} />
              Timesheet
            </Link>
          </li>
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          <li
            className={activeNavItem === "/announcements" ? "active" : ""}
            onClick={() => handleNavItemClick("/announcements")}
          >
            <Link to="/announcements" style={linkStyles}>
              <CampaignOutlinedIcon style={iconStyles} />
              Announcements
            </Link>
          </li>
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          <li
            className={activeNavItem === "/payslips" ? "active" : ""}
            onClick={() => handleNavItemClick("/payslips")}
          >
            <Link to="/payslips" style={linkStyles}>
              <PaymentsOutlinedIcon style={iconStyles} />
              Payslips
            </Link>
          </li>
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          <li
            className={activeNavItem === "/tasks" ? "active" : ""}
            onClick={() => handleNavItemClick("/tasks")}
          >
            <Link to="/tasks" style={linkStyles}>
              <AssignmentOutlinedIcon style={iconStyles} />
              Tasks
            </Link>
          </li>
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          <li
            className={activeNavItem === "/leave" ? "active" : ""}
            onClick={() => handleNavItemClick("/leave")}
          >
            <Link to="/leave" style={linkStyles}>
              <RateReviewOutlinedIcon style={iconStyles} />
              Leave
            </Link>
          </li>
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          isAdmin && (
            <li
              className={activeNavItem === "/settings" ? "active" : ""}
              onClick={() => handleNavItemClick("/settings")}
            >
              <Link to="/settings" style={linkStyles}>
                <SettingsOutlinedIcon style={iconStyles} />
                Settings
              </Link>
            </li>
          )
        )}
        {!companyName ? (
          <Skeleton
            height={"60px"}
            sx={{ mb: "-10px", mr: "10px", ml: "10px", borderRadius: "12px" }}
          />
        ) : (
          isAdmin && (
            <li
              className={activeNavItem === "/membership" ? "active" : ""}
              onClick={() => handleNavItemClick("/membership")}
            >
              <Link to="/membership" style={linkStyles}>
                <CardMembershipOutlinedIcon style={iconStyles} />
                Membership
              </Link>
            </li>
          )
        )}
      </ul>
      <p className="copyright">
        <b>
          <a href="https://wie-solutions.co.uk" style={{ textDecoration: "none", color: "#f4a322" }}>
            wie-solutions.co.uk
          </a>
        </b>
        <br /> &copy; {new Date().getFullYear()} All Rights Reserved
      </p>
    </div>
  );
}

export default Sidebar;
