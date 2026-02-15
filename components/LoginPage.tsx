import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Lock, AlertCircle, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { User, Role } from '../types';

const ROLES: { id: Role; label: string; color: string }[] = [
    { id: 'ADMIN', label: 'Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'MANAGER', label: 'Manager', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'CASHIER', label: 'Cashier', color: 'bg-green-100 text-green-700 border-green-200' },
];

const LoginPage: React.FC = () => {
    const { users, login, isLoading } = useStore();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const filteredUsers = selectedRole ? users.filter(u => u.role === selectedRole) : [];

    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            const newPin = pin + digit;
            setPin(newPin);
            setError('');
            if (newPin.length === 4 && selectedUser) {
                attemptLogin(selectedUser, newPin);
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    const attemptLogin = (user: User, pinCode: string) => {
        if (user.pin === pinCode) {
            login(user);
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    const handleSubmit = () => {
        if (!selectedUser) {
            setError('Please select a user');
            return;
        }
        if (pin.length !== 4) {
            setError('Enter a 4-digit PIN');
            return;
        }
        attemptLogin(selectedUser, pin);
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setPin('');
        setError('');
    };

    const handleSelectRole = (role: Role) => {
        setSelectedRole(role);
        setSelectedUser(null);
        setPin('');
        setError('');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-3 border border-amber-500/20">
                        <Lock className="w-7 h-7 text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">HOARD <span className="text-amber-500">LAVISH</span></h1>
                    <p className="text-slate-500 text-sm mt-1">Point of Sale System</p>
                </div>

                {/* Two-Column Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-2 min-h-[420px]">

                    {/* LEFT — Role & User Selection */}
                    <div className="p-6 border-r border-slate-100 flex flex-col">
                        {/* Role Filter */}
                        <div className="mb-5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Select Role</label>
                            <div className="grid grid-cols-3 gap-2">
                                {ROLES.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleSelectRole(role.id)}
                                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                      ${selectedRole === role.id
                                                ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                                                : `${role.color} border hover:opacity-80`}`}
                                    >
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User List */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Select User</label>
                            {!selectedRole ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-8">
                                    <ShieldCheck size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm">Choose a role first</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-8">
                                    <UserIcon size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm">No users for this role</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleSelectUser(user)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                        ${selectedUser?.id === user.id
                                                    ? 'border-amber-400 bg-amber-50'
                                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${selectedUser?.id === user.id
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-100 text-slate-500'}`}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{user.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">{user.role}</p>
                                            </div>
                                            {selectedUser?.id === user.id && (
                                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — PIN Entry */}
                    <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
                        {!selectedUser ? (
                            <div className="text-center text-slate-300">
                                <Lock size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium text-slate-400">Select a user to unlock</p>
                            </div>
                        ) : (
                            <div className="w-full max-w-[240px]">
                                {/* Selected User Chip */}
                                <div className="text-center mb-5">
                                    <div className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-2">
                                        {selectedUser.name.charAt(0)}
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm">{selectedUser.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{selectedUser.role}</p>
                                </div>

                                {/* PIN Label */}
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Enter PIN</label>

                                {/* PIN Dots */}
                                <div className="flex justify-center gap-3 mb-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-amber-500 scale-110' : 'bg-slate-300'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-500 text-xs font-medium justify-center mb-3">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}

                                {/* Number Pad */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => handlePinInput(String(num))}
                                            className="h-12 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-lg font-semibold text-slate-800 transition-colors border border-slate-200"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button
                                        onClick={handleClear}
                                        className="h-12 rounded-xl bg-white hover:bg-red-50 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors border border-slate-200"
                                    >
                                        CLR
                                    </button>
                                    <button
                                        onClick={() => handlePinInput('0')}
                                        className="h-12 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-lg font-semibold text-slate-800 transition-colors border border-slate-200"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={handleBackspace}
                                        className="h-12 rounded-xl bg-white hover:bg-amber-50 text-sm font-bold text-slate-400 hover:text-amber-600 transition-colors border border-slate-200"
                                    >
                                        ⌫
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={pin.length !== 4}
                                    className="w-full mt-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    Unlock
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-600 text-xs mt-6">Secured POS Terminal • v1.0</p>
            </div>
        </div>
    );
};

export default LoginPage;
