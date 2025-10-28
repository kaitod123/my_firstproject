import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Ufinal2.module.css";
function Ufinal2(){
    return (
        <div className={styles.uploadContainer}>
            <h1 className={styles.pageTitle}>ผู้แต่งร่วม</h1>
            <p>ผู้แต่งร่วม</p>
            <div className={styles.inputRow}> 
                <div className={styles.inputGroup}>
                  <p>ชื่อ</p>
                    <input type="text" placeholder="ชื่อผู้แต่งร่วม" className={styles.InputField}/>
                </div>
                <div className={styles.inputGroup}>
                    <p>นามสกุล</p>
                    <input type="text" name='nameeng' placeholder="นามสกุลผู้แต่งร่วม" width="200px" className={styles.inputField } />
                </div>
            </div>

            <div className={styles.inputRow}> 
                <div className={styles.inputGroup}>
                  <p>Name</p>
                    <input type="text" placeholder="ชื่อผู้แต่งร่วม" className={styles.InputField}/>
                </div>
                <div className={styles.inputGroup}>
                    <p>Lastname</p>
                    <input type="text" name='nameeng' placeholder="นามสกุลผู้แต่งร่วม" width="200px" className={styles.inputField } />
                </div>
            </div>
            <p>Email</p>
            <div className={styles.inputRow}>
                <input type="text" placeholder="กรอกEmail ของผู้แต่งร่วม" className={styles.inputField}/>
            </div>
            
            <p>สาขาที่เรียน</p>
           <div className="radio-group"></div>
                         <div className={styles.labelradio}>
                           <label>
                             <input type="radio" name='major' value={1} />วิทยาการคอมพิวเตอร์
                           </label>
                           <br />
                           <label>
                             <input type="radio" name='major' value={2} />เทคโนโลยีสารสนเทศ
                           </label>
                           <br />
                           <label>
                             <input type="radio" name='major' value={3} />ระบบสารสนเทศเพื่อการจัดการ
                           </label>
                           <br />
                           <label>
                             <input type="radio" name="major" value={4} />อื่นๆ
                           </label>
                         </div>
            <br />
             <div className="checkbox-group">
                 <div className={styles.labelradio}>
                   <p>เพิ่มตำแหน่งของผู้แต่งร่วม</p>
               <label>
                 <input type="checkbox" name="major" /> ยืนยันการให้สิทธิ์ในการเผยแพร่
               </label>
               <br />
               <br />
               <label>
                 <input type="checkbox" name="major" /> แสดงในรายการค้นหา
               </label>
               <br />
               <br />
               <label>
                 <input type="checkbox" name="major" /> ไม่แสดงในรายการค้นหา
               </label>
             </div>
             </div>
            <br />
            <Link to="/upload" style={{ textDecoration: 'none' }}>
                <button className={styles.styleButton}>
                    กลับไปหน้าจัดการเอกสาร
                </button>
            </Link>
            <Link to = "/upload">
                <button className={styles.styleButton}>
                    บันทึก
                </button>
            </Link>
            <footer className={styles.footer}>
                <p className={styles.footerText}>© 2023 University Project Hub</p>
                <div className={styles.footerLinks}>
                    <a href="#" className={styles.footerLink}>Contact Us</a>
                    <a href="#" className={styles.footerLink}>Privacy Policy</a>
                </div>
            </footer>
        </div>
    )
}
export default Ufinal2;