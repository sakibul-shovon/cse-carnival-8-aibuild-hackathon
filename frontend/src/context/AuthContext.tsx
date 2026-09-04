import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    users: User[];
    setUser: (user: User | null) => void;
    loginAs: (userId: string) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [users, setUsers] = useState<User[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedId = localStorage.getItem('campusos-user-id');
        if (storedId) {
            loginAs(storedId);
        } else {
            setIsLoading(false);
        }
    }, []);

    const loginAs = async (userId: string) => {
        setIsLoading(true);
        try {
            const allUsers = await api.getUsers(userId);
            setUsers(allUsers);
            const found = allUsers.find((u) => u.id === userId);
            if (found) {
                setUser(found);
                localStorage.setItem('campusos-user-id', userId);
            } else {
                setUser(null);
                localStorage.removeItem('campusos-user-id');
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUser(null);
            localStorage.removeItem('campusos-user-id');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, users, setUser, loginAs, isLoading }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}