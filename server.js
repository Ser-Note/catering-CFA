const express = require("express");
const session = require("express-session");
const path = require("path");
require('dotenv').config(); // Load environment variables

// Routers
const loginRoutes = require("./routes/login.js");
const authRoutes = require("./routes/auth.js"); // Password protection
const previousCateringRouter = require("./routes/previousCatering.js"); // optional
const editCateringRouter = require("./routes/previous_catering.js");   // optional
const jsonCateringRouter = require("./routes/jsonCatering.js");         // optional
const fundraiserRouter = require("./routes/fundraiser.js");             // optional
const submitCateringRouter = require("./routes/submitCatering.js");
const ordersRouter = require("./routes/orders.js");
const fetchCateringRouter = require("./routes/fetchCatering.js");
const employeesApi = require("./routes/employeesApi.js");

//Server check



// Middleware
const { requireAuth } = require("./middleware/auth.js");

const app = express();

// Serve static assets

app.use(express.static(path.join(__dirname, "public")));
app.use("/options", express.static(path.join(__dirname, "options")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/data", express.static(path.join(__dirname, "data")));
// Serve the static employees UI
app.use('/employees', express.static(path.join(__dirname, 'add-delete-employees')));

app.get("/create-regular", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "regCreateCatering.html"));
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration with environment variables
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "yourSecretKey-change-this-in-production",
  resave: false,
  saveUninitialized: false, // Don't create session until authenticated
  cookie: {
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24 hours default
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' // Strict same-site policy for better security
  }
};

// Log session configuration in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Session config:', {
    secure: sessionConfig.cookie.secure,
    sameSite: sessionConfig.cookie.sameSite,
    maxAge: sessionConfig.cookie.maxAge
  });
}

app.use(session(sessionConfig));

// Routes - Authentication (no password protection on auth routes)
app.use("/auth", authRoutes);

// Routes - Public (no password protection)
app.use("/", loginRoutes);  // login router for existing user login

// Routes - Protected (require password authentication)
app.use("/catering", requireAuth, previousCateringRouter);       // GET /catering/
app.use("/catering", requireAuth, editCateringRouter); // GET/POST /catering/edit-catering
app.use("/json-catering", requireAuth, jsonCateringRouter); // optional
app.use("/fundraiser", requireAuth, fundraiserRouter);     // optional
app.use("/catering", requireAuth, submitCateringRouter);
app.use("/orders", requireAuth, ordersRouter); // GET /orders - PROTECTED
app.use("/fetch-catering", requireAuth, fetchCateringRouter); // PROTECTED
// API for employees management - PROTECTED
app.use('/api', requireAuth, employeesApi);
// Root redirect to password login (not employee login)
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));
