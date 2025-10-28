// src/components/LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from "../styles/LoginForm.module.css";

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError(''); // ล้างข้อผิดพลาดเก่า

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, { // *** แก้ไข URL และ Endpoint ให้ถูกต้อง ***
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password}),
      });

      const data = await response.json();

     if (response.ok) { // หากการล็อกอินสำเร็จ (HTTP status 2xx)
        
        // *** แก้ไข: เข้าถึง role จาก data.user.role ***
        const userRole = data.user.role; 
        // เก็บข้อมูลผู้ใช้ไว้ใน localStorage หรือ Context API
        localStorage.setItem('user', JSON.stringify(data.user)); 
        
        // สร้างเงื่อนไขเพื่อนำทางตาม role
        if (userRole === 'admin') {
          // ถ้าเป็น admin ให้ไปหน้า Admin Dashboard (ใช้ /documents)
          navigate('/AdminDashboard'); // เปลี่ยนเส้นทางไปยังหน้า Admin Dashboard
        } else if (userRole === 'student') {
          // ถ้าเป็น student ให้ไปหน้า Student Dashboard (หน้าใหม่ที่ต้องสร้าง)
          navigate('/'); // เปลี่ยนเส้นทางไปยังหน้าเอกสาร
        }else if(userRole == 'advisor'){
          navigate('/')
        } else {
          // กรณี role ไม่ตรงกับเงื่อนไขที่กำหนด
          alert('Role ไม่ถูกต้อง');
          setError('Role ไม่ถูกต้อง');
        }

      } else {
        // กรณีล็อกอินไม่สำเร็จ (เช่น รหัสผ่านผิด)
        setError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); 
    }
  };


  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>เข้าสู่ระบบ</h2>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.inputGroup}>
          <label htmlFor="username">ชื่อผู้ใช้:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.inputField}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">รหัสผ่าน:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.inputField}
            required
          />
        </div>
        <button type="submit" className={styles.loginButton}>
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
};

export default LoginForm;