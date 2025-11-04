import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './styles/HomePage.module.css';

const HomePage = () => {
  const [latestProjects, setLatestProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();


  useEffect(() => {
    const fetchLatestProjects = async () => {
      setLoading(true);
      try {
        // Now using the limit parameter which is handled by the server
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/documents?limit=4`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setLatestProjects(data);
        setError(null);
      } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);
        setError(`ไม่สามารถดึงข้อมูลโปรเจกต์ล่าสุดได้: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestProjects();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault(); // Prevent page reload on form submit
    if (searchTerm.trim()) {
      navigate(`/documents?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
const handleCardClick = (projectId) => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const userRole = userData ? userData.role : null;

    // ตรวจสอบ Role และนำทางไปยัง path ที่ถูกต้อง
    if (userRole === 'admin') {
        // สำหรับ Admin, อาจจะนำทางไปยังหน้า Dashboard หรือหน้าจัดการเอกสาร
        // ในที่นี้จะใช้ตรรกะเดียวกับ DocumentManagementSystem คือไปที่ Dashboard
        navigate('/AdminDashboard');
    } else if (userRole === 'student') {
        // สำหรับ Student, นำทางไปยัง path ของนักศึกษา
        navigate(`/student/documents/${projectId}`);
    } else if (userRole === 'advisor') {
        // สำหรับ Student, นำทางไปยัง path ของนักศึกษา
        navigate(`/professor/documents/${projectId}`);
    } else {
        // สำหรับ Professor, Guest, หรือ Role อื่นๆ จะไปยัง path เริ่มต้น
        navigate(`/documents/${projectId}`);
    }
  };
  return (
    <div>
      <div className={styles.homepageContainer}>
        <div className={styles.contentBox}>
            {/* --- (เปลี่ยนแปลง) --- */}
            {/* ลบ h1 เดิม และแทนที่ด้วย img ที่ชี้ไปที่ public folder */}
            <img 
              src="/image_7359fe.png" 
              alt="โลโก้ Computer Science" 
              style={{ width: '300px', height: 'auto'}} 
            />
            {/* --- (สิ้นสุดการเปลี่ยนแปลง) --- */}
            
          {/* Updated search bar to be a functional form */}
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหาโครงงาน, ชุดข้อมูล, หรือคำสำคัญ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {loading ? (
            <p>กำลังโหลด...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : latestProjects.length === 0 ? (
            <p>ไม่พบโปรเจกต์ล่าสุด</p>
          ) : (
          
            <div className={styles.latestProjectsGrid}>
              
              {latestProjects.map(project => (
                <div 
                  key={project.id} 
                  className={styles.latestProjectCard}
                  onClick={() => handleCardClick(project.id)} // เพิ่ม onClick event
                  // เพิ่ม style เพื่อให้ผู้ใช้รู้ว่าคลิกได้
                  style={{ cursor: 'pointer' }} 
                >
                  {/* --- (เพิ่ม style และ title attribute ที่บรรทัดด้านล่าง) --- */}
                  <h3 
                    style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      maxWidth: '100%' 
                    }}
                    title={project.title} // เพิ่ม title attribute เพื่อให้แสดงชื่อเต็มเมื่อ hover
                  >
                    {project.title}
                  </h3>
                  {/* --- (สิ้นสุดส่วนที่แก้ไข) --- */}
                  <p>ผู้จัดทำ: {project.author}</p>
                  <p>สาขาวิชา: {project.department}</p>
                  <p>ปี: {project.publish_year ? project.publish_year + 543 : 'N/A'}</p>
                </div>
              ))}
            </div>

          )}
        </div>
       
      </div>
       <footer className={styles.footer}>
        <p className={styles.footerText}>© 2023 University Project Hub </p>
        <div className={styles.footerLinks}>
          <a href="#" className={styles.footerLink}> Contact Us </a>
          <a href="#" className={styles.footerLink}> Privacy Policy </a>
        </div>
      </footer>
      </div>

  );
};

export default HomePage;
