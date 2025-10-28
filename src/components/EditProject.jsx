import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../styles/Ufinal1.module.css';

function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        title_eng: '',
        abstract: '',
        keywords: '',
        advisorName: '',
        department: '',
        coAdvisorName: '',
        supportAgency: '',
        // *** แก้ไข: document_type ถูกเปลี่ยนเป็น Array เพื่อรองรับ Multiple Selection ***
        document_type: [], 
        // States for NEW files to be uploaded
        complete_pdf: [],
        complete_doc: [],
        article_files: [],
        program_files: [],
        web_files: [],
        poster_files: [],
        certificate_files: [],
    });

    const [existingFiles, setExistingFiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const API_BASE_URL = 'https://my-project-backend-cc73.onrender.com/api/documents?limit=4/api';

    useEffect(() => {
        const fetchProjectDetails = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/project-details/${id}`);
                if (!response.ok) throw new Error('Failed to fetch project details.');
                
                const data = await response.json();
                
                // Set text data into our unified formData state
                setFormData(prevState => ({
                    ...prevState,
                    title: data.title || '',
                    title_eng: data.title_eng || '',
                    abstract: data.abstract || '',
                    keywords: data.keywords || '',
                    advisorName: data.advisorName || '',
                    department: data.department || '',
                    coAdvisorName: data.coAdvisorName || '',
                    supportAgency: data.supportAgency || '',
                    // *** แก้ไข: แปลง String ที่คั่นด้วยคอมมาจาก DB เป็น Array ***
                    document_type: data.document_type ? data.document_type.split(',').map(s => s.trim()) : [], 
                }));

                // Parse and set existing file paths for display
                if (data.file_paths) {
                    setExistingFiles(JSON.parse(data.file_paths));
                }

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchProjectDetails();
    }, [id]);

    // Handles changes for all text inputs (UNTOUCHED - for radio/text)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };
    
    // *** NEW: Handler สำหรับ Checkbox เพื่อจัดการ Array ***
    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        const name = e.target.name; // 'document_type'

        setFormData(prevData => {
            const currentArray = prevData[name] || [];

            if (checked) {
                // เพิ่มค่าเข้าไปใน Array ถ้าถูกเลือก
                return {
                    ...prevData,
                    [name]: [...currentArray, value],
                };
            } else {
                // ลบค่าออกจาก Array ถ้าถูกยกเลิกการเลือก
                return {
                    ...prevData,
                    [name]: currentArray.filter(item => item !== value),
                };
            }
        });
    };

    // Handles adding new files to the state
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: [...prevState[name], ...Array.from(files)],
        }));
    };
    
    // Handles removing newly selected files before submission
    const handleRemoveNewFile = (fileName, fileType) => {
        setFormData(prevState => ({
            ...prevState,
            [fileType]: prevState[fileType].filter(file => file.name !== fileName)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');

        const data = new FormData();
        const fileKeys = [
            'complete_pdf', 'complete_doc', 'article_files', 'program_files', 
            'web_files', 'poster_files', 'certificate_files'
        ];

        // 1. Append all text data from state
        for (const key in formData) {
            if (!fileKeys.includes(key)) {
                
                // *** แก้ไข: แปลง document_type (Array) เป็น String คั่นด้วยคอมมา ***
                if (key === 'document_type') {
                    // ตรวจสอบว่าเป็น Array และมีสมาชิกหรือไม่ ถ้ามี ให้ join เป็น String
                    const documentTypesString = Array.isArray(formData.document_type) 
                        ? formData.document_type.join(',') 
                        : '';
                    data.append(key, documentTypesString);
                } else {
                    data.append(key, formData[key]);
                }

            }
        }

        // 2. Append only the NEW files. 
        fileKeys.forEach(key => {
            if (formData[key] && formData[key].length > 0) {
                formData[key].forEach(file => {
                    data.append(key, file);
                });
            }
        });
        
        try {
            const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
                method: 'PUT',
                body: data, 
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to update project.');
            
            setSuccessMessage('Project updated successfully! Redirecting...');
            setTimeout(() => navigate('/ProjectStatus'), 2000);

        } catch (err) {
            setError(err.message);
        }
    };
    
    // Reusable File Upload Component (fixed and functional)
    const FileUploadZone = ({ name, title, hint, accept }) => (
        <div className={styles.fileDropzone}>
            <p className={styles.fileUploadTitle}>{title}</p>

            {/* Display existing files for this category */}
            {existingFiles[name] && existingFiles[name].length > 0 && (
                <div className={styles.currentFiles}>
                    <strong>Current file(s):</strong>
                    <ul>
                        {existingFiles[name].map((fileName, index) => <li key={index}>{fileName}</li>)}
                    </ul>
                    <p className={styles.fileHint}>Uploading new files here will replace the old ones.</p>
                </div>
            )}
            
            <label className={styles.fileButton}>
                เลือกไฟล์ใหม่
                <input
                    type="file"
                    name={name}
                    multiple
                    accept={accept}
                    onChange={handleFileChange}
                />
            </label>

            {/* Display newly selected files to be uploaded */}
            {formData[name].length > 0 && (
                <ul className={styles.fileList}>
                    {formData[name].map((file, index) => (
                        <li key={index} className={styles.fileItem}>
                            <span className={styles.fileName}>{file.name}</span>
                            <button
                                type="button"
                                className={styles.removeFileButton}
                                onClick={() => handleRemoveNewFile(file.name, name)}
                            >
                                ลบ
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    if (loading) return <div>Loading project details...</div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.uploadCard}>
                <h1 className={styles.pageTitle}>Edit Project (ID: {id})</h1>
                <form onSubmit={handleSubmit}>
                    
                    {/* Section 1: Project Information (เหมือนเดิม) */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>ข้อมูลโครงงาน</h2>
                        <div className={styles.twoColumnGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>ชื่อโครงงาน</label>
                                <input type="text" name="title" value={formData.title} className={styles.inputField} onChange={handleChange} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>ชื่อโครงงานภาษาอังกฤษ</label>
                                <input type="text" name='title_eng' value={formData.title_eng} className={styles.inputField} onChange={handleChange} />
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>บทคัดย่อ</label>
                            <textarea name="abstract" value={formData.abstract} rows="4" className={styles.textarea} onChange={handleChange}></textarea>
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>คำสำคัญ</label>
                            <input name="keywords" value={formData.keywords} className={styles.inputField} onChange={handleChange} />
                        </div>
                        <div className={styles.twoColumnGrid}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>อาจารย์ที่ปรึกษา</label>
                            <input type="text" name="advisorName" value={formData.advisorName} className={styles.inputField} onChange={handleChange} />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>ชื่ออาจารย์ที่ปรึกษาร่วม (ถ้ามี)</label>
                            <input type="text" name="coAdvisorName" value={formData.coAdvisorName} className={styles.inputField} onChange={handleChange} />
                        </div>
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>หน่วยงานที่สนับสนุน (ถ้ามี)</label>
                        <input type="text" name="supportAgency" placeholder='ชื่อหน่วยงานที่สนับสนุน' value={formData.supportAgency} className={styles.inputField} onChange={handleChange} />
                    </div>
                    </div>
                    
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>ประเภทของโครงงานและสาขา</h2>
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>สาขาที่อัปโหลด</label>
                        {/* ส่วนนี้ใช้ Radio Button เหมือนเดิม จึงใช้ handleChange เดิมได้ */}
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="วิทยาการคอมพิวเตอร์" checked={formData.department === 'วิทยาการคอมพิวเตอร์'} onChange={handleChange} />
                                <span className={styles.cardRadioText}>วิทยาการคอมพิวเตอร์</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="เทคโนโลยีสารสนเทศ" checked={formData.department === 'เทคโนโลยีสารสนเทศ'} onChange={handleChange} />
                                <span className={styles.cardRadioText}>เทคโนโลยีสารสนเทศ</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input type="radio" name="department" value="ระบบสารสนเทศเพื่อการจัดการ" checked={formData.department === 'ระบบสารสนเทศเพื่อการจัดการ'} onChange={handleChange} />
                                <span className={styles.cardRadioText}>ระบบสารสนเทศเพื่อการจัดการ</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className={styles.radioGroup}>
                        <label className={styles.label}>ประเภท</label>
                        {/* *** แก้ไข: ใช้ Checkbox พร้อม handleCheckboxChange และ includes() *** */}
                        <div className={styles.cardRadioGrid}>
                            <label className={styles.cardRadio}>
                                <input 
                                    type="checkbox" 
                                    name="document_type" 
                                    value="เกม" 
                                    checked={formData.document_type.includes('เกม')} 
                                    onChange={handleCheckboxChange} 
                                />
                                <span className={styles.cardRadioText}>เกม</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input 
                                    type="checkbox" 
                                    name="document_type" 
                                    value="IOT" 
                                    checked={formData.document_type.includes('IOT')} 
                                    onChange={handleCheckboxChange} 
                                />
                                <span className={styles.cardRadioText}>IOT</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input 
                                    type="checkbox" 
                                    name="document_type" 
                                    value="Web" 
                                    checked={formData.document_type.includes('Web')} 
                                    onChange={handleCheckboxChange} 
                                />
                                <span className={styles.cardRadioText}>Web</span>
                            </label>
                            <label className={styles.cardRadio}>
                                <input 
                                    type="checkbox" 
                                    name="document_type" 
                                    value="อื่นๆ" 
                                    checked={formData.document_type.includes('อื่นๆ')} 
                                    onChange={handleCheckboxChange} 
                                />
                                <span className={styles.cardRadioText}>อื่นๆ</span>
                            </label>
                        </div>
                    </div>

                </div>

                    {/* Section 2: File Uploads (เหมือนเดิม) */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Update Files (Optional)</h2>
                        
                        <div className={styles.twoColumnGrid}>
                            <FileUploadZone name="complete_pdf" title="ไฟล์เอกสารฉบับสมบูรณ์ (PDF)" hint="รองรับไฟล์ .pdf" accept=".pdf" />
                            <FileUploadZone name="complete_doc" title="ไฟล์เอกสารฉบับสมบูรณ์ (DOCX)" hint="รองรับไฟล์ .doc, .docx" accept=".doc,.docx" />
                        </div>
                        <div className={styles.twoColumnGrid}>
                            <FileUploadZone name="article_files" title="ไฟล์บทความสำหรับตีพิมพ์" hint="รองรับไฟล์ .docx, .pdf" accept=".docx,.pdf" />
                            <FileUploadZone name="program_files" title="ไฟล์โปรแกรมพร้อมติดตั้ง" hint="แนะนำ .zip, .rar, .exe" accept=".zip,.rar,.exe" />
                        </div>
                        <div className={styles.twoColumnGrid}>
                            <FileUploadZone name="web_files" title="File Web (Zip)" hint="รองรับไฟล์ .zip" accept=".zip" />
                            <FileUploadZone name="poster_files" title="ไฟล์โปสเตอร์" hint="รองรับไฟล์ .psd, .jpg" accept=".psd,.jpg,.jpeg" />
                        </div>
                         <div>
                            <FileUploadZone name="certificate_files" title="ไฟล์ใบผ่านการอบรม (ถ้ามี)" hint="รองรับ .pdf, .jpg, .png" accept=".pdf,.jpg,.jpeg,.png" />
                        </div>
                        <div className={styles.checkboxGroup}>
                            <label className={styles.label}>ยืนยันสิทธิ์ต่างๆ</label>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" name="permission" required className={styles.checkboxInput} />
                                <span className={styles.checkboxText}>ยืนยันการให้สิทธิ์ในการเผยแพร่</span>
                            </label>
                        </div>
                    </div>

                    {error && <p className={styles.errorMessage}>{error}</p>}
                    {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
                
                    <div className={styles.buttonGroup}>
                        <button type="button" className={styles.cancelButton} onClick={() => navigate('/ProjectStatus')}>Cancel</button>
                        <button type="submit" className={styles.submitButton}>Save Changes</button>
                    </div>
                </form>
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
}

export default EditProject;