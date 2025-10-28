import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Ufile1.module.css'; // Import the CSS module

function Ufile1() {
  return (
    <div className={styles.uploadContainer}>
      <h1 className={styles.pageTitle}>Upload File Page</h1>
        <div className={styles.inputRow}>
        <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์เอกสารฉบับสมบูรณ์(PDF)
        </label>
        </div>

        <div className={styles.inputRow}>
          <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์เอกสารฉบับสมบูรณ์(docและdocx)
        </label>
        </div>

        <div className={styles.inputRow}>
          <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์เอกสารบนความสำหรับตีพิมพ์(docและpdf)
        </label>
        </div>

        <div className={styles.inputRow}>
          <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์โปรแกรมพร้อมติดตั้ง
        </label>
        </div>

        <div className={styles.inputRow}>
          <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์Web(Zip)
        </label>
        </div>

        <div className={styles.inputRow}>
          <input type="file" multiple style={{ display: 'none' }} id="file-upload" />
        <label htmlFor="file-upload" className={styles.fileInputLabel}>
          ไฟล์โปสเตอร์(PSDและJPG)
        </label>
        </div>
        <div className={styles.inputRow}>
      <Link to="/upload" style={{ textDecoration: 'none' }}>
        <button className={styles.styleButton}>
          กลับไปหน้าจัดการเอกสาร
        </button>
      </Link>
            <Link to="/upload" style={{ textDecoration: 'none' }}>
              <button className={styles.styleButton}>
                บันทึก
              </button>
      </Link>
      <br />
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

// แก้ไข: เปลี่ยนชื่อที่ export ให้ตรงกับชื่อ component ที่ประกาศ
export default Ufile1;