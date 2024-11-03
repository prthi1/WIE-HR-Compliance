import { useNavigate } from "react-router-dom";

function PageNotFound() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        overflow: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "88%",
          width: "95%",
          alignSelf: "center",
          textAlign: "center",
          backgroundColor: "#fff",
          borderRadius: "20px",
        }}
      >
        <h1 style={{ fontSize: "5.8rem", margin: "0", color: "#f4a322" }}>
          404
        </h1>
        <p
          style={{
            fontSize: "1.4rem",
            marginTop: "12px",
            marginBottom: "0",
          }}
        >
          Page Not Found
        </p>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#a378ff",
            textDecoration: "none",
            cursor: "pointer",
          }}
          onClick={() => navigate(-1)}
        >
          Head Back
        </p>
        <p style={{ fontSize: "0.8rem", marginTop: "18vh" }}>
          <b>
            <a
              href="https://wie-solutions.co.uk"
              style={{ textDecoration: "none", color: "#f4a322" }}
            >
              wie-solutions.co.uk
            </a>
          </b>
          <br /> &copy; {new Date().getFullYear()} All Rights Reserved
        </p>
      </div>
    </div>
  );
}

export default PageNotFound;
