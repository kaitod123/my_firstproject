// src/components/Upload.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Upload.module.css'; // Import the CSS module

function Upload() {
  return (
    
    <div className={styles.uploadContainer}> {/* Apply class from CSS module */}
      <h1 className={styles.pageTitle}>Upload Document Page</h1> {/* Apply class from CSS module */}
      <p className={styles.pageDescription}> {/* Apply class from CSS module */}
        Here you can upload your university project documents.
      </p>  
      <div>
        <Link to="/upload2">
        <button className={styles.downloadButton}>เริ่มต้นการส่งเอกสาร</button>
        </Link>
      </div>
      
      <div>
        <Link to="/file1">
        <button className={styles.downloadButton}>อัพโหลดไฟล์งาน</button>
        </Link>
      </div>

      <div>
         <Link to="/ufinal1">
        <button className={styles.downloadButton}>รายละเอียดโครงงาน</button>
        </Link>
      </div>

      <div className={styles.inputRow}>
      <Link to="/documents" style={{ textDecoration: 'none' }}>
        <button className={styles.backButton}> {/* Apply class from CSS module */}
          กลับไปหน้าจัดการเอกสาร
        </button>
      </Link>
       <Link to = "/">
            <button className={styles.SaveButton} onClick={() =>{ alert('บันทึกสำเร็จแล้วมั้งง!')}}>
                บันทึก
            </button>
                       
       </Link>
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

export default Upload;