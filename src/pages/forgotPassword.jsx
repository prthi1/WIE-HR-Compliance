import React, { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CssBaseline,
  CircularProgress,
} from "@mui/material";
import { resetPassword } from "../firebase/auth";
import logoUrl from "../../logo-trans.webp";

function ForgotPassword({
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
}) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  function handlePasswordReset() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      setSnackbarMessage("Please enter a valid email.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    resetPassword(email)
      .then(() => {
        setSnackbarMessage("Password reset sent via email.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsLoading(false);
        setEmail("");
      })
      .catch((error) => {
        console.error("[Auth] " + error);
        switch (error.code) {
          case "auth/user-not-found":
            setSnackbarMessage("User not found. Please sign up.");
            break;
          default:
            setSnackbarMessage("An error occurred. Please try again.");
            break;
        }
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        setIsLoading(false);
      });
  }
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          component="img"
          sx={{
            height: 80,
            width: 80,
            margin: 1,
          }}
          alt="logo"
          src={logoUrl}
        />
        <Typography variant="h5" sx={{ fontWeight: "600" }}>
          Password Reset
        </Typography>
        <TextField
          margin="normal"
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          autoFocus
          inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
          InputLabelProps={{
            style: { fontFamily: "'Open Sans', Arial" },
          }}
          value={email || ""}
          onChange={(e) => setEmail(e.target.value)}
          sx={{
            mt: 6,
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
            },
            "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
              border: "2px solid",
              borderColor: "#a378ff",
            },
          }}
        />

        <Button
          type="submit"
          variant="contained"
          onClick={handlePasswordReset}
          disabled={isLoading}
          sx={{
            mt: 3,
            mb: 2,
            marginLeft: "auto",
            marginRight: "auto",
            width: "80%",
            borderRadius: "20px",
            backgroundColor: "#f4a322",
            ":hover": {
              backgroundColor: "#e38f09",
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} sx={{ color: "#fff" }} />
          ) : (
            <>Reset Password</>
          )}
        </Button>
      </Box>
      <Box
        sx={{
          mt: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.83rem",
          fontFamily: "'Open Sans', Arial",
        }}
      >
        <b>
          <a href="/login" style={{ textDecoration: "none", color: "#a378ff" }}>
            Login
          </a>
        </b>
        <Box sx={{ mx: 1 }}>or</Box>
        <b>
          <a
            href="/signup"
            style={{ textDecoration: "none", color: "#a378ff" }}
          >
            Signup
          </a>
        </b>
      </Box>
      <Typography variant="body2" color="#2c3e50" align="center" mt={6}>
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
  );
}

export default ForgotPassword;
