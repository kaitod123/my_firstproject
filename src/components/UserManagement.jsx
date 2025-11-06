// src/components/UserManagement.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { ArrowUpToLine,ChevronLeft} from 'lucide-react'; 

import { fetchUsers, createUser, updateUser, deleteUser, fetchUserById, bulkCreateUsers } from '../api/usersApi';
import styles from '../styles/UserManagement.module.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState('All');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // (!!!) 1. แยก State สำหรับ Modal 2 ประเภท (!!!)

    // Modal สำหรับ "แจ้งเตือน" (มีปุ่ม OK ปุ่มเดียว)
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertModalContent, setAlertModalContent] = useState({ title: '', message: '' });

    // (!!!) Modal สำหรับ "ยืนยัน" (มีปุ่ม Confirm/Cancel) (!!!)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalContent, setConfirmModalContent] = useState({ title: '', message: '' });
    const [confirmModalAction, setConfirmModalAction] = useState(() => () => {}); // State ที่เก็บฟังก์ชันที่จะรันเมื่อกดยืนยัน

    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentUser, setCurrentUser] = useState({ 
        username: '', email: '', password: '', first_name: '',
        last_name: '', identification: '', role: 'student', is_active: 1
    });

    // (!!!) ฟังก์ชันสำหรับแสดง Alert Modal (!!!)
    const showAlert = (title, message) => {
        setAlertModalContent({ title, message });
        setIsAlertModalOpen(true);
    };

    const getInitials = (firstName, lastName) => {
        if (!firstName && !lastName) return '??';
        const firstInitial = firstName?.[0] || '';
        const lastInitial = lastName?.[0] || '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    const fileInputRef = useRef(null);

    const roleTranslation = {
        'admin': 'ผู้ดูแล',
        'advisor': 'อาจารย์',
        'student': 'นักศึกษา',
    };

    const loadUsers = () => {
        setLoading(true);
        fetchUsers()
            .then(data => {
                setUsers(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Failed to fetch users:", error);
                showAlert('ข้อผิดพลาด', 'Error fetching user list. Please check the console.');
                setLoading(false);
            });
    };

   
    useEffect(() => {
        loadUsers();
    }, []);

    // ... (ฟังก์ชัน handleInputChange, handleSelectAll, handleEditClick, handleFormSubmit, openAddModal, closeModalAndRefresh, handleDelete, handleDeleteSelected, handleSelectUser อยู่เหมือนเดิม) ...
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? (checked ? 1 : 0) : value;
        setCurrentUser(prev => ({ ...prev, [name]: val }));
    };
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allUserIds = sortedAndFilteredUsers.map(user => user.id);
            setSelectedUsers(allUserIds);
        } else {
            setSelectedUsers([]);
        }
    };
    const handleEditClick = async (user) => { 
        try {
            const fullUserData = await fetchUserById(user.id);
            setCurrentUser(fullUserData);
            setModalMode('edit');
            setIsModalOpen(true);
        } catch (error) {
            showAlert('ข้อผิดพลาด', 'Error fetching user data for editing.');
        }
    };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit') {
                await updateUser(currentUser.id, currentUser);
            } else {
                await createUser(currentUser);
            }
            closeModalAndRefresh();
        } catch (error) {
            showAlert('ข้อผิดพลาด', `Error: Could not ${modalMode} user.`);
        }
    };
    const openAddModal = () => {
        setCurrentUser({
            username: '', email: '', password: '', first_name: '',
            last_name: '', identification: '', role: 'student', is_active: 1
        });
        setModalMode('add');
        setIsModalOpen(true);
    };
    const closeModalAndRefresh = () => {
        setIsModalOpen(false);
        loadUsers();
    };

    // (!!!) START: 2. แก้ไขฟังก์ชัน Delete ให้ใช้ Confirmation Modal (!!!)

    // 2.1 สร้างฟังก์ชันสำหรับการลบจริง
    const proceedWithDelete = async (userId) => {
        try {
            await deleteUser(userId);
            loadUsers();
        } catch (error) {
            showAlert('ข้อผิดพลาด', 'Error: Could not delete user.');
        }
    };

    // 2.2 แก้ไข handleDelete ให้เปิด Modal
    const handleDelete = async (userId) => {
        setConfirmModalContent({ 
            title: 'ยืนยันการลบ',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?`
        });
        // (!!!) ส่งฟังก์ชัน "การลบจริง" เข้าไปเก็บใน State (!!!)
        setConfirmModalAction(() => () => proceedWithDelete(userId));
        setIsConfirmModalOpen(true);
    };

    // 2.3 สร้างฟังก์ชันสำหรับการลบทีละหลายคน
    const proceedWithDeleteSelected = async () => {
        try {
            await Promise.all(selectedUsers.map(id => deleteUser(id)));
            setSelectedUsers([]); 
            loadUsers(); 
        } catch (error) {
            showAlert('ข้อผิดพลาด', 'Error: Could not delete selected users.');
        }
    };

    // 2.4 แก้ไข handleDeleteSelected ให้ใช้ Modal
    const handleDeleteSelected = async () => {
        if (selectedUsers.length === 0) {
            // (!!!) เปลี่ยน alert() เป็น Alert Modal (!!!)
            showAlert('ข้อควรทราบ', 'กรุณาเลือกผู้ใช้ที่ต้องการลบ');
            return;
        }

        setConfirmModalContent({ 
            title: 'ยืนยันการลบ',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ที่เลือก ${selectedUsers.length} คน?`
        });
        // (!!!) ส่งฟังก์ชัน "การลบจริง" เข้าไปเก็บใน State (!!!)
        setConfirmModalAction(() => () => proceedWithDeleteSelected());
        setIsConfirmModalOpen(true);
    };

    // (!!!) END: 2. แก้ไขฟังก์ชัน Delete (!!!)


    const handleSelectUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // (!!!) START: 3. อัปเดตฟังก์ชันสำหรับ Upload (!!!)
    
    const handleUploadClick = () => {
        setIsImportModalOpen(true); // เปิด Modal
    };

    // (!!!) START: Handlers สำหรับ Dropzone (!!!)
    const handleDropzoneClick = () => {
        fileInputRef.current.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            fileInputRef.current.files = files;
            const fakeEvent = { target: fileInputRef.current };
            
            handleFileChange(fakeEvent); // (!!!) เรียก handleFileChange
        }
    };
    // (!!!) END: Handlers สำหรับ Dropzone (!!!)


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImportModalOpen(false); 
        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' }); 
                const wsname = wb.SheetNames[0]; 
                const ws = wb.Sheets[wsname];
                
                const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

                if (!data || data.length === 0) {
                    throw new Error("ไฟล์ Excel ว่างเปล่า");
                }

                const firstRow = data[0];
                const requiredHeaders = ['username', 'email', 'password', 'first_name', 'last_name', 'role'];
                const missingHeaders = requiredHeaders.filter(header => !firstRow.hasOwnProperty(header));

                if (missingHeaders.length > 0) {
                    throw new Error(`ไฟล์ Excel ขาดคอลัมน์ที่จำเป็น: ${missingHeaders.join(', ')}`);
                }
                
                const response = await bulkCreateUsers(data); 
                
                let alertMessage = response.message || "อัปโหลดสำเร็จ!";

                if (response.errors && response.errors.length > 0) {
                    console.error("Bulk Upload Errors:", response.errors); 
                    
                    alertMessage += "\n\nสาเหตุที่ล้มเหลว:\n";
                    alertMessage += response.errors.slice(0, 5).join("\n"); 
                    
                    if (response.errors.length > 5) {
                        alertMessage += `\n...และอีก ${response.errors.length - 5} ข้อผิดพลาด (กรุณาดูใน Console)`;
                    }
                }
                
                showAlert('ผลการนำเข้า', alertMessage);
                
                loadUsers();

            } catch (err) {
                console.error("Error reading or processing Excel file:", err);
                showAlert('เกิดข้อผิดพลาด', "เกิดข้อผิดพลาด: " + err.message);
            } finally {
                setLoading(false);
                e.target.value = null;
            }
        };

        reader.onerror = () => {
             console.error("File reading failed");
             showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ได้');
             setLoading(false);
             e.target.value = null;
        };

        reader.readAsBinaryString(file);
    };
    // (!!!) END: 3. อัปเดตฟังก์ชันสำหรับ Upload (!!!)


    const sortedAndFilteredUsers = useMemo(() => {
        // ... (โค้ดส่วนนี้เหมือนเดิม) ...
        let filtered = users.filter(user => {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const roleMatch = activeRole === 'All' || user.role.toLowerCase() === activeRole.toLowerCase();
            const searchMatch = fullName.includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
            return roleMatch && searchMatch;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [users, activeRole, searchTerm, sortConfig]); 

    return (
        <div className={styles.body}>
            <div className={styles.dashboardContainer}>
                              
                <div className={styles.usermanagementcontainer}>
                    <div className={styles.dashboardContainer}>
                                    <div>
                                        <Link to="/AdminDashboard" className={styles.backButton}>
                                        <ChevronLeft size={20} /> กลับไปยังหน้าก่อนหน้า
                                        </Link>
                                    </div>
                              </div>
                    <h1>จัดการผู้ใช้งาน</h1>

                   
                    <div className={styles.controlsContainer}>
                        
                        <div className={styles.rightColumn}>
                            
                            <div className={styles.topButtonRow}>
                                <button 
                                    onClick={openAddModal} 
                                    className={`${styles.btna} ${styles.adduserbtn}`}
                                >
                                    + เพิ่มผู้ใช้
                                </button>

                                <button 
                                    onClick={handleDeleteSelected} 
                                    className={`${styles.btna} ${styles.deleteuserbtn}`}
                                    disabled={selectedUsers.length === 0}
                                >
                                    ลบผู้ใช้ที่เลือก
                                </button>

                                <button
                                    onClick={handleUploadClick} 
                                    className={`${styles.btna} ${styles.uploadbtn}`} 
                                >
                                    <ArrowUpToLine size={18} style={{ marginRight: '8px' }} />
                                    นำเข้า
                                </button>
                                
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    accept=".xlsx, .xls"
                                />

                            </div>
                            
                            <select
                                onChange={(e) => {
                                    const [key, direction] = e.target.value.split('-');
                                    setSortConfig({ key, direction });
                                }}
                                value={`${sortConfig.key}-${sortConfig.direction}`}
                                className={`${styles.btna} ${styles.dropdown}`}
                            >
                                <option value="created_at-descending">วันที่เพิ่ม (ใหม่สุด)</option>
                                <option value="created_at-ascending">วันที่เพิ่ม (เก่าสุด)</option>
                                <option value="role-ascending">บทบาท (A-Z)</option>
                                <option value="role-descending">บทบาท (Z-A)</option>
                                <option value="first_name-ascending">ชื่อ (A-Z)</option>
                                <option value="first_name-descending">ชื่อ (Z-A)</option>
                            </select>
                            
                            <div className={styles.roletabs}>
                                <button onClick={() => setActiveRole('All')} className={activeRole === 'All' ? styles.active : ''}>ทั้งหมด</button>
                                <button onClick={() => setActiveRole('Admin')} className={activeRole === 'Admin' ? styles.active : ''}>ผู้ดูแล</button>
                                <button onClick={() => setActiveRole('Advisor')} className={activeRole === 'Advisor' ? styles.active : ''}>อาจารย์</button>
                                <button onClick={() => setActiveRole('Student')} className={activeRole === 'Student' ? styles.active : ''}>นักศึกษา</button>
                            </div>
                        </div>
                    </div>
                       

                    <div className={styles.searchbar}>
                        <input 
                            type="text" 
                            placeholder="ค้นหาโดยใช้ ชื่อผู้ใช้ หรือ อีเมล" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    
                    <div className={styles.usertable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        <input 
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={sortedAndFilteredUsers.length > 0 && selectedUsers.length === sortedAndFilteredUsers.length}
                                        />
                                    </th> 
                                    <th>ผู้ใช้</th>
                                    <th>บทบาท</th>
                                    <th>สถานะ</th>
                                    <th>วันที่เพิ่ม</th>
                                    <th>แก้ไข/ลบ</th>
                                </tr>
                            </thead>
                            
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading users...</td></tr>
                                ) : sortedAndFilteredUsers.length === 0 ? (
                                     <tr><td colSpan="6" style={{ textAlign: 'center' }}>No users found.</td></tr>
                                ) : (
                                    sortedAndFilteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td><input type="checkbox" onChange={() => handleSelectUser(user.id)} checked={selectedUsers.includes(user.id)} /></td>
                                            <td>
                                                <div className={styles.userinfo}>
                                                    <div className={styles.profileAvatar}>
                                                       {getInitials(user.first_name, user.last_name)}
                                                    </div>
                                                    <div>
                                                        <strong>{user.first_name} {user.last_name}</strong>
                                                        <br />
                                                        <span style={{color: '#6c757d', fontWeight: '400'}}>{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${styles['role-' + (user.role || '').toLowerCase().replace(' ', '-')]}`}>
                                                    { (user.role && roleTranslation[user.role.toLowerCase()]) || user.role }
                                                 </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.status} ${user.is_active ? styles.active : styles.inactive}`}>{user.is_active ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}</span>
                                            </td>
                                            <td>
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'N/A'}
                                            </td>
                                            
                                            <td>
                                            
                                                <div className={styles.actionCell}>
                                                    <button onClick={() => handleEditClick(user)} className={`${styles.actionBtn} ${styles.editBtn}`}>
                                                        แก้ไข
                                                    </button>
                                                    {/* (!!!) 4. ปุ่มลบนี้จะเรียก handleDelete (ที่เปิด Modal) (!!!) */}
                                                    <button onClick={() => handleDelete(user.id)} className={`${styles.actionBtn} ${styles.deleteuserbtn}`}>ลบผู้ใช้</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Modal และ Footer --- */}
                
                {/* Modalสำหรับ Add/Edit User (อันเดิม) */}
                {isModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2>{modalMode === 'edit' ? 'Edit User' : 'Add New User'}</h2>
                            <form onSubmit={handleFormSubmit}>
                                <div className={styles.formGrid}>
                                    <input name="username" value={currentUser.username} onChange={handleInputChange} placeholder="Username" required />
                                    <input name="email" type="email" value={currentUser.email} onChange={handleInputChange} placeholder="Email" required />
                                    <input name="password" type="password" value={currentUser.password} onChange={handleInputChange} placeholder="New Password (leave blank to keep current)" />
                                    <input name="identification" value={currentUser.identification} onChange={handleInputChange} placeholder="Identification" />
                                    <input name="first_name" value={currentUser.first_name} onChange={handleInputChange} placeholder="First Name" required />
                                    <input name="last_name" value={currentUser.last_name} onChange={handleInputChange} placeholder="Last Name" required />
                                    
                                </div>
                                    <div className={styles.formGroup}>
                                        <label>Role:</label>
                                        <div className={styles.radioGroup}>
                                            <label><input type="radio" name="role" value="admin" checked={currentUser.role === 'admin'} onChange={handleInputChange} /> ผู้ดูแล</label>
                                            <label><input type="radio" name="role" value="advisor" checked={currentUser.role === 'advisor'} onChange={handleInputChange} /> อาจารย์</label>
                                            <label><input type="radio" name="role" value="student" checked={currentUser.role === 'student'} onChange={handleInputChange} /> นักศึกษา</label>
                                        </div>
                                    </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.checkboxLabel}>
                                        <input type="checkbox" name="is_active" checked={currentUser.is_active == 1} onChange={handleInputChange} />
                                        User is Active
                                    </label>
                                </div>
                                    <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                                    <button type="submit" className={styles.saveBtn}>Save Changes</button>
                                </div>
                                </form>
                            </div>
                        </div>
                    )}


                {/* Modal นำเข้า (Dropzone) */}
                {isImportModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2>นำเข้าผู้ใช้จากไฟล์ Excel</h2>
                            <p>ลากไฟล์ .xlsx หรือ .xls ของคุณมาวางในพื้นที่ด้านล่าง</p>
                            
                            <div 
                                className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                                onClick={handleDropzoneClick}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <ArrowUpToLine size={40} color={isDragging ? '#3a7bd5' : '#888'} />
                                <p>ลากไฟล์มาวางที่นี่</p>
                                <p>หรือ <a>คลิกเพื่อเลือกไฟล์</a></p>
                                <span className={styles.dropzoneFormat}>รองรับ .xlsx, .xls</span>
                            </div>
                            
                            <div className={styles.modalNote}>
                                <strong>ข้อกำหนดของไฟล์:</strong>
                                <ul>
                                    <li><strong>คอลัมน์ที่จำเป็น:</strong> <code>username</code>, <code>email</code>, <code>password</code>, <code>first_name</code>, <code>last_name</code>, <code>role</code>.</li>
                                    <li>คอลัมน์ <code>identification</code> (รหัส) สามารถเว้นว่างได้</li>
                                    <li>ค่า <code>role</code> ที่รองรับคือ: <code>admin</code>, <code>advisor</code>, <code>student</code></li>
                                </ul>
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setIsImportModalOpen(false)} className={styles.cancelBtn}>
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* (!!!) 5. Alert Modal (สำหรับ OK) (!!!) */}
                {isAlertModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2>{alertModalContent.title}</h2>
                            <p className={styles.alertMessage}>{alertModalContent.message}</p>
                            <div className={styles.modalActions}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAlertModalOpen(false)} 
                                    className={styles.saveBtn} 
                                >
                                    ตกลง
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* (!!!) END: 5. Alert Modal (!!!) */}
                
                {/* (!!!) START: 6. เพิ่ม Confirmation Modal (สำหรับ Confirm/Cancel) (!!!) */}
                {isConfirmModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h2>{confirmModalContent.title}</h2>
                            <p className={styles.alertMessage}>{confirmModalContent.message}</p>
                            <div className={styles.modalActions}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsConfirmModalOpen(false)} 
                                    className={styles.cancelBtn} 
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        confirmModalAction(); // (!!!) รันฟังก์ชันที่เก็บไว้ (เช่น การลบ)
                                        setIsConfirmModalOpen(false); // (!!!) ปิด Modal
                                    }} 
                                    className={styles.confirmDeleteBtn} /* (!!!) ใช้ Style สีแดง */
                                >
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* (!!!) END: 6. เพิ่ม Confirmation Modal (!!!) */}


            </div>
      <footer className={styles.footer}>
        <p className={styles.footerText}>Copyright © 2025</p>
        <div className={styles.footerLink}>
          <a className={styles.footerLink}>Designed & Developed by </a>
          <a href="https://informatics.nrru.ac.th/" className={styles.footerLink}>Informatics</a>
        </div>
      </footer>
        </div>
    );
};

export default UserManagement;