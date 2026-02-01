import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import SendNotificationPage from "./pages/SendNotificationPage.jsx";
import SentHistoryPage from "./pages/SentHistoryPage.jsx";
import InboxHistoryPage from "./pages/InboxHistoryPage.jsx";
import "./css/app.css";

function RequireMockAuth({ children }) {
  const userId = localStorage.getItem("mockUserId");
  if (!userId) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <RequireMockAuth>
              <Dashboard />
            </RequireMockAuth>
          }
        />

        <Route
          path="/friends"
          element={
            <RequireMockAuth>
              <FriendsPage />
            </RequireMockAuth>
          }
        />

        <Route
          path="/send"
          element={
            <RequireMockAuth>
              <SendNotificationPage />
            </RequireMockAuth>
          }
        />

        <Route
          path="/sent"
          element={
            <RequireMockAuth>
              <SentHistoryPage />
            </RequireMockAuth>
          }
        />

        <Route
          path="/inbox"
          element={
            <RequireMockAuth>
              <InboxHistoryPage />
            </RequireMockAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
