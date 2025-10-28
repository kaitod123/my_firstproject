// src/api/usersApi.js

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function สำหรับจัดการ response
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return response.json();
};

/**
 * READ: ดึงข้อมูลผู้ใช้ทั้งหมด
 */
export const fetchUsers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    // ไม่ต้องแปลงข้อมูลแล้ว เพราะ server ส่ง first_name, last_name มาให้โดยตรง
    return handleResponse(response);
  } catch (error) {
    console.error('There was a problem fetching users:', error);
    throw error; // ส่ง error ต่อให้ component จัดการ
  }
};

/**
 * CREATE: สร้างผู้ใช้ใหม่
 */
export const createUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    return handleResponse(response);
  } catch (error) {
    console.error(`There was a problem fetching user ${userId}:`, error);
    throw error;
  }
};
export const updateUser = async (userId, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  } catch (error)
  {
    console.error(`There was a problem deleting user ${userId}:`, error);
    throw error;
  }
};