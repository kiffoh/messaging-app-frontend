import { createBrowserRouter, Outlet } from "react-router-dom";
import ErrorPage from "../ErrorPage";
import Home from "../Home";
import { AuthProvider } from "../authentication/AuthContext";
import UserLayout from "../layouts/UserLayout";
import LogIn from "../components/LogIn/LoginForm";
import SignUp from "../components/SignUp/SignUpForm";
import UserProfile from "../components/UserProfile/UserProfile";

const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <AuthProvider>
                <Outlet />
            </AuthProvider>
        ),
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <Home /> },
            { path: 'users/login', element: <LogIn /> },
            { path: 'users/signup', element: <SignUp /> },
            {
                element: <UserLayout />,
                children: [
                    { path: 'users/:userId/profile', element: <UserProfile group={false} /> },
                    { path: 'groups/:userId/profile', element: <UserProfile group={true} /> },
                ],
            },
        ],
    },
])

export default router
