// EditProfilePage.jsx (แก้ไข)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../styles/EditProfilePage.module.css'; 

function EditProfilePage() {
    const { id } = useParams(); // id อาจเป็น undefined ในช่วงเรนเดอร์แรกๆ 
    const navigate = useNavigate();

    // ... (userData state และอื่นๆ)
    const [userData, setUserData] = useState({
        first_name: '',
        last_name: '', // ต้องมี last_name เพื่อรองรับข้อมูลที่ fetch มา
        email: '',
        password: '' 
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');

    const API_BASE_URL = 'http://localhost:5000/api';

    // 1. แก้ไข useEffect เพื่อตรวจสอบ id
    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                // *** การแก้ไขที่สำคัญ: ตรวจสอบ id ก่อนเรียก fetch ***
                if (!id) {
                    setLoading(false); 
                    // หยุดการทำงานถ้า id เป็น undefined เพื่อไม่ให้เกิด 404
                    return; 
                }
                
                // ดึงข้อมูลทั้งหมดที่จำเป็นในการแสดงผล 
                const response = await fetch(`${API_BASE_URL}/users/${id}`); 
                if (!response.ok) throw new Error('Failed to fetch user data.');
                const data = await response.json();
                
                // เก็บเฉพาะค่าที่จำเป็นสำหรับการแสดงผลเท่านั้น
                setUserData({
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    email: data.email || '',
                    password: ''
                }); 
            } catch (err) {
                console.error("Error fetching user data:", err);
                // อาจตั้งค่า error ให้แสดงต่อผู้ใช้ว่า "ไม่สามารถโหลดข้อมูลโปรไฟล์ได้"
                setError(`Failed to load profile data: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess('');

        if (!userData.password) {
             setError('Please enter a new password to save changes.');
             return;
        }
        
        // ตรวจสอบ id อีกครั้งก่อนส่ง PUT
        if (!id) {
            setError('User ID is missing. Cannot update profile.');
            return;
        }

        // เตรียมข้อมูลที่จะส่งไปอัปเดต: เฉพาะ password
        const dataToUpdate = { 
            password: userData.password 
        };
        
        try {
            // ส่งเฉพาะ ID และรหัสผ่านใหม่ไปยัง Backend
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate) // ส่งแค่ { password: '...' }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update password.');

            setSuccess('Password updated successfully! Redirecting...');
            
            setTimeout(() => navigate('/'), 2000); 
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
        <div className={styles.pageContainer}>
            <div className={styles.editContainer}>
                <h1>Edit Your Password</h1>
                <form onSubmit={handleSubmit} className={styles.editForm}>
                    {/* ข้อมูลอื่นๆ ที่ไม่สามารถแก้ไขได้ */}
                    <div className={styles.formGroup}>
                        <label htmlFor="first_name">First Name</label>
                        <input type="text" id="first_name" name="first_name" value={userData.first_name || ''} readOnly className={styles.inputField} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" value={userData.email || ''} readOnly className={styles.inputField} />
                    </div>
                    
                    {/* ฟิลด์รหัสผ่านใหม่: ฟิลด์เดียวที่แก้ไขได้ */}
                    <div className={styles.formGroup}>
                        <label htmlFor="password">New Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            placeholder="Enter new password" 
                            value={userData.password || ''} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                    
                    {error && <p className={styles.errorMessage}>{error}</p>}
                    {success && <p className={styles.successMessage}>{success}</p>}

                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.submitButton}>Save New Password</button>
                        <button type="button" className={styles.cancelButton} onClick={() => navigate('/')}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        <footer className={styles.footer}>
            <p className={styles.footerText}>© 2023 University Project Hub</p>
            <div className={styles.footerLinks}>
              <a href="#" className={styles.footerLink}>Contact Us</a>
              <a href="#" className={styles.footerLink}>Privacy Policy</a>
            </div>
        </footer>
        </div>
    );
}

export default EditProfilePage;