// src/components/UserManagement.jsx

// (!!!) 1. Import 'useRef' และ 'xlsx'
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx'; // (!!!) 1. Import 'xlsx'
import { Link } from 'react-router-dom';
// (!!!) 1. (แก้ไข) เปลี่ยนชื่อไอคอนที่ Import (!!!)
import { ArrowUpToLine } from 'lucide-react'; 

// (!!!) 2. Import 'bulkCreateUsers' (ที่เราจะสร้างใน api/usersApi.js)
import { fetchUsers, createUser, updateUser, deleteUser, fetchUserById, bulkCreateUsers } from '../api/usersApi';
import styles from '../styles/UserManagement.module.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState('All');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });//จัดเรียงข้อมูล
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentUser, setCurrentUser] = useState({ 
        username: '', email: '', password: '', first_name: '',
        last_name: '', identification: '', role: 'student', is_active: 1
    });

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
                alert("Error fetching user list. Please check the console.");
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
            alert('Error fetching user data for editing.');
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
            alert(`Error: Could not ${modalMode} user.`);
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
    const handleDelete = async (userId) => {
        if (window.confirm(`Are you sure you want to delete this user?`)) {
            try {
                await deleteUser(userId);
                loadUsers();
            } catch (error) {
                alert('Error: Could not delete user.');
            }
        }
    };
    const handleDeleteSelected = async () => {
        if (selectedUsers.length === 0) {
            alert("Please select users to delete.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) {
            try {
                await Promise.all(selectedUsers.map(id => deleteUser(id)));
                setSelectedUsers([]); 
                loadUsers(); 
            } catch (error) {
                alert('Error: Could not delete selected users.');
            }
        }
    };
    const handleSelectUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    // (!!!) START: 3. อัปเดตฟังก์ชันสำหรับ Upload (!!!)
    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
                
                alert(`กำลังอัปโหลดผู้ใช้ ${data.length} คน...`);
                
                // (!!!) START: แก้ไขส่วน Alert (!!!)
                // รับ Response กลับมาจาก Server
                const response = await bulkCreateUsers(data); 
                
                let alertMessage = response.message || "อัปโหลดสำเร็จ!";

                // ตรวจสอบว่า Server ส่ง errors กลับมาหรือไม่
                if (response.errors && response.errors.length > 0) {
                    console.error("Bulk Upload Errors:", response.errors); // Log error ทั้งหมดใน Console
                    
                    alertMessage += "\n\nสาเหตุที่ล้มเหลว:\n";
                    // เอา Error มาแสดง (จำกัดแค่ 5 ข้อแรก)
                    alertMessage += response.errors.slice(0, 5).join("\n"); 
                    
                    if (response.errors.length > 5) {
                        alertMessage += `\n...และอีก ${response.errors.length - 5} ข้อผิดพลาด (กรุณาดูใน Console)`;
                    }
                }
                
                alert(alertMessage); // แสดง Alert ที่มีรายละเอียด
                // (!!!) END: แก้ไขส่วน Alert (!!!)
                
                loadUsers(); // โหลดข้อมูลผู้ใช้ใหม่

            } catch (err) {
                console.error("Error reading or processing Excel file:", err);
                alert("เกิดข้อผิดพลาด: " + err.message);
            } finally {
                setLoading(false);
                e.target.value = null; // รีเซ็ต input
            }
        };

        reader.onerror = () => {
             console.error("File reading failed");
             alert("ไม่สามารถอ่านไฟล์ได้");
             setLoading(false);
             e.target.value = null;
        };

        reader.readAsBinaryString(file); // เริ่มอ่านไฟล์
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
                                        &larr; กลับไปยังหน้าจัดการข้อมูลแอดมิน
                                        </Link>
                                    </div>
                              </div>
                    <h1>จัดการผู้ใช้งาน</h1>

                   
                    {/* (!!!) START: แก้ไขโครงสร้าง Layout (!!!) */}
                    <div className={styles.controlsContainer}>
                        
                        {/* === ส่วนด้านซ้าย (ตอนนี้ว่างเปล่า) === */}
                        {/* (!!!) ย้ายปุ่มนำเข้าไปไว้ใน .rightColumn แล้ว (!!!) */}

                        {/* === ส่วนด้านขวา (เปลี่ยนชื่อ class) === */}
                        <div className={styles.rightColumn}>
                            
                            {/* === แถวบน (ปุ่ม) === */}
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
                                    accept=".xlsx, .xls" // จำกัดให้รับเฉพาะไฟล์ Excel
                                />

                            </div>
                            
                            {/* (!!!) START: แก้ไข (ย้าย Dropdown ออกมา) (!!!) */}
                            {/* === แถวกลาง (Dropdown Sorter) === */}
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
                            {/* (!!!) END: แก้ไข (ย้าย Dropdown ออกมา) (!!!) */}
                            
                            {/* === แถวล่าง (Tabs) === */}
                            <div className={styles.roletabs}>
                                <button onClick={() => setActiveRole('All')} className={activeRole === 'All' ? styles.active : ''}>ทั้งหมด</button>
                                <button onClick={() => setActiveRole('Admin')} className={activeRole === 'Admin' ? styles.active : ''}>ผู้ดูแล</button>
                                <button onClick={() => setActiveRole('Advisor')} className={activeRole === 'Advisor' ? styles.active : ''}>อาจารย์</button>
                                <button onClick={() => setActiveRole('Student')} className={activeRole === 'Student' ? styles.active : ''}>นักศึกษา</button>
                            </div>
                        </div>
                    </div>
                    {/* (!!!) END: แก้ไขโครงสร้าง Layout (!!!) */}
                       

                    <div className={styles.searchbar}>
                        <input 
                            type="text" 
                            placeholder="Search for users by name or email..." 
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
                                                    <img className={styles.useravatar} src={`https://i.pravatar.cc/40?u=${user.email}`} alt="avatar" />
                                                    <div>
                                                        <strong>{user.first_name} {user.last_name}</strong>
                                                        <br />
                                                        <span style={{color: '#6c757d', fontWeight: '400'}}>{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${styles['role-' + (user.role || '').toLowerCase().replace(' ', '-')]}`}>
                                                    { (user.role && roleTranslation[user.role.charAt(0).toUpperCase() + user.role.slice(1)]) || user.role }
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
                                    {/* (!!!) 5. (แก้ไข) เพิ่ม '== 1' เพื่อให้ Checkbox ทำงานถูกต้อง */}
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

            </div>
                            <footer className={styles.footer}>
                    <p className={styles.footerText}>© 2025 Your Company. All Rights Reserved.</p>
                    <div className={styles.footerLinks}>
                        <a href="#" className={styles.footerLink}>Contact Us</a>
                        <a href="#" className={styles.footerLink}>Privacy Policy</a>
                    </div>
                </footer>
        </div>
    );
};

export default UserManagement;

