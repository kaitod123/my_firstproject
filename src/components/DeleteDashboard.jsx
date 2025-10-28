import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
// NEW: Import 'useNavigate'
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/deleteDashboard.module.css';


const StatusBadge = ({ text, type }) => (
    <span className={`${styles.badge} ${styles[type]}`}>{text}</span>
);

// --- NEW: ฟังก์ชันสำหรับแปลสถานะเป็นภาษาไทย ---
const getStatusText = (status) => {
    switch (status) {
        case 'approved':
            return 'อนุมัติแล้ว';
        case 'pending':
            return 'รออนุมัติ';
        case 'rejected':
            return 'ถูกปฏิเสธ';
        default:
            return status;
    }
};
// --- สิ้นสุดส่วนที่เพิ่มใหม่ ---

// NEW: Added 'onView' to the component's props
const ProjectCard = ({ project, onDelete, onApprove, onReject, onToggleActive, onView }) => {
    // FIX #1: Added 'publish_year' to the destructuring assignment below.
    const { id, title, approval_status, is_active, publish_year } = project;

    return (
        <div className={styles.projectCard}>
            {/* NEW: Added onClick={onView} to make the content area clickable */}
            <div className={styles.cardContent} onClick={onView}>
                <h4>{title || 'ไม่มีชื่อเรื่อง'}</h4>
                {/* This line now works correctly because publish_year is defined */}
                <p className={styles.publishYear}><strong>ปีที่เผยแพร่:</strong> {publish_year ? publish_year + 543 : 'N/A'}</p>
                
                <div className={styles.statusInfo}>
                    {/* --- MODIFIED: ใช้ฟังก์ชัน getStatusText() --- */}
                    <StatusBadge text={getStatusText(approval_status)} type={approval_status} />
                    {/* --- สิ้นสุดส่วนที่แก้ไข --- */}
                    {approval_status === 'approved' && (
                        is_active
                            ? <StatusBadge text="แสดงผลอยู่" type="active" />
                            : <StatusBadge text="ซ่อน" type="inactive" />
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
                        {is_active ? 'ซ่อนชั่วคราว' : 'เปิดแสดงผล'}
                    </button>
                )}
                {/* REMOVED: The 'Link' button for 'ดูรายละเอียด' was here */}
                <button className={`${styles.btn} ${styles.deleteBtn}`} onClick={() => onDelete(id)}>
                    ลบถาวร
                </button>
            </div>
        </div>
    );
};

const DeleteDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ search: '' });
    // NEW: Initialize the navigate function
    const navigate = useNavigate();

    // FIX #2: The API_URL constant is now the base path, preventing URL duplication.
    const API_URL = 'https://my-project-backend-cc73.onrender.com/api/documents?limit=4/api';

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            // The API call now correctly targets the admin endpoint.
            const response = await axios.get(`${API_URL}/admin/documents`);
            setProjects(response.data);
            setError(null);
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    
    const handleDelete = async (id) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ ID: ${id} ออกจากระบบอย่างถาวร?`)) return;
        try {
            // URL is now correctly constructed from the base API_URL
            await axios.delete(`${API_URL}/documents/${id}`);
            fetchProjects(); 
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบโปรเจกต์');
            console.error(error);
        }
    };
    
    const handleApproval = async (id, status) => {
        // --- !!! แก้ไขข้อความตรงนี้ !!! ---
        const actionText = status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ (ส่งกลับไปแก้ไข)';
        
        if (!window.confirm(`คุณต้องการ '${actionText}' โปรเจกต์ ID: ${id} หรือไม่?`)) return;
        try {
            // URL is now correctly constructed
            await axios.put(`${API_URL}/documents/${id}/approval`, { approvalStatus: status });
            fetchProjects();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
            console.error(error);
        }
    };

    const handleToggleActive = async (id, newActiveState) => {
        const action = newActiveState ? 'เปิดการแสดงผล' : 'ซ่อน';
        if (!window.confirm(`คุณต้องการ '${action}' โปรเจกต์ ID: ${id} หรือไม่?`)) return;
        try {
            // URL is now correctly constructed
            await axios.put(`${API_URL}/documents/${id}/toggle-active`, { isActive: newActiveState });
            fetchProjects();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการสลับสถานะ');
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, search: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ search: '' });
    };

    const filteredProjects = projects.filter(project =>
        !filters.search || project.title.toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <div className={styles.body}>
            <div className={styles.deletecontainer}>
                <Link to="/AdminDashboard" className={styles.backButton}>
                     &larr; กลับไปยังหน้าจัดการข้อมูลแอดมิน
                </Link>
                <header>
                    <h1>จัดการโครงงานทั้งหมด</h1>
                </header>
                <div className={styles.controlsContainer}>
                    <div className={styles.searchInput}>
                        <input
                            type="text"
                            name="search"
                            placeholder="ค้นหาจากชื่อเรื่อง..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>
                    
                    <button onClick={clearFilters} className={styles.clearButton}>ล้างค่า</button>
                </div>

                {loading && <div className={styles.messageContainer}>กำลังโหลด...</div>}
                {error && <div className={styles.messageContainer} style={{color: 'red'}}>{error}</div>}
                
                {!loading && !error && (
                    <div className={styles.projectsGrid}>
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map(project => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onDelete={handleDelete}
                                    onApprove={(id) => handleApproval(id, 'approved')}
                                    onReject={(id) => handleApproval(id, 'rejected')}
                                    onToggleActive={handleToggleActive}
                                    // NEW: Pass the navigation function to the card
                                    onView={() => navigate(`/documents/${project.id}`)}
                                />
                            ))
                        ) : (
                            <p className={styles.messageContainer}>ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</p>
                        )}
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

export default DeleteDashboard;