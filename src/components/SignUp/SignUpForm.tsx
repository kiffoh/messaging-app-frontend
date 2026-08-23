import { useEffect, useState, type FormEvent } from 'react'
import '../../assets/styles/global.css'
import { useNavigate } from 'react-router-dom';
import styles from './signup.module.css'
import '../../assets/styles/SignUpGlobalOverride.css'
import useAuth from '../../authentication/useAuth';
import axios from 'axios';
import type { ApiErrorBody, FieldErrors, SignUpResponse } from '../../types';

const backendURL = import.meta.env.VITE_SERVER_URL;

function SignUp() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const { user } = useAuth();
    const navigate = useNavigate();

    // TODO(refactor F10): how often does this effect run?
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    })

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!username.trim() || !password.trim()) {
            setErrors({ general: 'Username and password are required.' });
            return;
        }

        try {
            const response = await axios.post<SignUpResponse>(`${backendURL}/users/signup`, {
                username,
                password
            })

            if (response.status === 201) {
                const { token, user: newUser } = response.data;
                // Store in local storage
                localStorage.setItem('token', token);

                // Navigate to the page where user can input bio, pic and etc.
                navigate(`/users/${newUser.id}/profile`);
            }
        } catch (error) {
            if (axios.isAxiosError<ApiErrorBody>(error) && error.response) {
                const { status, data } = error.response;

                // Handle validation errors (status 400)
                if (status === 400) {
                    const validationErrors = data.errors;
                    if (validationErrors) {
                        // Convert array of errors to object keyed by field name
                        const errorObject = validationErrors.reduce<FieldErrors>((acc, curr) => ({
                            ...acc,
                            [curr.field]: curr.message
                        }), {});
                        setErrors(errorObject);
                    }
                }
                // Handle username already exists (status 409)
                else if (status === 409) {
                    setErrors({ username: data.message ?? 'That username is already taken.' });
                }
                // Handle other server errors
                else {
                    setErrors({ general: data.message ?? 'An error occurred during signup' });
                }
            } else {
                setErrors({ general: 'Unable to connect to the server' });
            }
        }
    }

    return (
        <div className={styles['signup-body']}>
            <div className={styles["signup-form-container"]}>
                <div className={styles['signup-form-wrapper']}>
                    <form onSubmit={handleFormSubmit}>
                        <div className={styles['title-div']}>
                            <h1 className={styles.title}>Sign Up</h1>
                            <p className={`${styles['error']} ${styles['general']} ${errors.general ? styles['show'] : ''}`}>{errors.general ?? ''}</p>
                        </div>
                        <div className={styles['input-div-container']}>
                            <div className={styles['input-div']}>
                                <div className={styles['username']}>
                                    <label className={styles['username-label']} htmlFor='username'>
                                        Username
                                    </label>
                                    <input
                                        type='text'
                                        name='username'
                                        placeholder='Username'
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                    />
                                </div>
                                <div className={styles['password']}>
                                    <label className={styles['password-label']} htmlFor='password'>
                                        Password
                                    </label>
                                    <input
                                        type='password'
                                        name='password'
                                        placeholder='*********'
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={styles['btn-container']}>
                            <p className={`${styles['error']} ${styles['username']} ${errors.username ? styles['show'] : ''}`}>{errors.username ?? ''}</p>
                            <button type='submit' className={styles['signup-btn']}>Create Account</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default SignUp;
