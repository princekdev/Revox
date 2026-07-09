import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { loadUser } from "./redux/slices/authSlice.js";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import Spinner from "./components/common/Spinner.jsx";

const ProtectedRoute = ({ children }) => {
  const { token, user, loading } = useSelector((s) => s.auth);
  if (loading) return <Spinner />;
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const { token, user } = useSelector((s) => s.auth);
  if (token && user) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) dispatch(loadUser());
  }, [token, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<AuthRoute><LoginPage /></AuthRoute>}
        />
        <Route
          path="/register"
          element={<AuthRoute><RegisterPage /></AuthRoute>}
        />
        <Route
          path="/"
          element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="bottom-right"
        theme="dark"
        autoClose={3000}
        hideProgressBar
        toastStyle={{ background: "#232635", color: "#fff", borderRadius: "12px" }}
      />
    </BrowserRouter>
  );
}
