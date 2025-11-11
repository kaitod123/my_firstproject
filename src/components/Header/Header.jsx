// src/components/Header/Header.jsx
import React, { useState, useEffect } from 'react';
import { Search, LogOut, Settings, User, Upload } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';

// (เพิ่ม) ฟังก์ชันสำหรับสร้างตัวย่อ
const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '??';
  const firstInitial = firstName?.[0] || '';
  const lastInitial = lastName?.[0] || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

function Header() {
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  // (เพิ่ม) State สำหรับเก็บตัวย่อชื่อ
  const [userInitials, setUserInitials] = useState(null);

  useEffect(() => {
    // (แก้ไข) ดึงข้อมูล user และสร้างตัวย่อ
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    
    setIsLoggedIn(!!user);

    if (user) {
      // สร้างตัวย่อจาก first_name และ last_name
      const initials = getInitials(user.first_name, user.last_name);
      setUserInitials(initials);
    } else {
      setUserInitials(null); // เคลียร์ค่าเมื่อ logout
    }

  }, [location]); // Re-run this check every time the URL changes

  const toggleMenu = () => {
    setShowMenu(!showMenu);
    setShowProfileMenu(false);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowMenu(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserInitials(null); // (เพิ่ม) เคลียร์ตัวย่อเมื่อ logout
    console.log("Logging out...");
    navigate('/login');
    setShowProfileMenu(false);
  };

  const handleEditProfile = () => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const user = JSON.parse(loggedInUser);
      if (user && user.id) {
        navigate(`/profile/edit/${user.id}`);
      } else {
        console.error("User ID not found in localStorage.");
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
    setShowProfileMenu(false);
  };
  
  const handleLogin = () => {
    navigate('/login');
  };

  const handleAdmin =() =>{
if (userRole === 'admin') {
      navigate('/AdminDashboard');
    } else {
      navigate('/');
    }
    // (ลบปีกกาที่เกินมาตรงนี้ และลบ '};' ที่บรรทัด 90 ทิ้ง)
  };
  return (
    <header className={styles.navbar}> {/* ใช้ class name จาก CSS module */}
      {/* ฝั่งซ้าย: ปุ่มเมนู Hamburger และปุ่มนำทางหลัก */}
      <div className={styles.navLeft}>
            <button onClick={() => navigate('/')} className={styles.navButton}>หน้าหลัก</button>
            <button onClick={() => navigate('/Ufinal1')} className={styles.navButton}>อัพโหลดเอกสาร</button>
            <button onClick={() => navigate('/documents')} className={styles.navButton}>ดาวน์โหลดเอกสาร</button>
            <button onClick={(handleAdmin)} className={styles.navButton}></button>

      </div>

      {/* ฝั่งขวา: ค้นหา + User Icon และเมนูโปรไฟล์ */}
      <div className={styles.navRight}>

        {/* (แก้ไข) ตรวจสอบว่า Login หรือยัง */}
        {isLoggedIn ? (
          <>
            {/* (แก้ไข) แสดงตัวย่อชื่อแทนรูปภาพ */}
            <div 
              className={styles.profileAvatar} // (ใช้คลาสใหม่)
              onClick={toggleProfileMenu}
            >
              {userInitials || '??'}
            </div>

            {showProfileMenu && ( // เงื่อนไขการแสดงเมนูโปรไฟล์
              <div className={styles.profileMenuDropdown}> {/* ใช้ className แทน inline style */}
                <button
                  onClick={handleEditProfile}
                  className={styles.profileMenuButton}
                >
                  <Settings size={18} /> แก้ไขโปรไฟล์
                </button>
                <button
                  onClick={handleLogout}
                  className={`${styles.profileMenuButton} ${styles.logoutButton}`}
                >
                  <LogOut size={18} /> ออกจากระบบ
                </button>
              </div>
            )}
          </>
        ) : (
          // (เพิ่ม) ถ้ายังไม่ Login ให้แสดงปุ่ม Login
          <button onClick={handleLogin} className={styles.navButton}>
            Login
          </button>
        )}

      </div>
    </header>
  );
};
export default Header;

