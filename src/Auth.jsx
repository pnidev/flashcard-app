import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

export default function Auth({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
      if (!error) alert('Vui lòng kiểm tra email của bạn để xác nhận đăng ký!');
    }

    if (error) {
      alert(error.error_description || error.message);
    } else if (isLogin) {
      onClose(); // Đóng modal khi đăng nhập thành công
    }
    setLoading(false);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
        <form onSubmit={handleAuth} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="start-btn" style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>
        <p className="auth-toggle">
          {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </span>
        </p>
      </div>
    </div>
  );
}
