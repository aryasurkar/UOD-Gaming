import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn,
  Gamepad2,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import '../styles/Sign.css'; // Reusing the high-fidelity sign styles
import Foote from './Foote';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validations, setValidations] = useState({
    email: false,
    password: false
  });

  const navigate = useNavigate();

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'password':
        return value.length > 0;
      default:
        return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    setValidations(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));

    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validate email format and check non-empty fields
    if (!validations.email || !formData.password) {
      setError('Please fill in all fields correctly');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/v1/auth/login', {
        email: formData.email,
        password: formData.password
      });

      // Store auth info in localStorage
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      setSuccess(response.data.message || 'Login successful! Redirecting to gaming area...');
      
      // Redirect to UODGaming page after 1.5 seconds
      setTimeout(() => {
        navigate('/UODGaming');
      }, 1500);

    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Login failed. Please verify credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } }
  };

  return (
    <div className="sign-wrapper">
      <div className="sign-background">
        <div className="bg-particles">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="sign-container">
        <motion.div 
          className="sign-card glass-card"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="sign-header">
            <motion.div 
              className="sign-icon"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gamepad2 size={48} />
            </motion.div>
            <h1 className="sign-title text-gaming">Welcome Back, Player</h1>
            <p className="sign-subtitle">Log in to resume your epic gaming session</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="sign-form">
            {/* Email Field */}
            <div className="input-group">
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <motion.input
                  variants={inputVariants}
                  whileFocus="focus"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input ${validations.email ? 'valid' : formData.email ? 'invalid' : ''}`}
                  required
                />
                {formData.email && (
                  <div className="validation-icon">
                    {validations.email ? 
                      <CheckCircle className="valid-icon" size={20} /> :
                      <AlertCircle className="invalid-icon" size={20} />
                    }
                  </div>
                )}
              </div>
              {formData.email && !validations.email && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="validation-message"
                >
                  Please enter a valid email address
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div className="input-group">
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <motion.input
                  variants={inputVariants}
                  whileFocus="focus"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input ${formData.password ? 'valid' : ''}`}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="error-message"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="success-message"
                >
                  <CheckCircle size={20} />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className={`btn btn-primary submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading || !validations.email || !formData.password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <motion.div 
                  className="loading-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Zap size={20} />
                </motion.div>
              ) : (
                <>
                  <LogIn size={20} />
                  Access Account
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="sign-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/sign" className="sign-link">
                Sign up here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <Foote />
    </div>
  );
};

export default Login;
