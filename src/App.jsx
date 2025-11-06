// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import LoginForm from './components/loginform';
import DocumentManagementSystem from './components/DocumentManagementSystem';
import DocumentDetails from './components/DocumentDetails';
import UserProfileEdit from './components/UserProfileEdit';
import Header from './components/Header/Header';
import HomePage from './HomePage';
import Ufinal1 from './components/Ufinal';
import AdminDashboard from './components/AdminDashboard';// Import AdminDashboard component
import DeleteDashboard from './components/DeleteDashboard';
import UserManagement from './components/UserManagement'; // Import UserManagement component
import ApprovalDashboard from './components/ApprovalDashboard'; // Import ApprovalDashboard component
import ProjectStatus from './components/ProjectStatus'; // Import ProjectStatus component
import EditProject from './components/EditProject';
import EditProfilePage from './components/EditProfilePage'; // Import EditProfilePage component
import StudentDocumentDetails from './components/StudentDocumentDetails';
import ProfessorDocumentDetails from './components/ProfessorDocumentDetails';

// ตอนเรียก ค่อยใส่ Endpoint

// คอมโพเนนต์ Layout หลักที่จะมี Header อยู่ด้านบน
const MainLayout = () => {
  return (
    // ทำให้ MainLayout เป็น flex container ที่สูงเต็ม viewport
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header /> {/* Render Header component here */}
      {/* Outlet จะรับผิดชอบการ Render เนื้อหาของหน้า และให้มันขยายตัวเต็มพื้นที่ว่าง */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Route สำหรับหน้า Login (ไม่มี Header) */}
        <Route path="/login" element={<LoginForm />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/DeleteDashboard" element={<DeleteDashboard  />} />
          <Route path="/UserManagement" element={<UserManagement />} />
          <Route path="/Approval-dashboard" element={<ApprovalDashboard />} />
        {/* Route หลักที่ใช้ MainLayout (หน้าที่มี Header) */}
        <Route element={<MainLayout />}>
          {/* HomePage เป็นหน้าแรกที่มี Header */}
          <Route path="/" element={<HomePage />} />
          {/* Route สำหรับหน้าแสดงรายการเอกสารทั้งหมด */}
          <Route path="/documents" element={<DocumentManagementSystem />} />
          {/* Route สำหรับหน้าแสดงรายละเอียดเอกสารแต่ละรายการ */}
          <Route path="/documents/:documentId" element={<DocumentDetails />} />
          {/* Route สำหรับหน้าอัปโหลด */}
          <Route path="/profile/edit/:id" element={<UserProfileEdit />} />
          <Route path="/ufinal1" element={<Ufinal1 />} />
          <Route path="/ProjectStatus" element={<ProjectStatus />} />
          <Route path="/edit-project/:id" element={<EditProject />} />
          <Route path="/edit-profile/:id" element={<EditProfilePage />} />
          <Route path="/student/documents/:documentId" element={<StudentDocumentDetails />} />
          <Route path="/professor/documents/:documentId" element={<ProfessorDocumentDetails />} />
        </Route>

        {/* Optional: Not Found Page */}
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </Router>
  );
};

export default App;