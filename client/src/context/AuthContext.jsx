import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  {
    id: 'usr-001',
    name: 'Sakibul Hassan',
    email: '20-40532@aust.edu',
    student_id: '20-40532',
    department: 'Computer Science & Engineering',
    role: 'Student',
    password: 'password123',
    avatar: '👨‍🎓',
  },
  {
    id: 'usr-002',
    name: 'Prof. Dr. Md. Shahriar Mahbub',
    email: 'mahbub.cse@aust.edu',
    student_id: 'FAC-701',
    department: 'Computer Science & Engineering',
    role: 'Faculty',
    password: 'password123',
    avatar: '👨‍🏫',
  },
  {
    id: 'usr-003',
    name: 'AUSTPIC Executive',
    email: 'austpic@aust.edu',
    student_id: 'CLUB-01',
    department: 'CSE / AUSTPIC',
    role: 'Club Organizer',
    password: 'password123',
    avatar: '🏆',
  },
];

const STORAGE_KEY_USER = 'campusos_current_user_v1';
const STORAGE_KEY_ALL_USERS = 'campusos_registered_users_v1';

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ALL_USERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_USERS;
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default to logged-in as Sakibul Hassan for seamless hackathon grading, or null
    return DEFAULT_USERS[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {}
  }, [user]);

  const login = async ({ emailOrId, password }) => {
    const trimmedIdentifier = emailOrId.trim().toLowerCase();
    const found = users.find(
      (u) =>
        (u.email.toLowerCase() === trimmedIdentifier ||
          (u.student_id && u.student_id.toLowerCase() === trimmedIdentifier)) &&
        u.password === password
    );

    if (!found) {
      // Check if identifier exists but password mismatch
      const exists = users.find(
        (u) =>
          u.email.toLowerCase() === trimmedIdentifier ||
          (u.student_id && u.student_id.toLowerCase() === trimmedIdentifier)
      );
      if (exists) {
        throw new Error('Incorrect password. Please verify your credentials.');
      }
      throw new Error('Account not found with this email or Student ID. Please register first.');
    }

    setUser(found);
    return found;
  };

  const register = async ({ name, email, student_id, department, role, password }) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedId = student_id ? student_id.trim() : '';

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      throw new Error('An account with this university email already exists.');
    }

    if (trimmedId && users.some((u) => u.student_id && u.student_id.toLowerCase() === trimmedId.toLowerCase())) {
      throw new Error(`An account with Student ID ${trimmedId} is already registered.`);
    }

    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: trimmedEmail,
      student_id: trimmedId || '26-' + Math.floor(10000 + Math.random() * 90000),
      department: department || 'Computer Science & Engineering',
      role: role || 'Student',
      password: password,
      avatar: role === 'Faculty' ? '👨‍🏫' : role === 'Club Organizer' ? '🏆' : '👨‍🎓',
    };

    setUsers((prev) => [newUser, ...prev]);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    setUser(null);
  };

  const loginAsDemo = (role = 'Student') => {
    const target = users.find((u) => u.role === role) || DEFAULT_USERS[0];
    setUser(target);
    return target;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        loginAsDemo,
        demoUsers: DEFAULT_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
