import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Button,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { useNavigate } from "react-router-dom";
import { firebaseDb } from "../firebase/baseConfig";
import { getDoc, doc } from "firebase/firestore";

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

async function getMembership(
  companyID,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setIsPageLoading,
  setMembershipDetails
) {
  try {
    setIsPageLoading(true);
    const companyDocRef = doc(firebaseDb, "companies", companyID);
    const compSnap = await getDoc(companyDocRef);
    let membership = {};
    if (compSnap.exists()) {
      // Get Admin and get start date
      for (let key in compSnap.data().employees_brief) {
        if (compSnap.data().employees_brief[key].position === "Administrator") {
          membership.startDate = compSnap.data().employees_brief[key].startDate;
          break;
        }
      }
      membership.subscription = compSnap.data().subscription;
      membership.renewalDate = compSnap.data().renewalDate;
      membership.payments = compSnap.data().payments;
      setMembershipDetails(membership);
    }
    setIsPageLoading(false);
  } catch (e) {
    console.error("[DB] ", e);
    setSnackbarMessage("Something went wrong. Please try again later.");
    setSnackbarSeverity("error");
    setSnackbarOpen(true);
  }
}

function Membership({
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

  const [isPageLoading, setIsPageLoading] = useState(false);
  const [membershipDetails, setMembershipDetails] = useState({});

  useEffect(() => {
    getMembership(
      companyID,
      setSnackbarOpen,
      setSnackbarMessage,
      setSnackbarSeverity,
      setIsPageLoading,
      setMembershipDetails
    );
  }, [companyID]);

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
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              ...tableContainerStyles,
              maxHeight: "50vh",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <i>Start Date</i>
                  </TableCell>
                  <TableCell> {membershipDetails.startDate} </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <i>Current Subscription</i>
                  </TableCell>
                  <TableCell>
                    <b>{membershipDetails.subscription}</b>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <i>Price</i>
                  </TableCell>
                  <TableCell>
                    {membershipDetails.subscription === "Basic"
                      ? "£30.00"
                      : membershipDetails.subscription === "Standard"
                      ? "£50.00"
                      : membershipDetails.subscription === "Premium"
                      ? "£75.00"
                      : "-"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <i>Next Renewal</i>
                  </TableCell>
                  <TableCell> {membershipDetails.renewalDate} </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <i>Total Users Allocated</i>
                  </TableCell>
                  <TableCell>
                    {membershipDetails.subscription === "Basic"
                      ? "6"
                      : membershipDetails.subscription === "Standard"
                      ? "12"
                      : membershipDetails.subscription === "Premium"
                      ? "24"
                      : "-"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box sx={{ marginLeft: "20px" }}>
          <Typography
            variant="p"
            sx={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: "0.85rem",
            }}
          >
            * To upgrade, please contact us at{" "}
            <span style={{ color: "#a378ff" }}>
              support@hrcompliance.wie-solutions.co.uk
            </span>
          </Typography>
        </Box>
      </Box>

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
            Payments
          </Typography>
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
        ) : membershipDetails.payments &&
          membershipDetails.payments.length === 0 ? (
          <Typography color="#a9a9a9" textAlign={"center"} marginTop={4} mb={2}>
            <i>No Payments Found</i>
          </Typography>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ ...tableContainerStyles, maxHeight: "50vh" }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell style={tableHeaderStyles}>Subscription</TableCell>
                  <TableCell style={tableHeaderStyles}>Payment Date</TableCell>
                  <TableCell style={tableHeaderStyles}>Period</TableCell>
                  <TableCell style={tableHeaderStyles}>Amount</TableCell>
                  <TableCell style={tableHeaderStyles}>Invoice</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {membershipDetails.payments &&
                  membershipDetails.payments.map((payment) => (
                    <TableRow key={payment.periodStart + payment.periodEnd}>
                      <TableCell style={tableBodyStyles}>
                        {payment.subscription}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        {payment.paymentDate}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        <i>{payment.periodStart + " - " + payment.periodEnd}</i>
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        £{payment.amount}
                      </TableCell>
                      <TableCell style={tableBodyStyles}>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            backgroundColor: "#74b581",
                            color: "#fff",
                            fontWeight: "500",
                            position: "relative",
                            height: "20px",
                            borderRadius: "10px",
                            "& .MuiButton-startIcon": { margin: "0px" },
                            ":hover": { backgroundColor: "#73a47c" },
                          }}
                          onClick={() => {
                            window.open(payment.invoice, "_blank");
                          }}
                          startIcon={<CloudDownloadIcon />}
                        ></Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </div>
  );
}

export default Membership;
