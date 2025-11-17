import { useState, useEffect } from "react";
import "./index.css";
import axios from "axios";

export default function App() {
  const [view, setView] = useState("login"); 
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  // Read API URL from Vite env (set VITE_API_URL in Vercel/Vite), fallback to deployed URL
  const API_URL = import.meta.env.VITE_API_URL || "https://studyroom-50pp.onrender.com";

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response &&
          error.response.status === 401 &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) return Promise.reject(error);
          try {
            const res = await axios.post(`${API_URL}/token`, { token: refreshToken });
            const newAccess = res.data.accessToken || res.data.token;
            const newRefresh = res.data.refreshToken || refreshToken;
            localStorage.setItem("token", newAccess);
            localStorage.setItem("refreshToken", newRefresh);
            originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
            return axios(originalRequest);
          } catch (err) {
            
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            setView("login");
            return Promise.reject(err);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setView("users");
      fetchUsers();
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/users/signup`, form);
      setMessage(res.data.message || "Signup successful!");
      setView("login");
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setMessage(err.response?.data?.error || "Signup failed!");
    }
  };


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/users/login`, {
        email: form.email,
        password: form.password,
      });

      const token = res.data.token;
      const refreshToken = res.data.refreshToken;
      localStorage.setItem("token", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      setMessage("Login successful!");
      setView("users");
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.error || "Login failed!");
    }
  };


  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      setMessage("Failed to fetch users. Please login again.");
      handleLogout();
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setForm({ name: "", email: "", password: "" });
    setUsers([]);
    setView("login");
    setMessage("Logged out successfully!");
  };

  return (
    <div className="container">
      <h1>Study Room</h1>
      {message && <p className="msg">{message}</p>}

      {view === "signup" && (
        <form onSubmit={handleSignup}>
          <h2>Signup</h2>
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Signup</button>
          <p>
            Already have an account?{" "}
            <span className="link" onClick={() => setView("login")}>
              Login
            </span>
          </p>
        </form>
      )}

      {view === "login" && (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <input
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button type="submit">Login</button>
          <p>
            Don’t have an account?{" "}
            <span className="link" onClick={() => setView("signup")}>
              Signup
            </span>
          </p>
        </form>
      )}

      {view === "users" && (
        <div>
          <h2>Users List</h2>
          <button className="logout" onClick={handleLogout}>
            Logout
          </button>
  
        </div>
      )}
    </div>
  );
}
