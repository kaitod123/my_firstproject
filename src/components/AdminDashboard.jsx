// src/components/DocumentManagementSystem.jsx
import React, { useState, useEffect } from 'react';
import { Search, User, Clock, FileText, Download, Filter } from 'lucide-react'; // ลบ LogOut และ Settings ออกเพราะอยู่ใน Header แล้ว
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios'; // 1. Import axios สำหรับยิง request ไปยัง server

import styles from '../styles/adminDashboard.module.css';
// import Header from './Header/Header'; // ไม่ต้อง Import Header ที่นี่แล้ว เพราะ App.jsx จัดการ Header แบบ Global

const  AdminDashboard = () => {
   const [userCounts, setUserCounts] = useState({
    admin: 0,
    advisor: 0,
    student: 0,
  });
 
  // 2. ใช้ useEffect เพื่อดึงข้อมูลและนับจำนวนผู้ใช้ตาม role
  useEffect(() => {
    const fetchUserCounts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users');
        const users = response.data;

        // 3. ใช้วิธี reduce เพื่อนับจำนวนผู้ใช้ในแต่ละ role จากข้อมูลที่ได้มา
        const counts = users.reduce((acc, user) => {
          if (user.role === 'admin') {
            acc.admin += 1;
          } else if (user.role === 'advisor') {
            acc.advisor += 1;
          } else if (user.role === 'student') {
            acc.student += 1;
          }
          return acc;
        }, { admin: 0, advisor: 0, student: 0 }); // ค่าเริ่มต้นสำหรับ accumulator

        setUserCounts(counts); // 4. อัปเดต state ด้วยจำนวนที่นับได้
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลจำนวนผู้ใช้:', error);
      }
    };

    fetchUserCounts();
  }, []);
   return (
    <div className={styles.body}>
      {/* Sidebar */}

      {/* Main Content */}
      <div className={styles.mainContent}>
        <header className={styles.dashboardheader}>
          <h2>Dashboard</h2>
          <div className={styles.userprofile}>
            <span>AdminManagement</span>
            {/* 4. ย้ายปุ่มออกจากระบบมาไว้ใน userprofile */}
            <Link to="/login" className={styles.logoutLink}>
              ออกจากระบบ
            </Link>
          </div>
        </header>

      </div>
      <br />
       <div className={styles.card}>
            <h3>Project Management</h3>
            <ul className={styles.projectlist}>
              
              <li>Project Approved <span className="status"></span></li>
              <li>Project Hide <span className="status"></span></li>
              
              <div className={styles.usercount}>
                <div>
                  <p></p>
                  <Link to = "/deleteDashboard">
                  <button>Manage Project</button>
                  </Link>
                </div>       
              </div>
              
            </ul>
          </div>
      <br />
                <div className={styles.card}>
            <h3>User Management</h3>
            <div className={styles.usercount}>
              <p>จำนวนผู้ใช้:</p>
                <p>Admins: <strong>{userCounts.admin}</strong></p>
                <p>Advisor: <strong>{userCounts.advisor}</strong></p>
                <p>Students: <strong>{userCounts.student}</strong></p>
                <hr style={{margin: '8px 0'}} />
                <p>Total Users: <strong>{userCounts.admin + userCounts.advisor + userCounts.student}</strong></p>

              <Link to = "/UserManagement">
                <button>View All</button>
              </Link>
              
            </div>
          </div>
          <br />
      <footer className={styles.footer}>
                      <p className={styles.footerText}>© 2023 University Project Hub</p>
                      <div className={styles.footerLinks}>
                          <a href="#" className={styles.footerLink}>Contact Us</a>
                          <a href="#" className={styles.footerLink}>Privacy Policy</a>
                      </div>
      </footer>
    </div>
    

    
  );
};
export default AdminDashboard;