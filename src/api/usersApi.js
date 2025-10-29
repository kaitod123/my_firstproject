// src/api/usersApi.js

// *****************************************************************
// แก้ไข: ใช้ VITE_API_URL ที่ถูกต้อง และ fallback ไปที่ localhost:5000
// *****************************************************************
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
if (!import.meta.env.VITE_API_URL) {
    console.warn("VITE_API_URL is not defined! Falling back to: " + API_BASE_URL);
}

// ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด (แก้ไขให้สอดคล้องกับการใช้งาน fetch)
export const fetchUsers = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`); // <--- ใช้ /api/users
        
        if (!response.ok) {
            throw new Error(`Request failed with status code ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch users:", error);
        throw new Error("Failed to fetch users: " + error.message);
    }
};

// Helper function สำหรับจัดการ response
const handleResponse = async (response) => {
  if (!response.ok) {
    // พยายามอ่าน JSON Error จาก Backend
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return response.json();
};

/**
 * READ: ดึงข้อมูลผู้ใช้ทั้งหมด (แก้ไขฟังก์ชันที่ซ้ำซ้อน)
 */
export const fetchAllUsers = async () => { // เปลี่ยนชื่อเป็น fetchAllUsers เพื่อไม่ให้ซ้ำ
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`); // <--- ใช้ /api/users
    return handleResponse(response);
  } catch (error) {
    console.error('There was a problem fetching users:', error);
    throw error; 
  }
};

/**
 * CREATE: สร้างผู้ใช้ใหม่
 */
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, { // <--- ใช้ /api/users
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error('There was a problem creating the user:', error);
    throw error;
  }
};

/**
 * UPDATE: อัปเดตข้อมูลผู้ใช้
 */
export const fetchUserById = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`); // <--- ใช้ /api/users
    return handleResponse(response);
  } catch (error) {
    console.error(`There was a problem fetching user ${userId}:`, error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, { // <--- ใช้ /api/users
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`There was a problem updating user ${userId}:`, error);
    throw error;
  }
};

/**
 * DELETE: ลบผู้ใช้
 */
export const deleteUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, { // <--- ใช้ /api/users
      method: 'DELETE',
    });
    return handleResponse(response);
  } catch (error)
  {
    console.error(`There was a problem deleting user ${userId}:`, error);
    throw error;
  }
};
