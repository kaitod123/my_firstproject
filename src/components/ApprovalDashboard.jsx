import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import styles from '../styles/approvalDashboard.module.css'; // New CSS file

const StatusBadge = ({ text, type }) => (
    <span className={`${styles.badge} ${styles[type]}`}>{text}</span>
);

const ProjectCard = ({ project, onApprove, onReject, onToggleActive }) => {
    const { id, title, approval_status, is_active } = project;

    return (
        <div className={styles.projectCard}>
            <div className={styles.cardContent}>
                <h4>{title || 'ไม่มีชื่อเรื่อง'}</h4>
                <div className={styles.statusInfo}>
                    <StatusBadge text={approval_status} type={approval_status} />
                    {approval_status === 'approved' && (
                        is_active
                            ? <StatusBadge text="แสดงผลอยู่" type="active" />
                            : <StatusBadge text="ซ่อนชั่วคราว" type="inactive" />
                    )}
                </div>
            </div>
            <div className={styles.cardActions}>
                {approval_status === 'pending' && (
                    <>
                        <button onClick={() => onApprove(id)} className={`${styles.btn} ${styles.approveBtn}`}>
                            อนุมัติ
                        </button>
                        <button onClick={() => onReject(id)} className={`${styles.btn} ${styles.rejectBtn}`}>
                            ปฏิเสธ
                        </button>
                    </>
                )}
                {approval_status === 'approved' && (
                    <button onClick={() => onToggleActive(id, !is_active)} className={`${styles.btn} ${is_active ? styles.deactivateBtn : styles.activateBtn}`}>
                        {is_active ? 'ซ่อนชั่วคราว' : 'เปิดการแสดงผล'}
                    </button>
                )}
                <Link to={`/documents/${id}`} className={`${styles.btn} ${styles.viewBtn}`}>
                    ดูรายละเอียด
                </Link>
            </div>
        </div>
    );
};


const ApprovalDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_URL = 'https://my-project-backend-cc73.onrender.com/api/documents?limit=4/api';

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/admin/documents`);
            setProjects(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleApproval = async (id, status) => {
        // --- !!! แก้ไขข้อความตรงนี้ !!! ---
        const actionText = status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ (ส่งกลับไปแก้ไข)';
        
        if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะ '${actionText}' โปรเจกต์ ID: ${id}?`)) return;
        try {
            await axios.put(`${API_URL}/documents/${id}/approval`, { approvalStatus: status });
            fetchProjects();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะการอนุมัติ');
        }
    };

    const handleToggleActive = async (id, newActiveState) => {
        const action = newActiveState ? 'เปิดการแสดงผล' : 'ซ่อน';
        if (!window.confirm(`คุณต้องการ '${action}' โปรเจกต์ ID: ${id} หรือไม่?`)) return;
        try {
            await axios.put(`${API_URL}/documents/${id}/toggle-active`, { isActive: newActiveState });
            fetchProjects();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการสลับสถานะการใช้งาน');
        }
    };

    return (
        <div className={styles.body}>
            <div className={styles.dashboardContainer}>
                <Link to="/AdminDashboard" className={styles.backButton}>
                    &larr; กลับหน้าหลักแอดมิน
                </Link>
                <header><h1>จัดการการอนุมัติและแสดงผลโครงงาน</h1></header>
                {loading ? <p>กำลังโหลด...</p> : (
                    <div className={styles.projectsGrid}>
                        {projects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onApprove={(id) => handleApproval(id, 'approved')}
                                onReject={(id) => handleApproval(id, 'rejected')}
                                onClick={() => onDelete(id)}
                                onToggleActive={handleToggleActive}
                            />
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

export default ApprovalDashboard;