import { useState, type FormEvent } from 'react'
import '../../assets/styles/global.css'
import { Navigate, useNavigate } from 'react-router-dom';
import styles from './login.module.css'
import '../../assets/styles/LogInGlobalOverride.css'
import useAuth from '../../authentication/useAuth';
import axios from 'axios';
import { api } from '../../api';
import type { ApiErrorBody, LoginResponse } from '../../types';

function LogIn() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { user, signIn } = useAuth();
    const navigate = useNavigate();

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError('Username and password are required.');
            return;
        }

        try {
            const response = await api.post<LoginResponse>('/auth/login', {
                username,
                password
            })

            if (response.status === 200) {
                await signIn(response.data.token);
                navigate('/');
            }
        } catch (err) {
            if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.status === 401) {
                setError('Invalid username or password.');
            } else if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.status === 429) {
                setError(err.response.data.message ?? 'Too many attempts, please try again later.');
            } else {
                setError('Log in failed. Please try again.');
            }
        }
    }

    const navigateSignUp = () => {
        navigate('/users/signup');
    }

    if (user) return <Navigate to='/' replace />;

    return (
        <div className={styles['login-body']}>
            <div className={styles["login-form-container"]}>
                <div className={styles['title-div']}>
                    <h1 className={styles.title}>Log In</h1>
                    <p className={`${styles['error']} ${styles['log-in']} ${error ? styles['show'] : ''}`}>{error ? error : ' '}</p>
                </div>
                <form onSubmit={handleFormSubmit}>
                    <input
                        type='text'
                        name='username'
                        placeholder='Username'
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        type='password'
                        name='password'
                        placeholder='*********'
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <div className={styles['btn-container']}>
                        <button type='button' onClick={navigateSignUp} className={styles['signup-btn']}>Sign Up</button>
                        <button type='submit' className={styles['login-btn']}>Log In</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default LogIn;
