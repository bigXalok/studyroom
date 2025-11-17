const express = require("express");
const { PrismaClient } = require("./generated/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const FRONTEND_URL = process.env.FRONTEND_URL || "*";
app.use(cors({ origin: FRONTEND_URL }));
 
const JWT_SECRET = 'okalok';
const REFRESH_TOKEN_SECRET = 'okalok_refresh'; 


app.post("/users/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

 
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ id: newUser.id, email: newUser.email }, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

  
    await prisma.user.update({ where: { id: newUser.id }, data: { refreshToken } });


    const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email };

    res.status(201).json({ message: "Signup successful", user: safeUser, token, refreshToken });
  } catch (error) {
    console.error("Signup error:", error);
    if (error && error.stack) console.error(error.stack);
    res.status(500).json({ error: error.message || "Error creating user" });
  }
});

// Helpful GET handler so visiting /users/signup in a browser shows a message
app.get('/users/signup', (req, res) => {
  res.status(200).json({ message: 'This endpoint accepts POST requests. Send a POST with {name,email,password} to create a user.' });
});


app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

   
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });


    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.status(200).json({ message: "Login successful", token, refreshToken });
  } catch (error) {
    console.error("Login error:", error);
    if (error && error.stack) console.error(error.stack);
    res.status(500).json({ error: error.message || "Error logging in" });
  }
});



app.post('/token', async (req, res) => {
  const { token: refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
   
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

   
    const newRefreshToken = jwt.sign({ id: user.id, email: user.email }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Refresh token error:', err);
    if (err && err.stack) console.error(err.stack);
    return res.status(401).json({ error: err.message || 'Invalid refresh token' });
  }
});



app.post('/logout', async (req, res) => {
  const { token: refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    
    await prisma.user.update({ where: { id: decoded.id }, data: { refreshToken: null } });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    if (err && err.stack) console.error(err.stack);
    res.json({ message: 'Logged out' });
  }
});


function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(403).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
}


app.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });
    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    if (error && error.stack) console.error(error.stack);
    res.status(500).json({ error: error.message || "Error fetching users" });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
