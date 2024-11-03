import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
} from "@mui/material";
import Groups2Icon from "@mui/icons-material/Groups2";
import Groups3Icon from "@mui/icons-material/Groups3";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import ArticleIcon from "@mui/icons-material/Article";
import CampaignIcon from "@mui/icons-material/Campaign";
import AssignmentIcon from "@mui/icons-material/Assignment";
import RateReviewIcon from "@mui/icons-material/RateReview";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { firebaseDb } from "../firebase/baseConfig";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  limit,
  query,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const isMobile = window.innerWidth < 600;
const isTablet = window.innerWidth < 946;

const cardStyle = {
  borderRadius: "20px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  minHeight: isMobile ? "15vh" : "22vh",
};

const cardTitleStyle = {
  fontSize: "1.3rem",
  fontFamily: "'Roboto', sans-serif",
  color: "#000000ac",
};

const cardIcoContainerStyle = {
  height: "34px",
  width: "34px",
  backgroundColor: "#f5f5f5",
  borderRadius: "10px",
  marginRight: "10px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardValStyle = {
  fontFamily: "'Open Sans', Arial",
  fontWeight: "bold",
  color: "#000000",
  marginLeft: "10px",
};

const cardDescStyle = {
  fontFamily: "'Roboto', sans-serif",
  marginTop: "8px",
  fontWeight: "400",
  color: "#a378ff",
  fontSize: "0.95rem",
};

const boxStyles = {
  minHeight: 165,
  maxHeight: "32vh",
  overflow: "auto",
  "&::-webkit-scrollbar": {
    width: "0.4em",
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

const empNameBoxStyles = {
  overflow: "auto",
  maxHeight: "14vh",
  "&::-webkit-scrollbar": {
    width: "0.2em",
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

async function getPeople(companyID, setPeople) {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const today = new Date();
  const todayNoTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const docRef = doc(firebaseDb, "companies", companyID);
  const docSnap = await getDoc(docRef);
  const allEmployees = docSnap.data().employees_brief;
  let totEmployees = Object.values(allEmployees);
  let totSponsoredEmployees = 0;
  let sponsoredEmployeeNames = [];
  let passportExpiryNames = [];
  let visaExpiryNames = [];
  let cosExpiryNames = [];
  let rtwExpiryNames = [];

  for (const [key, value] of Object.entries(allEmployees)) {
    // Check if employee is sponsored
    if (value.isSponsored) {
      totSponsoredEmployees++;
      sponsoredEmployeeNames.push(value);
    }
    // Check passport expiry date
    if (value.passportExpiry) {
      const [day, month, year] = value.passportExpiry.split("-").map(Number);
      const passportExpiryDate = new Date(year, month - 1, day);

      if (passportExpiryDate <= oneYearFromNow) {
        const timeDifference = passportExpiryDate - new Date();
        const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        value.passportExpiryRemaining = daysRemaining;
        passportExpiryNames.push(value);
      }
    }
    // Check visa expiry date
    if (value.visaExpiry) {
      const [day, month, year] = value.visaExpiry.split("-").map(Number);
      const visaExpiryDate = new Date(year, month - 1, day);

      if (visaExpiryDate <= oneYearFromNow) {
        const timeDifference = visaExpiryDate - new Date();
        const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        value.visaExpiryRemaining = daysRemaining;
        visaExpiryNames.push(value);
      }
    }
    // Check cos expiry date
    if (value.cosExpiry) {
      const [day, month, year] = value.cosExpiry.split("-").map(Number);
      const cosExpiryDate = new Date(year, month - 1, day);

      if (cosExpiryDate <= oneYearFromNow) {
        const timeDifference = cosExpiryDate - new Date();
        const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        value.cosExpiryRemaining = daysRemaining;
        cosExpiryNames.push(value);
      }
    }
    // Check rtw expiry date
    if (value.rtwExpiry) {
      const [day, month, year] = value.rtwExpiry.split("-").map(Number);
      const rtwExpiryDate = new Date(year, month - 1, day);

      if (rtwExpiryDate <= oneYearFromNow) {
        const timeDifference = rtwExpiryDate - new Date();
        const daysRemaining = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        value.rtwExpiryRemaining = daysRemaining;
        rtwExpiryNames.push(value);
      }
    }
  }
  setPeople({
    totEmployees: totEmployees,
    totSponsoredEmployees: sponsoredEmployeeNames,
    passportExpiryPeople: passportExpiryNames,
    visaExpiryPeople: visaExpiryNames,
    cosExpiryPeople: cosExpiryNames,
    rtwExpiryPeople: rtwExpiryNames,
  });
}

async function getAnnouncements(companyID, setAnnouncements) {
  const announcementsColRef = collection(
    firebaseDb,
    "companies",
    companyID,
    "announcements"
  );
  let announcementsQuery = query(
    announcementsColRef,
    limit(10),
    orderBy("deleteTime", "desc")
  );
  const announcementsSnapshot = await getDocs(announcementsQuery);
  if (!announcementsSnapshot.empty) {
    const announcements = [];
    announcementsSnapshot.forEach((doc) => {
      announcements.push(doc.data());
    });
    setAnnouncements(announcements);
  }
}

async function getTasks(companyID, setTasks) {
  const tasksColRef = collection(firebaseDb, "companies", companyID, "tasks");
  let tasksQuery = query(tasksColRef, orderBy("deleteTime", "desc"), limit(10));
  const tasksSnapshot = await getDocs(tasksQuery);
  if (!tasksSnapshot.empty) {
    const tasks = [];
    tasksSnapshot.forEach((doc) => {
      tasks.push(doc.data());
    });
    setTasks(tasks);
  }
}

async function getLeaves(companyID, setLeave) {
  const leavesColRef = collection(firebaseDb, `companies/${companyID}/leaves`);
  const leavesQuery = query(leavesColRef, limit(10));
  const leavesSnapshot = await getDocs(leavesQuery);
  if (!leavesSnapshot.empty) {
    const leaves = [];
    leavesSnapshot.forEach((doc) => {
      const leavesData = doc.data().leavesData;
      if (leavesData && leavesData.length > 0) {
        leavesData.forEach((leave) => {
          if (leave.status != "Pending") {
            const thisLeave = {
              name: doc.data().name,
              type: leave.type,
              reason: leave.reason,
              startDate: leave.startsOn,
            };
            leaves.push(thisLeave);
          }
        });
      }
    });
    setLeave(leaves);
  }
}

function Dashboard({ companyID }) {
  const navigate = useNavigate();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [people, setPeople] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leave, setLeave] = useState([]);
  useEffect(() => {
    setIsPageLoading(true);
    Promise.all([
      getPeople(companyID, setPeople),
      getAnnouncements(companyID, setAnnouncements),
      getTasks(companyID, setTasks),
      getLeaves(companyID, setLeave),
    ]).finally(() => setIsPageLoading(false));
  }, [companyID]);

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: 2,
        overflow: "auto",
        height: isMobile ? "90%" : isTablet ? "93%" : "89%",
      }}
    >
      <Grid container rowSpacing={2} columnSpacing={3}>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  EMPLOYEES
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <Groups2Icon style={{ color: "#f3797e" }}></Groups2Icon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.totEmployees.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.totEmployees.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              noWrap={false}
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              • {employee.name}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>
                Total Active Employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  SPONSORED EMPLOYEES
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <Groups3Icon style={{ color: "#f3797e" }}></Groups3Icon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.totSponsoredEmployees.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.totSponsoredEmployees.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              noWrap={false}
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              • {employee.name}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>
                Total Sponsored Employees
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  PASSPORT EXPIRY
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <BrandingWatermarkIcon
                    style={{ color: "#f3797e" }}
                  ></BrandingWatermarkIcon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.passportExpiryPeople.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.passportExpiryPeople.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                            >
                              <Typography
                                noWrap={false}
                                variant="body1"
                                fontSize={14}
                                fontWeight={400}
                                fontFamily="'Open Sans', Arial"
                                paddingLeft={1}
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                • {employee.name} (
                                <i>
                                  {employee.passportExpiryRemaining < 0
                                    ? `expired ${Math.abs(
                                        employee.passportExpiryRemaining
                                      )} days ago`
                                    : `${employee.passportExpiryRemaining} days remaining`}
                                </i>
                                )
                              </Typography>
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>1 year & below</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  VISA EXPIRY
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <ArticleIcon style={{ color: "#f3797e" }}></ArticleIcon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.visaExpiryPeople.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.visaExpiryPeople.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                            >
                              <Typography
                                noWrap={false}
                                variant="body1"
                                fontSize={14}
                                fontWeight={400}
                                fontFamily="'Open Sans', Arial"
                                paddingLeft={1}
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                • {employee.name} (
                                <i>
                                  {employee.visaExpiryRemaining < 0
                                    ? `expired ${Math.abs(
                                        employee.visaExpiryRemaining
                                      )} days ago`
                                    : `${employee.visaExpiryRemaining} days remaining`}
                                </i>
                                )
                              </Typography>
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>1 year & below</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  COS EXPIRY
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <ArticleIcon style={{ color: "#f3797e" }}></ArticleIcon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.cosExpiryPeople.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.cosExpiryPeople.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                            >
                              <Typography
                                noWrap={false}
                                variant="body1"
                                fontSize={14}
                                fontWeight={400}
                                fontFamily="'Open Sans', Arial"
                                paddingLeft={1}
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                • {employee.name} (
                                <i>
                                  {employee.cosExpiryRemaining < 0
                                    ? `expired ${Math.abs(
                                        employee.cosExpiryRemaining
                                      )} days ago`
                                    : `${employee.cosExpiryRemaining} days remaining`}
                                </i>
                                )
                              </Typography>
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>1 year & below</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card style={cardStyle}>
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6" style={cardTitleStyle}>
                  RTW EXPIRY
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <ArticleIcon style={{ color: "#f3797e" }}></ArticleIcon>
                </div>
              </div>
              <Typography variant="h4" style={cardValStyle}>
                {isPageLoading ? (
                  <Skeleton width={50} />
                ) : (
                  <Box>
                    <Box
                      sx={{ cursor: "pointer", display: "inline" }}
                      onClick={() => navigate("/employees")}
                    >
                      {people.rtwExpiryPeople.length}
                    </Box>
                    <Box sx={empNameBoxStyles}>
                      <List dense={true}>
                        {people.rtwExpiryPeople.map((employee) => (
                          <ListItem key={employee.email} disablePadding>
                            <Typography
                              variant="subtitle2"
                              fontSize={14}
                              fontWeight={400}
                              fontFamily={"'Open Sans', Arial"}
                              paddingLeft={1}
                            >
                              <Typography
                                noWrap={false}
                                variant="body1"
                                fontSize={14}
                                fontWeight={400}
                                fontFamily="'Open Sans', Arial"
                                paddingLeft={1}
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                • {employee.name} (
                                <i>
                                  {employee.rtwExpiryRemaining < 0
                                    ? `expired ${Math.abs(
                                        employee.rtwExpiryRemaining
                                      )} days ago`
                                    : `${employee.rtwExpiryRemaining} days remaining`}
                                </i>
                                )
                              </Typography>
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </Box>
                )}
              </Typography>
              <Typography style={cardDescStyle}>1 year & below</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card
            style={{
              ...cardStyle,
              backgroundColor: "#7978e9",
              minHeight: isMobile ? "inherit" : "45vh",
            }}
          >
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  variant="h6"
                  style={{ ...cardTitleStyle, color: "#fff" }}
                >
                  Announcements
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <CampaignIcon style={{ color: "#7da0fa" }}></CampaignIcon>
                </div>
              </div>
              <Box sx={boxStyles}>
                {isPageLoading ? (
                  <List>
                    {Array.from(new Array(3)).map((_, index) => (
                      <ListItem key={index}>
                        <Skeleton variant="rounded" width="100%" height={45} />
                      </ListItem>
                    ))}
                  </List>
                ) : announcements.length === 0 ? (
                  <Typography color="#fff" textAlign={"center"} marginTop={14}>
                    <i>No Announcements Found</i>
                  </Typography>
                ) : (
                  <List>
                    {announcements.map((announcement, index) => (
                      <ListItem key={index}>
                        <Typography color="#fff">
                          <b>{announcement.publishTo}</b> - {announcement.title}
                          <i> ({announcement.publishDate})</i>
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card
            style={{
              ...cardStyle,
              backgroundColor: "#74b581",
              minHeight: isMobile ? "inherit" : "45vh",
            }}
          >
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  variant="h6"
                  style={{ ...cardTitleStyle, color: "#fff" }}
                >
                  Tasks
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <AssignmentIcon style={{ color: "#E05959" }}></AssignmentIcon>
                </div>
              </div>
              <Box sx={boxStyles}>
                {isPageLoading ? (
                  <List>
                    {Array.from(new Array(3)).map((_, index) => (
                      <ListItem key={index}>
                        <Skeleton variant="rounded" width="100%" height={45} />
                      </ListItem>
                    ))}
                  </List>
                ) : tasks.length === 0 ? (
                  <Typography color="#fff" textAlign={"center"} marginTop={14}>
                    <i>No Tasks Found</i>
                  </Typography>
                ) : (
                  <List>
                    {tasks.map((task, index) => (
                      <ListItem key={index}>
                        <Typography color="#fff">
                          <b>{task.assignee}</b> - {task.name}
                          <i> ({task.startDate})</i>
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card
            style={{
              ...cardStyle,
              backgroundColor: "#f3887c",
              minHeight: isMobile ? "inherit" : "45vh",
            }}
          >
            <CardContent>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography
                  variant="h6"
                  style={{ ...cardTitleStyle, color: "#fff" }}
                >
                  Leave
                </Typography>
                <div style={cardIcoContainerStyle}>
                  <RateReviewIcon style={{ color: "#7da0fa" }}></RateReviewIcon>
                </div>
              </div>
              <Box sx={boxStyles}>
                {isPageLoading ? (
                  <List>
                    {Array.from(new Array(3)).map((_, index) => (
                      <ListItem key={index}>
                        <Skeleton variant="rounded" width="100%" height={45} />
                      </ListItem>
                    ))}
                  </List>
                ) : leave.length === 0 ? (
                  <Typography color="#fff" textAlign={"center"} marginTop={14}>
                    <i>No Leave Found</i>
                  </Typography>
                ) : (
                  <List>
                    {leave.map((l, index) => (
                      <ListItem key={index}>
                        <Typography color="#fff">
                          <b>{l.name}</b> - {l.type}: {l.reason}
                          <i> ({l.startDate})</i>
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
