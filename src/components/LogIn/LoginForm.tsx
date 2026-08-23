import { useEffect, useState, type FormEvent } from 'react'
import '../../assets/styles/global.css'
import { useNavigate } from 'react-router-dom';
import styles from './login.module.css'
import '../../assets/styles/LogInGlobalOverride.css'
import useAuth from '../../authentication/useAuth';
import axios from 'axios';
import type { LoginResponse } from '../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;

function LogIn() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/')
        }
    }, [user, navigate])

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            setError('Username and password are required.');
            return;
        }

        try {
            const response = await axios.post<LoginResponse>(`${backendURL}/users/login`, {
                username,
                password
            })

            if (response.status === 200) {
                // Store in local storage
                localStorage.setItem('token', response.data.token);
                navigate('/');
            }
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 400) {
                setError('Invalid username or password.');
            } else {
                setError('Log in failed. Please try again.');
            }
        }
    }

    const navigateSignUp = () => {
        navigate('/users/signup');
    }

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
