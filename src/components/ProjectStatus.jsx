import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/ProjestStatus.module.css'; // สร้างไฟล์ CSS ใหม่สำหรับหน้านี้

// Helper Component สำหรับแสดงสถานะด้วยสีที่แตกต่างกัน
const StatusBadge = ({ status, is_active }) => {
    let statusText = '';
    let statusClass = '';

    if (status === 'pending') {
        statusText = 'รอดำเนินการ';
        statusClass = styles.pending;
    } else if (status === 'approved') {
        
        if (is_active) { 
            statusText = 'อนุมัติแล้ว แสดงผลอยู่'; 
            statusClass = styles.approved; 
        } else { 
            statusText = 'อนุมัติแล้ว ถูกซ่อน';
            statusClass = styles.hidden;
        }
    } else if (status === 'rejected') {
        statusText = 'ถูกปฏิเสธ (กรุณาแก้ไข)';
        statusClass = styles.rejected;
    } else {
        statusText = status; // Fallback
        statusClass = styles.hidden;
    }
    
    return <span className={`${styles.badge} ${statusClass}`}>{statusText}</span>;
};

const ProjectStatus = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const API_BASE_URL = 'https://my-project-backend-cc73.onrender.com/api/documents?limit=4/api';

    useEffect(() => {
        const fetchUserProjects = async () => {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (!userData || !userData.id) {
                setError('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่');
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/users/${userData.id}/projects`);
                if (!response.ok) {
                    throw new Error('ไม่สามารถดึงข้อมูลโครงงานได้');
                }
                const data = await response.json();
                setProjects(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProjects();
    }, []);

    if (loading) return <div className={styles.container}><p>กำลังโหลดข้อมูลโครงงาน...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <div className={styles.body}>
            <div className={styles.container}>
                <h1>สถานะโครงงานของคุณ</h1>
                <br />
                {projects.length === 0 ? (
                    <p>คุณยังไม่มีโครงงานที่อัปโหลด</p>
                ) : (
                    <div className={styles.projectList}>
                        {projects.map(project => (
                            
                            <div key={project.id} className={styles.projectCard}>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.projectTitle}>{project.title}</h3>
                                    <StatusBadge status={project.approval_status} is_active={project.is_active} />
                                    <p className={styles.submittedDate}>
                                        ยื่นเรื่องเมื่อ: {new Date(project.submitted_date).toLocaleDateString('th-TH')}
                                    </p>
                                </div>
                            
                                
                                <div className={styles.cardActions}>
                                    {/* --- (แก้ไข) แยกเงื่อนไข 'rejected' และเปลี่ยนข้อความปุ่ม --- */}
                                    
                                    {/* 1. ถ้า 'ถูกปฏิเสธ' (rejected) 
                                           แสดงปุ่ม "ส่งใหม่อีกครั้ง" */}
                                    {project.approval_status === 'rejected' && (
                                        <Link to={`/edit-project/${project.id}`} className={styles.editButton}>
                                            ส่งใหม่อีกครั้ง
                                        </Link>
                                    )}

                                    {/* 2. ถ้า 'รออนุมัติ' (pending) หรือ 'ถูกซ่อน' (approved && !is_active) 
                                           แสดงปุ่ม "แก้ไข" */}
                                    {(project.approval_status === 'pending' ||
                                      (project.approval_status === 'approved' && !project.is_active)) && (
                                        <Link to={`/edit-project/${project.id}`} className={styles.editButton}>
                                            แก้ไข
                                        </Link>
                                    )}
                                    {/* --- สิ้นสุดส่วนที่แก้ไข --- */}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                )}
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
};

export default ProjectStatus;