import type { RouteObject } from "react-router-dom";
import LogIn from "../components/LogIn/LoginForm";
import UserProfile from "../components/UserProfile/UserProfile";
import SignUp from '../components/SignUp/SignUpForm';
import SignOut from "../components/SignOut/SignOut";

const userRoutes: RouteObject[] = [
    {
        path: 'login',
        element: <LogIn />
    },
    {
        path: 'signup',
        element: <SignUp />
    },
    {
        path: ':userId/profile',
        element: <UserProfile group={false} />
    },
    {
        path: 'signout',
        element: <SignOut />
    }
]

export default userRoutes;
