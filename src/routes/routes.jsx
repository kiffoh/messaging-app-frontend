import { createBrowserRouter } from "react-router-dom";
import ErrorPage from "../ErrorPage";
import Home from "../Home";
import { AuthProvider } from "../Authentification/AuthContext";
import { SocketProvider } from "../socketContext/socketContext";
import userRoutes from './userRoutes'
import UserLayout from "../layouts/UserLayout";
import groupRoutes from "./groupRoutes";

const router = createBrowserRouter([
    {
        path: '/',
        element: (<AuthProvider>
                    <SocketProvider >
                        <Home />
                    </SocketProvider>
                </AuthProvider>
        ),
        errorElement: <ErrorPage />
    },
    {
        path: '/users',
        element: (<AuthProvider>
                    <UserLayout />
                </AuthProvider>
        ),
        children: userRoutes,
    },
    {
        path: '/groups',
        element: (<AuthProvider>
            <UserLayout />
        </AuthProvider>
        ),
        children: groupRoutes,
    }
])

export default router