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
const dashboardApi = require("./routes/dashboard.js");

//Server check



// Middleware
const { requireAuth } = require("./middleware/auth.js");
const { requireServerlessAuth } = require("./middleware/serverless-auth.js");

const app = express();

// Trust proxy headers (required for Vercel/serverless deployments)
app.set('trust proxy', 1);

// Serve static assets

app.use(express.static(path.join(__dirname, "public")));
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

// Cookie parsing (needed for serverless auth)
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Session configuration with environment variables
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "yourSecretKey-change-this-in-production",
  resave: true, // Force session save for serverless
  saveUninitialized: true, // Create session immediately for serverless
  name: 'catering.sid', // Explicit session cookie name
  cookie: {
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24 hours default
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict' // More permissive in prod
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
app.use("/catering", requireServerlessAuth, previousCateringRouter);       // GET /catering/
app.use("/catering", requireServerlessAuth, editCateringRouter); // GET/POST /catering/edit-catering
app.use("/json-catering", requireServerlessAuth, jsonCateringRouter); // optional
app.use("/fundraiser", requireServerlessAuth, fundraiserRouter);     // optional
app.use("/catering", requireServerlessAuth, submitCateringRouter);
app.use("/orders", requireServerlessAuth, ordersRouter); // GET /orders - PROTECTED
app.use("/fetch-catering", requireServerlessAuth, fetchCateringRouter); // PROTECTED
// API for employees management - PROTECTED
app.use('/api', requireServerlessAuth, employeesApi);
// Dashboard API - PROTECTED
app.use('/api/dashboard', requireServerlessAuth, dashboardApi);

// Dashboard HTML - PROTECTED
app.get("/dashboard", requireServerlessAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Root redirect to password login (not employee login)
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));
