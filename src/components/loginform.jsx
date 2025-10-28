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
    setError('');

    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password}),
          });

      const data = await response.json();

      // !!! IMPORTANT CHECK !!!
      if (response.ok) { 
        // --- Only access data.user if login was successful ---
        alert('Login สำเร็จ!');
        const userRole = data.user.role; 
        localStorage.setItem('user', JSON.stringify(data.user)); 
        
        // Navigation logic...
        if (userRole === 'admin') {
          navigate('/AdminDashboard'); 
        } else if (userRole === 'student' || userRole === 'advisor') { // Combine student & advisor
          navigate('/'); 
        } else {
          setError('Role ไม่ถูกต้อง');
        }
        // --- End of successful login block ---

      } else {
        // --- Handle failed login (401 Unauthorized) ---
        // Just display the error message from the backend
        setError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'); 
        // !!! DO NOT try to access data.user here !!!
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