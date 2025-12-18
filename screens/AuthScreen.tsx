import React, { useState, useRef } from 'react';
import { db } from '../services/db';
import { compressImage } from '../services/imageUtils';

export const AuthScreen: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    // Auth Mode State
    const [isRegistering, setIsRegistering] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [handle, setHandle] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [avatar, setAvatar] = useState<string>('');
    
    // Verification State
    const [step, setStep] = useState<'form' | 'verification'>('form');
    const [generatedCode, setGeneratedCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    
    // UX State
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setAvatar(compressed);
            } catch (err) {
                setError("Failed to process image");
            }
        }
    };

    const handleInitiateRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !handle || !email || !password) {
            setError("All fields are required");
            return;
        }

        if (!email.includes('@')) {
            setError("Please enter a valid email address");
            return;
        }

        setLoading(true);

        // Simulate sending verification email
        try {
            // Check availability first (basic check, real check happens at save)
            // In a real app we'd call an API to check availability here.
            
            await new Promise(r => setTimeout(r, 1000)); // Simulate net delay
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedCode(code);
            setStep('verification');
            
            // SIMULATION: Alert + Console
            console.log(`VERIFICATION CODE: ${code}`);
            alert(`[SIMULATION] Check your "email".\n\nCode: ${code}`);
            
        } catch (err) {
            setError("Could not initiate verification");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (inputCode !== generatedCode) {
            setError("Invalid verification code. Please try again.");
            return;
        }

        setLoading(true);
        try {
             // Passing avatar (if set) to registration
             await db.registerUser(name, handle, email, password, avatar || undefined);
             onLoginSuccess();
        } catch (err: any) {
             setError(err.message || "Registration failed");
             setStep('form'); // Go back if handle/email was actually taken during save
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!handle || !password) {
            setError("Credentials required");
            return;
        }
        setLoading(true);
        try {
            await db.loginUser(handle, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    // Render Logic
    const renderVerificationStep = () => (
        <div className="animate-fade-in space-y-4">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
                    <i className="fas fa-envelope-open-text text-2xl"></i>
                </div>
                <h3 className="text-xl font-bold text-white">Verify Email</h3>
                <p className="text-xs text-gray-400 mt-2">
                    We sent a code to <span className="text-purple-400">{email}</span>.
                </p>
                
                {/* DEV HELPER: Show code on screen */}
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded-lg inline-block">
                    <p className="text-[10px] text-yellow-500 font-mono">
                        <i className="fas fa-bug mr-1"></i> SIMULATION MODE<br/>
                        Code sent: <span className="font-bold text-lg block mt-1 tracking-widest">{generatedCode}</span>
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Verification Code</label>
                <input 
                    type="text" 
                    maxLength={6}
                    className="w-full bg-gray-900/50 border border-purple-500 rounded-xl py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none transition-all font-mono"
                    placeholder="000000"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                />
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded-xl flex items-center animate-shake">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    {error}
                </div>
            )}

            <button 
                onClick={handleVerifyAndRegister}
                disabled={loading || inputCode.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] transition-all flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 'Confirm & Create Account'}
            </button>

            <button 
                onClick={() => { setStep('form'); setError(''); }}
                className="w-full text-xs text-gray-500 hover:text-white mt-4 underline"
            >
                Back to details
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>

            <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-2 tracking-tight">
                        WatchQuest
                    </h1>
                    <p className="text-gray-400 text-sm font-medium">Your personal movie journey tracker.</p>
                </div>

                <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 p-8 rounded-3xl shadow-2xl ring-1 ring-white/10">
                    
                    {/* Only show Toggle Switch if not in verification step */}
                    {step === 'form' && (
                        <div className="flex mb-8 bg-gray-900/50 p-1.5 rounded-xl border border-gray-700/50 relative">
                            <div 
                                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gray-700 rounded-lg shadow-lg transition-all duration-300 ease-out ${isRegistering ? 'left-[calc(50%+3px)]' : 'left-1.5'}`}
                            ></div>
                            
                            <button 
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors relative z-10 ${!isRegistering ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                onClick={() => { setIsRegistering(false); setError(''); }}
                            >
                                Log In
                            </button>
                            <button 
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors relative z-10 ${isRegistering ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                onClick={() => { setIsRegistering(true); setError(''); }}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    {step === 'verification' ? renderVerificationStep() : (
                        <form onSubmit={isRegistering ? handleInitiateRegister : handleLogin} className="space-y-4">
                            {/* Avatar Upload (Register Only) */}
                            {isRegistering && (
                                <div className="flex flex-col items-center mb-4">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-gray-700/80 transition-all relative overflow-hidden group"
                                    >
                                        {avatar ? (
                                            <img src={avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <i className="fas fa-camera text-gray-400 text-xl group-hover:scale-110 transition-transform"></i>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i className="fas fa-plus text-white"></i>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-wider">Profile Photo</span>
                                </div>
                            )}

                            {isRegistering && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative group">
                                        <i className="fas fa-user absolute left-3 top-3.5 text-gray-500 group-focus-within:text-purple-500 transition-colors"></i>
                                        <input 
                                            type="text" 
                                            className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-purple-500 focus:bg-gray-900 focus:outline-none transition-all placeholder-gray-600"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {isRegistering && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative group">
                                        <i className="fas fa-envelope absolute left-3 top-3.5 text-gray-500 group-focus-within:text-purple-500 transition-colors"></i>
                                        <input 
                                            type="email" 
                                            className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-purple-500 focus:bg-gray-900 focus:outline-none transition-all placeholder-gray-600"
                                            placeholder="you@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{isRegistering ? 'Handle' : 'Handle or Email'}</label>
                                <div className="relative group">
                                    <i className="fas fa-at absolute left-3 top-3.5 text-gray-500 group-focus-within:text-purple-500 transition-colors"></i>
                                    <input 
                                        type="text" 
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-purple-500 focus:bg-gray-900 focus:outline-none transition-all placeholder-gray-600"
                                        placeholder={isRegistering ? "username" : "user@email.com"}
                                        value={handle}
                                        onChange={e => setHandle(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                                <div className="relative group">
                                    <i className="fas fa-lock absolute left-3 top-3.5 text-gray-500 group-focus-within:text-purple-500 transition-colors"></i>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded-xl py-3 pl-10 pr-10 text-sm text-white focus:border-purple-500 focus:bg-gray-900 focus:outline-none transition-all placeholder-gray-600"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors focus:outline-none"
                                    >
                                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-3 rounded-xl flex items-center animate-shake">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    {error}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] transition-all flex justify-center items-center mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <i className="fas fa-circle-notch fa-spin"></i> 
                                ) : (
                                    <span>
                                        {isRegistering ? 'Next' : 'Sign In'} 
                                        <i className={`fas ${isRegistering ? 'fa-chevron-right' : 'fa-arrow-right'} ml-2 text-xs`}></i>
                                    </span>
                                )}
                            </button>
                        </form>
                    )}

                    {!isRegistering && step === 'form' && (
                         <div className="mt-8 pt-6 border-t border-gray-700/50 text-center space-y-2">
                             <p className="text-xs text-gray-500 mb-2">Demo Accounts</p>
                             <div className="flex justify-center gap-2">
                                <div className="bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-700 text-[10px] font-mono text-gray-300 text-left cursor-pointer hover:bg-gray-800" onClick={() => { setHandle('michael.scott@dundermifflin.com'); setPassword('123'); }}>
                                    <span className="text-purple-400 font-bold block">MICHAEL</span>
                                    michael...<br/>123
                                </div>
                                <div className="bg-gray-900/80 px-3 py-2 rounded-lg border border-red-900/30 text-[10px] font-mono text-gray-300 text-left cursor-pointer hover:bg-gray-800" onClick={() => { setHandle('dwight@badgepatch.com'); setPassword('admin'); }}>
                                    <span className="text-red-400 font-bold block">DWIGHT</span>
                                    dwight...<br/>admin
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
