import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/Uploadstart.module.css'; // Import the CSS module

function Uploadstart() { // <--- The component is defined as 'Upload'
  return (
    <div className={styles.uploadContainer}>
      <h1 className={styles.pageTitle}>Upload Start Page</h1>
      
   <div className="radio-group">
    <div className={styles.labelradio}>
      <p>สาขาที่อัพโหลด</p>
  <label>
    <input type="radio" name="major" value="1" /> วิทยาการคอมพิวเตอร์
  </label>
  <br />
  <br />
  <label>
    <input type="radio" name="major" value="2" /> เทคโนโลยีสารสนเทศ
  </label>
  <br />
  <br />
  <label>
    <input type="radio" name="major" value="3" /> ระบบสารสนเทศเพื่อการจัดการ
  </label>
</div>
</div>
 <div className="checkbox-group">
    <div className={styles.labelradio}>
      <p>ยืนยันสิทธิ์ต่างๆ</p>
  <label>
    <input type="checkbox" name="major" /> ยืนยันการให้สิทธิ์ในการเผยแพร่
  </label>
  <br />
  <br />
  <label>
    <input type="checkbox" name="major" /> เทคโนโลยีสารสนเทศ
  </label>
  <br />
  <br />
  <label>
    <input type="checkbox" name="major" /> ระบบสารสนเทศเพื่อการจัดการ
  </label>
</div>
</div>

    
      <Link to="/upload" style={{ textDecoration: 'none' }}>
        <button className={styles.backButton}>
          กลับไปหน้าจัดการเอกสาร
        </button>
      </Link>
      <Link to="/upload" style={{ textDecoration: 'none' }}>
        <button className={styles.SaveButton}>
          บันทึก
        </button>
      </Link>
      <br />
      <br />
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

export default Uploadstart;