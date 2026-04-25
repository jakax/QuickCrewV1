import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { AdminGateProvider } from "./providers/AdminGate";
import Login from "./screens/Login";
import Dashboard from "./screens/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import UsersApprovalsScreen from "./features/users/UsersApprovalsScreen";
import AppLayout from "./layout/AppLayout";
import WorkersScreen from "./features/users/WorkersScreen";
import EmployersScreen from "./features/users/EmployersScreen";
import SkillsCatalogScreen from "./features/catalog/SkillsCatalogScreen";
import RoleRatesCatalogScreen from "./features/catalog/RoleRatesCatalogScreen";
import OrganizationsListScreen from "./features/orgs/OrganizationsListScreen";
import OrganizationDetailScreen from "./features/orgs/OrganizationDetailScreen";
import { PromptProvider } from "./providers/PromptProvider";
import ShiftsScreen from "./features/shifts/ShiftsScreen";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminGateProvider>
          <PromptProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />

                {/* Users */}
                <Route path="users/workers" element={<WorkersScreen />} />
                <Route path="users/employers" element={<EmployersScreen />} />
                <Route path="users/approvals" element={<UsersApprovalsScreen />} />

                {/* Catalog */}
                <Route path="catalog/skills" element={<SkillsCatalogScreen />} />
                <Route path="catalog/role-rates" element={<RoleRatesCatalogScreen />} />

                {/* Organizations */}
                <Route path="organizations" element={<OrganizationsListScreen />} />
                <Route path="organizations/:orgId" element={<OrganizationDetailScreen />} />

                {/* Shifts */}
                <Route path="shifts" element={<ShiftsScreen />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PromptProvider>
        </AdminGateProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}