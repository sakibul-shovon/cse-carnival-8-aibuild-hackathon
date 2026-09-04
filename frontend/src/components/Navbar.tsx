import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    MegaphoneIcon,
    ClipboardDocumentListIcon,
    CalendarDaysIcon,
    UsersIcon,
    ChatBubbleLeftRightIcon,
    ChevronDownIcon,
    UserCircleIcon,
} from './Icons';

const navItems = [
    { path: '/announcements', label: 'Announcements', icon: MegaphoneIcon },
    { path: '/assignments', label: 'Assignments', icon: ClipboardDocumentListIcon },
    { path: '/schedule', label: 'Schedule', icon: CalendarDaysIcon },
    { path: '/users', label: 'Users', icon: UsersIcon },
    { path: '/chat', label: 'AI Chat', icon: ChatBubbleLeftRightIcon },
];

export default function Navbar() {
    const { user, users, loginAs, isLoading } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const roleColor = {
        admin: 'text-purple-600 bg-purple-100',
        teacher: 'text-blue-600 bg-blue-100',
        student: 'text-green-600 bg-green-100',
    }[user?.role || 'student'];

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
                            C
                        </div>
                        <span className="text-lg font-bold text-slate-900">
                            Campus<span className="text-primary-600">OS</span>
                        </span>
                    </div>

                    {/* Nav links - desktop */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User switcher */}
                    <div className="relative" ref={dropdownRef}>
                        {isLoading ? (
                            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
                        ) : user ? (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm transition-colors hover:bg-slate-100"
                            >
                                <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${roleColor}`}
                                >
                                    {user.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </span>
                                <span className="hidden sm:inline font-medium text-slate-700">
                                    {user.name}
                                </span>
                                <span
                                    className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${roleColor}`}
                                >
                                    {user.role}
                                </span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 text-slate-400 transition-transform ${
                                        isOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-slate-100"
                            >
                                <UserCircleIcon className="h-5 w-5 text-slate-400" />
                                <span className="text-slate-500">Sign in</span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 text-slate-400 transition-transform ${
                                        isOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                        )}

                        {isOpen && (
                            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                                <div className="px-4 py-2 text-xs font-medium text-slate-400">
                                    Switch user
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {users.map((u) => {
                                        const isActive = user?.id === u.id;
                                        const roleClr = {
                                            admin: 'text-purple-600 bg-purple-100',
                                            teacher: 'text-blue-600 bg-blue-100',
                                            student: 'text-green-600 bg-green-100',
                                        }[u.role];
                                        return (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    loginAs(u.id);
                                                    setIsOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${
                                                    isActive
                                                        ? 'bg-primary-50'
                                                        : ''
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roleClr}`}
                                                >
                                                    {u.name
                                                        .split(' ')
                                                        .map((n) => n[0])
                                                        .join('')
                                                        .toUpperCase()
                                                        .slice(0, 2)}
                                                </span>
                                                <div className="flex flex-col items-start">
                                                    <span
                                                        className={`font-medium ${
                                                            isActive
                                                                ? 'text-primary-700'
                                                                : 'text-slate-700'
                                                        }`}
                                                    >
                                                        {u.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {u.email} · {u.role}
                                                    </span>
                                                </div>
                                                {isActive && (
                                                    <span className="ml-auto text-primary-600 text-xs font-medium">
                                                        Active
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile nav */}
            <div className="border-t border-slate-200 md:hidden">
                <div className="flex overflow-x-auto px-4 py-1.5 gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                    isActive
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}