import { createBrowserRouter } from "react-router-dom";
import ErrorPage from "../ErrorPage";
import Home from "../Home";
import { AuthProvider } from "../authentication/AuthContext";
import { SocketProvider } from "../socketContext/socketContext";
import userRoutes from './userRoutes'
import UserLayout from "../layouts/UserLayout";
import groupRoutes from "./groupRoutes";

// TODO(refactor F15): each route mounts its own <AuthProvider>. They are siblings, not
// ancestors, so no auth state is shared and navigating between them tears one down and
// builds another. Phase 4 hoists these into a single root route.
const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <AuthProvider>
                <SocketProvider>
                    <Home />
                </SocketProvider>
            </AuthProvider>
        ),
        errorElement: <ErrorPage />
    },
    {
        path: '/users',
        element: (
            <AuthProvider>
                <UserLayout />
            </AuthProvider>
        ),
        children: userRoutes,
    },
    {
        path: '/groups',
        element: (
            <AuthProvider>
                <UserLayout />
            </AuthProvider>
        ),
        children: groupRoutes,
    }
])

export default router
