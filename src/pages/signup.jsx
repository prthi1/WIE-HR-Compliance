import React from "react";
import { Container, Typography, Box } from "@mui/material";
import logoUrl from "../../logo-trans.webp";

function Signup() {
  return (
    <div style={{ overflow: "auto", height: "100%" }}>
      <Container component="main" maxWidth="xs">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="50vh"
        >
          <Box
            component="img"
            sx={{
              height: 80,
              width: 80,
              margin: 1,
              marginBottom: 2,
            }}
            alt="logo"
            src={logoUrl}
          />

          <Typography variant="h4" gutterBottom sx={{ fontWeight: "500" }}>
            Need an account?
          </Typography>
          <Typography
            variant="body1"
            sx={{ fontFamily: "'Open Sans', Arial", textAlign: "center" }}
          >
            Reach out to us, and we’ll set you up in no time!
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: "0.8rem",
              fontStyle: "italic",
              mt: 1,
              color: "#a378ff",
            }}
          >
            support@hrcompliance.wie-solutions.co.uk
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.83rem",
            fontFamily: "'Open Sans', Arial",
            mt: 4,
          }}
        >
          <b>
            <a
              href="/login"
              style={{ textDecoration: "none", color: "#a378ff" }}
            >
              Login
            </a>
          </b>
          <Box sx={{ mx: 1 }}>or</Box>
          <b>
            <a
              href="/forgot-password"
              style={{ textDecoration: "none", color: "#a378ff" }}
            >
              Forgot Password?
            </a>
          </b>
        </Box>
        <Typography variant="body2" color="#2c3e50" align="center" mt={4}>
          <b>
            <a
              href="https://wie-solutions.co.uk"
              style={{ textDecoration: "none", color: "#f4a322" }}
            >
              wie-solutions.co.uk
            </a>
          </b>
          <br /> &copy; {new Date().getFullYear()} All Rights Reserved
        </Typography>
      </Container>
    </div>
  );
}

export default Signup;
