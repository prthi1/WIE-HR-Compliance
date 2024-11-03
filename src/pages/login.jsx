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
import { signIn } from "../firebase/auth";
import { useNavigate } from "react-router-dom";
import logoUrl from "../../logo-trans.webp";

function Login({ setSnackbarOpen, setSnackbarMessage, setSnackbarSeverity }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  function handleSignIn() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      setSnackbarMessage("Please enter a valid email.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!password || password.length < 6) {
      setSnackbarMessage("Password must be at least 6 characters.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setIsLoading(true);
    signIn(email, password)
      .then((user) => {
        setSnackbarMessage("Logged in successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setIsLoading(false);
        navigate("/");
      })
      .catch((error) => {
        console.error("[Auth] " + error.code);
        switch (error.code) {
          case "auth/user-not-found":
            setSnackbarMessage("User not found. Please sign up.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            break;
          case "auth/invalid-credential":
            setSnackbarMessage("Invalid credentials. Please try again.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            break;
          case "auth/wrong-password":
            setSnackbarMessage("Wrong password. Please try again.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            break;
          default:
            setSnackbarMessage("Something went wrong. Please try again.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            break;
        }
        setIsLoading(false);
      });
  }
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 7,
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
          Sign in
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
        <TextField
          margin="normal"
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          inputProps={{ style: { fontFamily: "'Open Sans', Arial" } }}
          InputLabelProps={{
            style: { fontFamily: "'Open Sans', Arial" },
          }}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSignIn();
            }
          }}
          sx={{
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
          onClick={handleSignIn}
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
            <>Sign In</>
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
          <a
            href="/signup"
            style={{ textDecoration: "none", color: "#a378ff" }}
          >
            Signup
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

export default Login;
